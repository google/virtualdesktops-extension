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
 * @fileoverview Implementation of client-to-server calls.
 * @package
 */
goog.provide('virtualdesktops.client');

goog.require('virtualdesktops.RequestType');
goog.require('virtualdesktops.WindowProvider');
goog.require('virtualdesktops.settings');


/**
 * Instantiate a WindowProvider for the client to use.
 * @private
 */
virtualdesktops.client.windowProvider_ = new virtualdesktops.WindowProvider();


/**
 * Moves and resizes a given window to the given place in the grid.
 * This sends a message to the window manager service running on the
 * persistent background page.
 * @param {number} x The 0-based x index of the leftmost grid cell to occupy.
 *     Callers must ensure 0 <= x < settings.getColumns().
 * @param {number} y The 0-based y index of the topmost grid cell to occupy.
 *     Callers must ensure 0 <= y < settings.getRows().
 * @param {number} w The target width in grid cells.
 *     Callers must ensure 0 < w <= settings.getColumns() - x.
 * @param {number} h The target height in grid cells.
 *     Callers must ensure 0 < h <= settings.getRows() - y.
 * @param {function()} callback The callback to call when done.
 */
virtualdesktops.client.moveCurrentWindowToGrid =
    function(x, y, w, h, callback) {
  virtualdesktops.client.windowProvider_.getCurrent(function(win) {
    if (win == null) {
      return;
    }
    var message = {
      'request': virtualdesktops.RequestType.MOVE_WINDOW,
      'winId': win.id
    };
    virtualdesktops.client.writePositionToMessage_(x, y, w, h, message);
    chrome.runtime.sendMessage(null, message, {}, callback);
  });
};


/**
 * Moves and resizes a given window to the given place in the grid.
 * This sends a message to the window manager service running on the
 * persistent background page.
 * @param {number} x The 0-based x index of the leftmost grid cell to occupy.
 *     Callers must ensure 0 <= x < settings.getColumns().
 * @param {number} y The 0-based y index of the topmost grid cell to occupy.
 *     Callers must ensure 0 <= y < settings.getRows().
 * @param {number} w The target width in grid cells.
 *     Callers must ensure 0 < w <= settings.getColumns() - x.
 * @param {number} h The target height in grid cells.
 *     Callers must ensure 0 < h <= settings.getRows() - y.
 * @param {function()} callback The callback to call when done.
 */
virtualdesktops.client.extractCurrentTabToGrid =
    function(x, y, w, h, callback) {
  chrome.tabs.query({'active': true, 'currentWindow': true}, function(tabs) {
    if (!tabs || tabs.length != 1) {
      return;
    }
    var message = {
      'request': virtualdesktops.RequestType.EXTRACT_TAB,
      'tabId': tabs[0].id,
      'incognito': tabs[0].incognito
    };
    virtualdesktops.client.writePositionToMessage_(x, y, w, h, message);
    chrome.runtime.sendMessage(null, message, {}, callback);
  });
};


/**
 * Calculates pixel positions from the given grid positions, and writes them
 * into a given message object.
 * @private
 * @param {number} x The 0-based x index of the leftmost grid cell to occupy.
 *     Callers must ensure 0 <= x < settings.getColumns().
 * @param {number} y The 0-based y index of the topmost grid cell to occupy.
 *     Callers must ensure 0 <= y < settings.getRows().
 * @param {number} w The target width in grid cells.
 *     Callers must ensure 0 < w <= settings.getColumns() - x.
 * @param {number} h The target height in grid cells.
 *     Callers must ensure 0 < h <= settings.getRows() - y.
 * @param {!Object} message The client-server message to write the calculated
 *     position to.
 */
virtualdesktops.client.writePositionToMessage_ = function(x, y, w, h, message) {
  if (x == 0 && y == 0 &&
      w == virtualdesktops.settings.getColumns() &&
      h == virtualdesktops.settings.getRows()) {
    message['fullscreen'] = true;
  } else {
    var xmin = Math.round(screen.availLeft +
        x * screen.availWidth / virtualdesktops.settings.getColumns());
    var xmax = Math.round(screen.availLeft +
        (x + w) *
        screen.availWidth / virtualdesktops.settings.getColumns());
    var ymin = Math.round(screen.availTop +
        y * screen.availHeight / virtualdesktops.settings.getRows());
    var ymax = Math.round(screen.availTop +
        (y + h) * screen.availHeight / virtualdesktops.settings.getRows());
    message['x'] = xmin;
    message['y'] = ymin;
    message['w'] = xmax - xmin;
    message['h'] = ymax - ymin;
  }
};


/**
 * Switches to the next virtual desktop.
 * This sends a message to the window manager service running on the
 * persistent background page.
 * @param {function()} callback The callback to call when done.
 */
virtualdesktops.client.switchToNextDesktop = function(callback) {
  virtualdesktops.client.windowProvider_.getLastFocused(function(win) {
    if (win == null) {
      return;
    }
    chrome.runtime.sendMessage(null, {
      'request': virtualdesktops.RequestType.SWITCH_TO_NEXT_DESKTOP,
      'winId': win.id
    }, {}, callback);
  });
};


/**
 * Switches to the previous virtual desktop.
 * This sends a message to the window manager service running on the
 * persistent background page.
 * @param {function()} callback The callback to call when done.
 */
virtualdesktops.client.switchToPreviousDesktop = function(callback) {
  virtualdesktops.client.windowProvider_.getLastFocused(function(win) {
    if (win == null) {
      return;
    }
    chrome.runtime.sendMessage(null, {
      'request': virtualdesktops.RequestType.SWITCH_TO_PREVIOUS_DESKTOP,
      'winId': win.id
    }, {}, callback);
  });
};


/**
 * Switches to the next virtual desktop, sending the currently focused window
 * there.
 * This sends a message to the window manager service running on the
 * persistent background page.
 * @param {function()} callback The callback to call when done.
 */
virtualdesktops.client.currentToNextDesktop = function(callback) {
  virtualdesktops.client.windowProvider_.getCurrent(function(win) {
    if (win == null) {
      return;
    }
    chrome.runtime.sendMessage(null, {
      'request': virtualdesktops.RequestType.CURRENT_TO_NEXT_DESKTOP,
      'winId': win.id
    }, {}, callback);
  });
};


/**
 * Switches to the previous virtual desktop, sending the currently focused
 * window there.
 * This sends a message to the window manager service running on the
 * persistent background page.
 * @param {function()} callback The callback to call when done.
 */
virtualdesktops.client.currentToPreviousDesktop = function(callback) {
  virtualdesktops.client.windowProvider_.getCurrent(function(win) {
    if (win == null) {
      return;
    }
    chrome.runtime.sendMessage(null, {
      'request': virtualdesktops.RequestType.CURRENT_TO_PREVIOUS_DESKTOP,
      'winId': win.id
    }, {}, callback);
  });
};
