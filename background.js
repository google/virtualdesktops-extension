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


goog.require('virtualdesktops');
goog.require('virtualdesktops.RequestType');
goog.require('virtualdesktops.VirtualDesktopManager');
goog.require('virtualdesktops.WakeupQueue');
goog.require('virtualdesktops.WindowProvider');



/**
 * A WindowManagerService is a handler for various messages that trigger window
 * management actions.
 * @constructor
 * @private
 */
virtualdesktops.WindowManagerService_ = function() {
  /**
   * Instantiate a WindowProvider for the background page to use.
   * @private {!virtualdesktops.WindowProvider}
   */
  this.windowProvider_ = new virtualdesktops.WindowProvider();

  /**
   * Ensure that only one event is processed at any time.
   * @private {!virtualdesktops.WakeupQueue}
   */
  this.wakeupQueue_ = new virtualdesktops.WakeupQueue();

  /**
   * Virtual desktop implementation is stateful and thus needs an object to
   * keep said state.
   * @private {!virtualdesktops.VirtualDesktopManager}
   */
  this.virtualDesktopManager_ = new virtualdesktops.VirtualDesktopManager(
      this.windowProvider_, this.updateCurrentDesktop_.bind(this));
};


/**
 * Updates the browser action icon to mention the current desktop.
 * @private
 * @param {number} desktop Number of the current desktop (0-based).
 */
virtualdesktops.WindowManagerService_.prototype.updateCurrentDesktop_ =
    function(desktop) {
  // Create the canvas.
  var canvas = document.createElement('canvas');
  canvas.width = 18;
  canvas.height = 18;
  var ctx = canvas.getContext('2d');

  // Draw the background (a white box with black outlines).
  ctx.fillStyle = 'white';
  ctx.strokeStyle = 'black';
  ctx.rect(0, 0, canvas.width, canvas.height);
  ctx.fill();
  ctx.stroke();

  // Draw black text in the center of the box.
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillStyle = 'black';
  ctx.fillText(desktop + 1, canvas.width / 2, canvas.height / 2);

  // Set the icon to this canvas's image data.
  var data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  chrome.browserAction.setIcon({imageData: data});
};


/**
 * Handles a message received from the browser action.
 * @private
 * @param {*} message The message sent by the browser action.
 * @param {!MessageSender} sender Identification of the sender of the message.
 * @param {function(*): void} sendResponse Callback to call when done.
 * @return {boolean} A true value as the sendResponse callback will be called
 *     asynchronously.
 */
virtualdesktops.WindowManagerService_.prototype.messageHandler_ =
    function(message, sender, sendResponse) {
  this.wakeupQueue_.add((function(finished) {
    var callback = function() {
      console.log('sending response to ' + JSON.stringify(message));
      try {
        sendResponse(null);
      } catch (e) {
        // No need to report this. The typical cause is that the receiving
        // browser action has already been closed, e.g. because window focus
        // changed. This leads to "Attempting to use a disconnected port
        // object". Just ignore this.
      }
      finished();
    };
    console.debug(JSON.stringify(message));
    switch (message['request']) {
      case virtualdesktops.RequestType.MOVE_WINDOW:
        if (message['fullscreen']) {
          this.maximizeWindow_(message['winId'], callback);
        } else {
          this.positionWindow_(message['winId'],
              message['x'], message['y'], message['w'], message['h'],
              callback);
        }
        break;
      case virtualdesktops.RequestType.EXTRACT_TAB:
        if (message['fullscreen']) {
          this.maximizeTab_(message['tabId'],
              message['extractTab'], message['incognito'],
              callback);
        } else {
          this.positionTab_(message['tabId'],
              message['extractTab'], message['incognito'],
              message['x'], message['y'], message['w'], message['h'],
              callback);
        }
        break;
      case virtualdesktops.RequestType.SWITCH_TO_NEXT_DESKTOP:
        this.virtualDesktopManager_.switchToDesktop(
            this.virtualDesktopManager_.currentDesktop() + 1,
            message['winId'], false, callback);
        break;
      case virtualdesktops.RequestType.SWITCH_TO_PREVIOUS_DESKTOP:
        this.virtualDesktopManager_.switchToDesktop(
            this.virtualDesktopManager_.currentDesktop() - 1,
            message['winId'], false, callback);
        break;
      case virtualdesktops.RequestType.CURRENT_TO_NEXT_DESKTOP:
        this.virtualDesktopManager_.switchToDesktop(
            this.virtualDesktopManager_.currentDesktop() + 1,
            message['winId'], true, callback);
        break;
      case virtualdesktops.RequestType.CURRENT_TO_PREVIOUS_DESKTOP:
        this.virtualDesktopManager_.switchToDesktop(
            this.virtualDesktopManager_.currentDesktop() - 1,
            message['winId'], true, callback);
        break;
    }
  }).bind(this));
  return true;  // Will call sendResponse() asynchronously.
};


/**
 * Handles events that inform us of a focus change.
 * Useful to automatically switch to a window's virtual desktop when it has been
 * restored by the user (e.g. via Alt-Tab).
 * @private
 * @param {number} winId ID of the window that has received focus.
 */
virtualdesktops.WindowManagerService_.prototype.focusChangedHandler_ =
    function(winId) {
  if (!this.wakeupQueue_.isIdle()) {
    // Alt-Tab events received during window management operations may be caused
    // by the operation itself, thus are ignored.
    return;
  }

  var desktop = this.virtualDesktopManager_.getDesktopOfWindow(winId);
  if (desktop == null) {
    // Unknown or no window -> nothing to do.
    return;
  }
  if (desktop == this.virtualDesktopManager_.currentDesktop()) {
    // If it belongs on this desktop, nothing to do.
    return;
  }

  console.debug('Alt-tab to another desktop detected!');

  // Send the window back to the desktop where it belongs, and also switch
  // there.
  this.wakeupQueue_.add((function(finished) {
    this.virtualDesktopManager_.switchToDesktop(
        /** @type {number} */ (desktop), winId, true, finished);
  }).bind(this));
};


/**
 * Handles events that inform us of a window having been closed.
 * Useful if a newly created window may get the same ID.
 * @private
 * @param {number} winId ID of the window that just has been closed.
 */
virtualdesktops.WindowManagerService_.prototype.removedHandler_ =
    function(winId) {
  this.wakeupQueue_.add((function(finished) {
    this.virtualDesktopManager_.forgetWindow(winId, finished);
  }).bind(this));
};


/**
 * Starts all event listeners.
 */
virtualdesktops.WindowManagerService_.prototype.addEventListeners =
    function() {
  chrome.runtime.onMessage.addListener(this.messageHandler_.bind(this));
  if (virtualdesktops.HANDLE_ALT_TAB) {
    this.windowProvider_.onFocusChanged(this.focusChangedHandler_.bind(this));
  }
  this.windowProvider_.onRemoved(this.removedHandler_.bind(this));
};


/**
* Maximizes a given window.
* @private
* @param {number} winId The ID of the window.
* @param {function()} callback Closure to run when done.
*/
virtualdesktops.WindowManagerService_.prototype.maximizeWindow_ =
    function(winId, callback) {
  var updateInfo = {
    state: 'maximized'
  };
  this.windowProvider_.update(winId, updateInfo, callback);
};


/**
 * Creates a new window from the current tab, and maximizes it.
 * @private
 * @param {number} tabId The ID of the tab.
 * @param {string} type The type of the window to create.
 * @param {boolean} incognito Whether the tab is incognito.
 * @param {function()} callback Closure to run when done.
 */
virtualdesktops.WindowManagerService_.prototype.maximizeTab_ =
    function(tabId, type, incognito, callback) {
  var createInfo = {
    type: type,
    incognito: incognito,
    tabId: tabId,
    focused: true
  };
  this.windowProvider_.create(createInfo, (function(win) {
    // Sorry, can't create a maximized window directly. Chrome outright doesn't
    // support this.
    var updateInfo = {
      state: 'maximized'
    };
    this.windowProvider_.update(win.id, updateInfo, callback);
  }).bind(this));
};


/**
 * Moves and resizes a given window to the given place in the grid.
 * @private
 * @param {number} winId The ID of the window.
 * @param {number} x The 0-based x index of the leftmost grid cell to occupy.
 * @param {number} y The 0-based y index of the topmost grid cell to occupy.
 * @param {number} w The target width in grid cells.
 * @param {number} h The target height in grid cells.
 * @param {function()} callback The callback to call when done.
 */
virtualdesktops.WindowManagerService_.prototype.positionWindow_ =
    function(winId, x, y, w, h, callback) {
  var updateInfo = {
    left: x,
    top: y,
    width: w,
    height: h,
    state: 'normal'
  };
  this.windowProvider_.update(winId, updateInfo, callback);
};


/**
 * Creates a new window from the current tab, and moves and resizes it to the
 * given place in the grid.
 * @private
 * @param {number} tabId The ID of the tab.
 * @param {string} type The type of the window to create.
 * @param {boolean} incognito Whether the tab is incognito.
 * @param {number} x The 0-based x index of the leftmost grid cell to occupy.
 * @param {number} y The 0-based y index of the topmost grid cell to occupy.
 * @param {number} w The target width in grid cells.
 * @param {number} h The target height in grid cells.
 * @param {function()} callback The callback to call when done.
 */
virtualdesktops.WindowManagerService_.prototype.positionTab_ =
    function(tabId, type, incognito, x, y, w, h, callback) {
  var createInfo = {
    type: type,
    incognito: incognito,
    tabId: tabId,
    focused: true,
    left: x,
    top: y,
    width: w,
    height: h
  };
  this.windowProvider_.create(createInfo, callback);
};


// Start the window manager!
var windowManager = new virtualdesktops.WindowManagerService_();
windowManager.addEventListeners();
