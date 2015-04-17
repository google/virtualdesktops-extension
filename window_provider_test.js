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
 * @fileoverview Unit test for VirtualDesktopManager.
 * @package
 */
goog.setTestOnly();

goog.require('goog.testing.jsunit');
goog.require('virtualdesktops.WindowProvider');


/**
 * Simulate what happens on X11 when resizing a window.
 * @param {!ChromeWindow} win Window to apply changes to.
 * @param {number} titleBarSize Size of title bars in pixels.
 * @param {number} borderSize Size of window borders in pixels.
 * @param {!Object} updateInfo Position/size change information (same as in
 *     chrome.windows.update).
 * @return {!ChromeWindow} Final state of the window.
 */
function simulateX11UpdateInfo(win, titleBarSize, borderSize, updateInfo) {
  var newWin =
      /** @type {!ChromeWindow} */ (JSON.parse(JSON.stringify(win)));
  if (updateInfo.left != null) {
    newWin.left = updateInfo.left + borderSize;
  }
  if (updateInfo.top != null) {
    newWin.top = updateInfo.top + borderSize + titleBarSize;
  }
  if (updateInfo.width != null) {
    newWin.width = updateInfo.width;
  }
  if (updateInfo.height != null) {
    newWin.height = updateInfo.height;
  }
  return newWin;
}


/**
 * Tests whether fixing the window position/size happens correctly.
 *
 * This is done by actually simulating what X11 window managers "do", and
 * verifying whether the final size is correct.
 */
function testFixUpdateInfo() {
  var wp = new virtualdesktops.WindowProvider();

  var updateInfo = {
    left: 100,
    top: 100,
    width: 300,
    height: 200
  };

  // Note: we can initialize the original window struct empty, as all its fields
  // will be written to in the initial "update".
  var origWindow = /** @type {!ChromeWindow} */ ({});

  // Do the actual resizing.
  var intermediateWindow = simulateX11UpdateInfo(origWindow, 10, 3, updateInfo);

  // Verify this window's bottom right corner does not match up.
  assertNotEquals(updateInfo.left + updateInfo.width,
      intermediateWindow.left + intermediateWindow.width);
  assertNotEquals(updateInfo.top + updateInfo.height,
      intermediateWindow.top + intermediateWindow.height);

  // Try fixing the updateInfo.
  var fix = wp.fixUpdateInfo(intermediateWindow, updateInfo);
  var fixedUpdateInfo = fix.newUpdateInfo;

  // Verify we actually performed a fix of "reasonable" distance.
  assertTrue(fix.distance < 64);
  assertTrue(fix.distance > 0);

  // Resize again, this time with fixed parameters.
  var finalWindow =
      simulateX11UpdateInfo(intermediateWindow, 10, 3, fixedUpdateInfo);

  // Verify that the bottom right corner is the intended one.
  assertEquals(updateInfo.left + updateInfo.width,
      finalWindow.left + finalWindow.width);
  assertEquals(updateInfo.top + updateInfo.height,
      finalWindow.top + finalWindow.height);
}
