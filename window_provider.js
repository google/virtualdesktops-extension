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
goog.provide('virtualdesktops.WindowProvider');

goog.require('virtualdesktops');



/**
 * A WindowProvider manages windows using the chrome.windows API. It is a
 * separate class to allow for easy mocking and debugging, as well as working
 * around discrepancies between requested and actual size on X11.
 * @constructor
 */
virtualdesktops.WindowProvider = function() {};


/**
 * Wraps callbacks so they log errors from chrome.runtime.lastError and receive
 * a null value on error.
 * @private
 * @param {function(?T)} callback Callback the user provides. Receives null on
 *     error.
 * @return {function(T)} callback Callback to pass to the chrome.windows API.
 * @template T
 */
virtualdesktops.WindowProvider.prototype.wrapCallback_ = function(callback) {
  return function(arg) {
    if (chrome.runtime.lastError) {
      console.log(chrome.runtime.lastError.message);
      callback(null);
    } else {
      callback(arg);
    }
  };
};


/**
 * Queries a specific window.
 * Just forwarded to the chrome.windows API.
 * @param {number} winId The ID of the window to query.
 * @param {function(?ChromeWindow)} callback The callback that receives
 *     information about the window when done.
 */
virtualdesktops.WindowProvider.prototype.get = function(winId, callback) {
  chrome.windows.get(winId, {}, this.wrapCallback_(callback));
};


/**
 * Queries the current window, including the list of its tabs.
 * Just forwarded to the chrome.windows API.
 * @param {function(?ChromeWindow)} callback The callback that receives
 *     information about the window when done.
 */
virtualdesktops.WindowProvider.prototype.getCurrent = function(callback) {
  chrome.windows.getCurrent({'populate': true}, this.wrapCallback_(callback));
};


/**
 * Queries the last focused window.
 * Just forwarded to the chrome.windows API.
 * @param {function(?ChromeWindow)} callback The callback that receives
 *     information about the window when done.
 */
virtualdesktops.WindowProvider.prototype.getLastFocused = function(callback) {
  chrome.windows.getLastFocused({}, this.wrapCallback_(callback));
};


/**
 * Queries all windows.
 * Just forwarded to the chrome.windows API.
 * @param {function(!Array<!ChromeWindow>)} callback The callback that
 *     receives information about the windows when done.
 */
virtualdesktops.WindowProvider.prototype.getAll = function(callback) {
  chrome.windows.getAll({}, callback);
};


/**
 * Moves and resizes a given window.
 * Compensates for window manager failings (e.g. client area vs window size
 * discrepancies on X11).
 * @param {number} winId The ID of the window.
 * @param {!ChromeWindowUpdateInfo} updateInfo Changes to apply to the window.
 * @param {function(): void} callback The callback to call when done.
 */
virtualdesktops.WindowProvider.prototype.update =
    function(winId, updateInfo, callback) {
  chrome.windows.update(winId, updateInfo,
      this.checkWindowUpdated_.bind(this, winId, updateInfo, callback, 0));
};


/**
 * Creates a new window.
 * Compensates for window manager failings (e.g. client area vs window size
 * discrepancies on X11).
 * @param {!ChromeWindowCreateInfo} createInfo Info for creating the window.
 * @param {function(ChromeWindow): void} callback The callback to call when
 *     done. It receives the just created ChromeWindow as parameter.
 */
virtualdesktops.WindowProvider.prototype.create =
    function(createInfo, callback) {
  chrome.windows.create(createInfo, (function(win) {
    var updateInfo = {
      left: createInfo.left,
      top: createInfo.top,
      width: createInfo.width,
      height: createInfo.height
    };
    // As Chrome never creates the window exactly the way we want, and as
    // apparently the size when creating and updating windows is interpreted
    // differently on X11, we just chain to the updating logic from here.
    setTimeout(this.update.bind(this, win.id, updateInfo,
            callback.bind(null, win)),
        virtualdesktops.WINDOW_MANAGER_CREATE_DELAY_MS);
  }).bind(this));
};


/**
 * Checks whether the requested window update already has been applied. If it
 * has, its result is compared to the request, and - if there are discrepancies
 * - a new request is initiated to fix the discrepancies.
 * @private
 * @param {number} winId The ID of the window.
 * @param {!ChromeWindowUpdateInfo} updateInfo Changes to apply to the window.
 * @param {function(): void} callback The callback to call when done.
 * @param {number} i The current checking attempt. In case no difference is
 *     detected, up to virtualdesktops.WINDOW_MANAGER_TOLERANCE attempts
 *     (with a time distance of virtualdesktops.WINDOW_MANAGER_UPDATE_DELAY_MS)
 *     are performed.
 */
virtualdesktops.WindowProvider.prototype.checkWindowUpdated_ =
    function(winId, updateInfo, callback, i) {
  if (i >= virtualdesktops.WINDOW_MANAGER_ATTEMPTS) {
    console.debug('gave up');
    callback();
    return;
  }
  setTimeout(this.get.bind(this, winId, (function(win) {
    if (win == null) {
      console.debug('window disappeared');
      callback();
      return;
    }
    var fixes = this.fixUpdateInfo(win, updateInfo);
    if (fixes.distance == 0) {
      // Nothing to do!
      callback();
      return;
    }
    if (fixes.distance > virtualdesktops.WINDOW_MANAGER_TOLERANCE) {
      // Try again later...
      this.checkWindowUpdated_(winId, updateInfo, callback, i + 1);
      return;
    }
    chrome.windows.update(winId, fixes.newUpdateInfo, callback);
  }).bind(this)), virtualdesktops.WINDOW_MANAGER_UPDATE_DELAY_MS);
};


/**
 * Fixes the size of a given window after a resize attempt.
 * Compensates for window manager failings (e.g. client area vs window size
 * discrepancies on X11).
 * @package
 * @param {!ChromeWindow} win The window struct.
 * @param {!ChromeWindowUpdateInfo} updateInfo Changes that were applied to the
 *     window.
 * @return {{newUpdateInfo: !ChromeWindowUpdateInfo, distance: number}} A new
 *     update to perform, and the distance by which this update will adjust the
 *     window.
 */
virtualdesktops.WindowProvider.prototype.fixUpdateInfo =
    function(win, updateInfo) {
  var distance = 0;
  /**
   * @type {ChromeWindowUpdateInfo}
   */
  var newUpdateInfo = {
    state: undefined,
    focused: undefined,
    left: undefined,
    top: undefined,
    width: undefined,
    height: undefined
  };
  // When reading, left, top, width, height will contain the bounds of the
  // client area, NOT the window itself (including borders).
  // However, our resize command will be interpreted by the X11 window manager,
  // and cause e.g. addition of title bars and similar.
  // So we must do this:
  // - If 'left' bound increases, decrease 'width' and repeat the update call.
  // - If 'width' bound decreases, increase 'width' and repeat the update call.
  // So essentially, we're changing width and height to readjust the bottom
  // right corner of the window, while leaving the top left corner as is.
  if (updateInfo.width != null && updateInfo.left != null) {
    var dx = (win.left + win.width) - (updateInfo.left + updateInfo.width);
    newUpdateInfo.width = updateInfo.width - dx;
    distance += Math.abs(dx);
  }
  if (updateInfo.height != null && updateInfo.top != null) {
    var dy = (win.top + win.height) - (updateInfo.top + updateInfo.height);
    newUpdateInfo.height = updateInfo.height - dy;
    distance += Math.abs(dy);
  }
  return {
    newUpdateInfo: newUpdateInfo,
    distance: distance
  };
};


/**
 * Registers an event handler for focus changes.
 * Just forwarded to the chrome.windows API.
 * @param {function(number)} handler Event handler receiving the ID of the newly
 *     focused window when focus changes.
 */
virtualdesktops.WindowProvider.prototype.onFocusChanged = function(handler) {
  chrome.windows.onFocusChanged.addListener(handler);
};


/**
 * Registers an event handler for window closing.
 * Just forwarded to the chrome.windows API.
 * @param {function(number)} handler Event handler receiving the ID of the just
 *     closed window when a window is closed.
 */
virtualdesktops.WindowProvider.prototype.onRemoved = function(handler) {
  chrome.windows.onRemoved.addListener(handler);
};
