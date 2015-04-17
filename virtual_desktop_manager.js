/*
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


/**
 * @package
 */
goog.provide('virtualdesktops.VirtualDesktopManager');

goog.require('virtualdesktops');
goog.require('virtualdesktops.BarrierClosure');
goog.require('virtualdesktops.WindowState');
goog.require('virtualdesktops.settings');



/**
 * A VirtualDesktopManager manages virtual desktops on the current screen.
 * @constructor
 * @param {!virtualdesktops.WindowProvider} windowProvider A WindowProvider to
 *     access windows with.
 * @param {function(number)} onChange Callback to call when the virtual desktop
 *     is changed. Is also called at construction time after the virtual desktop
 *     number has been received.
 */
virtualdesktops.VirtualDesktopManager = function(windowProvider, onChange) {
  /**
   * Active window provider.
   * @private {!virtualdesktops.WindowProvider}
   */
  this.windowProvider_ = windowProvider;

  /**
   * Desktop change notification hook.
   * @private {function(number)}
   */
  this.onChange_ = onChange;

  /**
   * Currently active desktop.
   * @private {number}
   */
  this.currentDesktop_ =
      parseInt(window.localStorage[this.CURRENT_DESKTOP_KEY_], 10);
  if (isNaN(this.currentDesktop_) || this.currentDesktop_ < 0) {
    this.currentDesktop_ = 0;
  }

  /**
   * State of all windows. This remembers some state that would get lost on
   * Chrome when switching desktops or rebooting.
   * @private {!Object<number, !virtualdesktops.WindowState>}
   */
  this.windowStates_ =
      /** @type {!Object<number, !virtualdesktops.WindowState>} */
      (JSON.parse(window.localStorage[this.WINDOW_STATES_KEY_] || '{}'));

  // Immediately fire an onChange event now that we loaded the current desktop.
  this.onChange_(this.currentDesktop_);
};


/**
 * @const {string} State of a window that's currently not visible.
 * @private
 */
virtualdesktops.VirtualDesktopManager.prototype.MINIMIZED_STATE_ = 'minimized';


/**
 * @const {string} Property name in the local storage to store the current
 *     desktop number. Must be changed if its format changes incompatibly.
 * @private
 */
virtualdesktops.VirtualDesktopManager.prototype.CURRENT_DESKTOP_KEY_ =
    'currentDesktop';


/**
 * @const {string} Property name in the local storage to store the states of all
 *     known windows to survive extension reload and ChromeOS reboot. Must be
 *     changed if its format changes incompatibly.
 * @private
 */
virtualdesktops.VirtualDesktopManager.prototype.WINDOW_STATES_KEY_ =
    'windowStates';


/**
 * Saves the current state to local storage, so reinitializing the extension
 * will pick it up.
 * @private
 */
virtualdesktops.VirtualDesktopManager.prototype.saveState_ = function() {
  window.localStorage[this.CURRENT_DESKTOP_KEY_] = this.currentDesktop_;
  window.localStorage[this.WINDOW_STATES_KEY_] =
      JSON.stringify(this.windowStates_);
};


/**
 * Updates the windowStates field from the given list of windows.
 * @private
 * @param {!Array<!ChromeWindow>} windows
 */
virtualdesktops.VirtualDesktopManager.prototype.updateWindowStates_ =
    function(windows) {
  // We create a new dictionary so any window that doesn't exist any more is
  // cleared.
  var windowStates = {};
  // Update window states.
  for (var i = 0; i < windows.length; ++i) {
    var w = windows[i];
    windowStates[w.id] = this.windowStates_[w.id];
    // - If the window is unknown, on the current desktop or visible right now,
    //   create (or update) the last known state and assign it to the current
    //   desktop. This is important as we may be switching to another desktop
    //   and have to remember it.
    if (windowStates[w.id] == null ||
        windowStates[w.id].desktop == this.currentDesktop_ ||
        w.state != this.MINIMIZED_STATE_) {
      windowStates[w.id] = {
        desktop: this.currentDesktop_,
        state: w.state,
        x: w.left,
        y: w.top,
        w: w.width,
        h: w.height
      };
    }
  }

  this.windowStates_ = windowStates;
};


/**
 * Fixes a given desktop ID so it is a valid one. A valid desktop ID is one in
 * the range from 0 to virtualdesktops.settings.getDesktops() - 1.
 * Out-of-range desktop IDs are wrapped around to hit a valid desktop ID; this
 * makes life easier for callers which then can just switch to currentDesktop+1
 * or currentDesktop-1 to go to the next/previous desktop.
 * If disallowEmpty, the desktop ID is adjusted to hit a non-empty one while
 * retaining cycling behavior.
 * @private
 * @param {number} reqDesktop The desktop to switch to.
 * @param {boolean} disallowEmpty Disallow switching to empty desktops.
 * @return {number} The desktop one should actually switch to.
 */
virtualdesktops.VirtualDesktopManager.prototype.numberToDesktopId_ =
    function(reqDesktop, disallowEmpty) {
  var n = virtualdesktops.settings.getDesktops();

  // First make sure the current desktop number is within the permissible bounds
  // just in case the total count changed and the current desktop number hasn't
  // been updated yet. We clamp and not wrap it so going right from a too-high
  // desktop number will properly hit desktop 0.
  var clampedCurrentDesktop = this.currentDesktop_;
  if (clampedCurrentDesktop > n - 1) {
    clampedCurrentDesktop = n - 1;

    // If currentDesktop_ is larger than n-1, assume that some desktops with
    // lower index have been removed. In this case, try to maintain the relative
    // ordering between reqDesktop and currentDesktop_, and perform a proper
    // wraparound handling even in this case.
    //
    // Example:
    //
    // Assume currentDesktop == 4.
    // Assume n == 3.
    //
    // Expectation:
    //
    // Requested desktop:    -1 0 1 2 3 4 5 6 7
    // User-expected target:  2 0 1 2 2 2 0 1 2
    //                                    ^^^^^ shift left by clamping amount,
    //                                          then wrap
    //                                ^^^ map to n-1
    //                        ^^^^^^^ keep as is, then wrap
    if (reqDesktop > this.currentDesktop_) {
      // A "right shift" will be moved left by the clamping amount to appear as
      // the same "right shift" from the new clamped desktop number.
      reqDesktop = reqDesktop - (this.currentDesktop_ - (n - 1));
    } else if (reqDesktop > n - 1) {
      // When we get here, reqDesktop is also <= this.currentDesktop_, so this
      // is a "left shift" or staying on the same (now invalid) desktop number.
      // In this case, we just move to the next-valid desktop number.
      reqDesktop = n - 1;
    }
  }

  // Map the given desktop number into the allowed range. The double-modulo
  // trick is used to handle negative values of reqDesktop + n properly (it
  // guarantees that the output is in the range from 0 to n-1).
  reqDesktop = ((reqDesktop + n) % n + n) % n;

  if (disallowEmpty) {
    var nWindowsOnDesktop = {};

    // Count the windows on each desktop.
    for (var wStr in this.windowStates_) {
      var w = parseInt(wStr, 10);
      if (this.windowStates_[w].state != this.MINIMIZED_STATE_) {
        var d = this.windowStates_[w].desktop;
        if (nWindowsOnDesktop[d] == null) {
          nWindowsOnDesktop[d] = 0;
        }
        ++nWindowsOnDesktop[d];
      }
    }

    // Identify the direction of adjustment.
    var direction = reqDesktop - clampedCurrentDesktop;
    // Map it to the range from -n/2 to +n/2.
    direction -= n * Math.round(direction / n);
    // Retain only the sign of the movement direction. In case direction == 0
    // (no move; this is called by forgetWindow), assume a backwards move so
    // that closing the last window on desktop n-1 will switch to n-2 and not 0,
    // which feels more natural.
    if (direction <= 0) {
      direction = -1;
    } else {
      direction = +1;
    }

    // Refuse to switch to an empty desktop. Instead, adjust the request
    // until there are windows.
    while (!(nWindowsOnDesktop[reqDesktop] > 0)) {
      reqDesktop = (reqDesktop + direction + n) % n;
      if (reqDesktop == clampedCurrentDesktop) {
        // We're back where we started - in this case there's nothing we can do.
        // Only possible cause: there are no open windows left.
        break;
      }
    }
  }

  return reqDesktop;
};


/**
 * Applies the known state to existing windows.
 * updateWindowStates_() should have been called before to handle previously
 * unknown or updated windows.
 * @private
 * @param {!Array<!ChromeWindow>} windows
 * @param {number} focusedWinId Window ID to attempt to focus.
 * @param {function()} callback The callback to call when done.
 */
virtualdesktops.VirtualDesktopManager.prototype.applyWindowStates_ =
    function(windows, focusedWinId, callback) {
  // First, just restore the window states. We can't restore the positions yet
  // as showing/hiding windows will move other windows around on ChromeOS.
  // During this, we can also properly restore focus.
  var allStatesRestored = new virtualdesktops.BarrierClosure();
  for (var i = 0; i < windows.length; ++i) {
    var w = windows[i];
    if (this.windowStates_[w.id].desktop == this.currentDesktop_) {
      // We always perform this update, to bring all managed windows to the
      // front.
      this.windowProvider_.update(w.id, {
        state: this.windowStates_[w.id].state,
        focused: (this.windowStates_[w.id].state != this.MINIMIZED_STATE_)
      }, allStatesRestored.get());
      continue;
    }
    // Anything not on the current desktop will be minimized.
    if (w.state == this.MINIMIZED_STATE_) {
      continue;
    }
    this.windowProvider_.update(w.id, {
      state: this.MINIMIZED_STATE_
    }, allStatesRestored.get());
  }
  allStatesRestored.finalize();

  // Once all states have been restored, restore the window positions and sizes
  // themselves.
  var done = new virtualdesktops.BarrierClosure();
  allStatesRestored.then((function() {
    for (var i = 0; i < windows.length; ++i) {
      var w = windows[i];
      if (this.windowStates_[w.id].desktop == this.currentDesktop_ &&
          this.windowStates_[w.id].state != this.MINIMIZED_STATE_) {
        var updateInfo = {
          left: this.windowStates_[w.id].x,
          top: this.windowStates_[w.id].y,
          width: this.windowStates_[w.id].w,
          height: this.windowStates_[w.id].h
        };
        if (w.id == focusedWinId) {
          updateInfo.focused = true;
        }
        this.windowProvider_.update(w.id, updateInfo, done.get());
      }
    }
    done.finalize();
  }).bind(this));

  // Once all is done, call the supplied callback.
  done.then(callback);
};


/**
 * Switches the view to a target virtual desktop.
 * @param {number} desktop The desktop to switch to.
 * @param {number} focusedWinId The ID of the currently focused window.
 * @param {boolean} sendToDesktop Whether to send the currently focused window
 *     to the target desktop.
 * @param {function()} callback The callback to call when done.
 */
virtualdesktops.VirtualDesktopManager.prototype.switchToDesktop =
    function(desktop, focusedWinId, sendToDesktop, callback) {
  // For all windows:
  this.windowProvider_.getAll((function(windows) {
    // Refresh the window states from the actual data just received.
    this.updateWindowStates_(windows);

    // Wraparound desktop IDs.
    desktop = this.numberToDesktopId_(desktop, false);

    // If requested, send the given window to the new desktop.
    if (sendToDesktop) {
      if (this.windowStates_[focusedWinId] != null) {
        this.windowStates_[focusedWinId].desktop = desktop;
      }
    }

    // Actually switch the desktop!
    var prevDesktop = this.currentDesktop_;
    this.currentDesktop_ = this.numberToDesktopId_(
        desktop, virtualdesktops.DISALLOW_EMPTY_DESKTOPS);

    // Update the extension icon.
    this.onChange_(this.currentDesktop_);

    // Save this data across reboot/reload.
    this.saveState_();

    // Only apply the saved window states when actually switching desktops.
    // Switching to the ID of the current desktop shall only save the current
    // state, but not apply a "no-operation" change to all windows (which would
    // cause flicker).
    if (this.currentDesktop_ != prevDesktop) {
      // Apply new desktop ID to known windows, then call the callback.
      this.applyWindowStates_(windows, focusedWinId, callback);
    } else {
      // We're already done.
      callback();
    }
  }).bind(this));
};


/**
 * Finds the desktop a given window is (supposed to be) on.
 * @param {number} winId Window ID to query.
 * @return {?number} The desktop the window should be on, or null if unknown.
 */
virtualdesktops.VirtualDesktopManager.prototype.getDesktopOfWindow =
    function(winId) {
  return this.windowStates_[winId] && this.windowStates_[winId].desktop;
};


/**
 * Finds the current desktop.
 * @return {number} The current desktop.
 */
virtualdesktops.VirtualDesktopManager.prototype.currentDesktop = function() {
  return this.currentDesktop_;
};


/**
 * Forgets all we know about a given window.
 * @param {number} winId Window ID to delete.
 * @param {function()} callback The callback to call when done.
 */
virtualdesktops.VirtualDesktopManager.prototype.forgetWindow =
    function(winId, callback) {
  delete this.windowStates_[winId];
  this.saveState_();
  if (virtualdesktops.DISALLOW_EMPTY_DESKTOPS) {
    // Perform a switch to the current desktop.
    // This will actually check all existing windows, and possibly switch to the
    // next available desktop if we had closed the last remaining window on the
    // current desktop.
    this.windowProvider_.getLastFocused((function(win) {
      this.switchToDesktop(this.currentDesktop_, win, false, callback);
    }).bind(this));
  } else {
    callback();
  }
};
