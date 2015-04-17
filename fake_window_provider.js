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


goog.provide('virtualdesktops.FakeWindowProvider');
goog.require('goog.testing.PseudoRandom');
goog.require('goog.testing.jsunit');
goog.require('virtualdesktops.WindowProvider');


var pseudoRandom = new goog.testing.PseudoRandom(0, true);



/**
 * A fake of WindowProvider that allows to easily unit test window management.
 * It does not support event handlers at this point.
 * @constructor
 * @extends {virtualdesktops.WindowProvider}
 */
virtualdesktops.FakeWindowProvider = function() {
  virtualdesktops.FakeWindowProvider.base(this, 'constructor');

  /**
   * A map of ChromeWindow objects.
   * Tests may directly write to this to set up a window layout.
   * @type {!Object<number, !ChromeWindow>}
   */
  this.windows = {};

  /**
   * The window that has focus, if any.
   * Tests may directly write to this to set up a window layout.
   * @type {?number}
   */
  this.lastFocusedWindow = null;

  /**
   * The current window, if any.
   * Tests may directly write to this to set up a window layout.
   * @type {?number}
   */
  this.currentWindow = null;
};
goog.inherits(
    virtualdesktops.FakeWindowProvider,
    virtualdesktops.WindowProvider);


/**
 * Gives focus to a window. Called when raising.
 * @private
 * @param {number} winId The ID of the window to focus.
 */
virtualdesktops.FakeWindowProvider.prototype.setFocus_ =
    function(winId) {
  assertTrue(winId in this.windows);
  for (var wStr in this.windows) {
    var w = parseInt(wStr, 10);
    this.windows[w].focused = false;
  }
  if (this.windows[winId].state != 'minimized') {
    this.windows[winId].focused = true;
    this.lastFocusedWindow = winId;
  }
};


/**
 * Loses focus from a window. Called when minimizing.
 * @private
 * @param {number} winId The ID of the window that shall lose focus.
 */
virtualdesktops.FakeWindowProvider.prototype.clearFocus_ =
    function(winId) {
  assertTrue(winId in this.windows);
  var focusCandidates = [];
  for (var wStr in this.windows) {
    var w = parseInt(wStr, 10);
    this.windows[w].focused = false;
    if (this.windows[w].state != 'minimized' && w != winId) {
      focusCandidates.push(w);
    }
  }
  if (focusCandidates.length > 0) {
    var n = Math.floor(pseudoRandom.random() * focusCandidates.length);
    this.windows[focusCandidates[n]].focused = true;
    this.lastFocusedWindow = this.windows[focusCandidates[n]].id;
  }
};


/**
 * Queries a specific window.
 * @param {number} winId The ID of the window to query.
 * @param {function(?ChromeWindow)} callback The callback that receives
 *     information about the window when done.
 */
virtualdesktops.FakeWindowProvider.prototype.get =
    function(winId, callback) {;
  callback(this.windows[winId]);
};


/**
 * Queries the current window.
 * @param {function(?ChromeWindow)} callback The callback that receives
 *     information about the window when done.
 */
virtualdesktops.FakeWindowProvider.prototype.getCurrent = function(callback) {
  callback(this.currentWindow == null ?
      null : this.windows[this.currentWindow]);
};


/**
 * Queries the last focused window.
 * @param {function(?ChromeWindow)} callback The callback that receives
 *     information about the window when done.
 */
virtualdesktops.FakeWindowProvider.prototype.getLastFocused = function(
    callback) {
  callback(this.lastFocusedWindow == null ?
      null : this.windows[this.lastFocusedWindow]);
};


/**
 * Queries all windows.
 * @param {function(!Array<!ChromeWindow>)} callback The callback that
 *     receives information about the windows when done.
 */
virtualdesktops.FakeWindowProvider.prototype.getAll =
    function(callback) {
  var list = [];
  for (var wStr in this.windows) {
    var w = parseInt(wStr, 10);
    list.push(this.windows[w]);
  }
  callback(list);
};


/**
 * Moves and resizes a given window.
 * @param {number} winId The ID of the window to modify.
 * @param {!ChromeWindowUpdateInfo} updateInfo Changes to apply to the window.
 * @param {function()} callback The callback to call when done.
 */
virtualdesktops.FakeWindowProvider.prototype.update =
    function(winId, updateInfo, callback) {
  assertTrue(winId in this.windows);
  for (var key in updateInfo) {
    this.windows[winId][key] = updateInfo[key];
  }

  // If we gained focus, make sure everything else gets unfocused.
  if (updateInfo.focused === true) {
    this.setFocus_(winId);
  }
  // If we lost focus, focus something else if possible.
  if (updateInfo.focused === false || updateInfo.state == 'minimized') {
    this.clearFocus_(winId);
  }

  // Invoke the callback if given.
  callback();
};
