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

goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.jsunit');
goog.require('virtualdesktops.FakeWindowProvider');
goog.require('virtualdesktops.VirtualDesktopManager');
goog.require('virtualdesktops.settings');


// This variable is initialized and explained at the bottom of this file.
var asyncTestCase;


/**
 * The window provider for use by this test. It gets initialized in setUp().
 * @type {?virtualdesktops.FakeWindowProvider}
 */
var windowProvider = null;


/**
 * The virtual desktop manager for use by this test. It uses windowProvider as
 * its window provider and gets initialized in setUp().
 * @type {?virtualdesktops.VirtualDesktopManager}
 */
var virtualDesktopManager = null;


/**
 * @type {number}
 */
var currentDesktop;


/**
 * Creates a new window for use by this test.
 * @param {number} id ID of the window to create.
 * @param {?number} x Left coordinate of the window.
 * @param {?number} y Top coordinate of the window.
 * @param {?number} w Width of the window.
 * @param {?number} h Height of the window.
 * @param {string} state State of the window (usually 'normal').
 */
function createWindow(id, x, y, w, h, state) {
  // As the unit test is running inside a web page and not an extension, we
  // can't create a real ChromeWindow object. However, this supports all we
  // need, so we'll just put up with a JSDoc cast.
  windowProvider.windows[id] = /** @type {!ChromeWindow} */ ({
    id: id,
    left: x,
    top: y,
    width: w,
    height: h,
    focused: false,
    incognito: false,
    type: 'normal',
    state: state,
    alwaysOnTop: false
  });
}


/**
 * Performs common set-up of a specific window layout used for the tests.
 */
function setUp() {
  virtualdesktops.settings.setDesktops(4);
  delete window.localStorage['currentDesktop'];
  delete window.localStorage['windowStates'];
  windowProvider = new virtualdesktops.FakeWindowProvider();
  createWindow(1, 0, 0, 1280, 480, 'normal');
  createWindow(2, 0, 480, 640, 480, 'normal');
  createWindow(3, 640, 480, 640, 480, 'normal');
  createWindow(4, null, null, null, null, 'minimized');
  createWindow(5, 0, 0, 200, 150, 'normal');
  windowProvider.currentWindow = 1;
  windowProvider.update(1, {focused: true}, function() {});
  virtualDesktopManager = new virtualdesktops.VirtualDesktopManager(
      windowProvider, function(desktop) { currentDesktop = desktop; });
}


/**
 * Tests whether switching virtual desktops is refused if no windows are on the
 * destination desktop.
 */
function testRefuseSwitchingToEmpty() {
  asyncTestCase.waitForAsync('finishing desktop switch 1/1');
  virtualDesktopManager.switchToDesktop(1, 1, false, function() {
    assertEquals(0, currentDesktop);
    assertEquals('normal', windowProvider.windows[1].state);
    assertEquals('normal', windowProvider.windows[2].state);
    assertEquals('normal', windowProvider.windows[3].state);
    assertEquals('minimized', windowProvider.windows[4].state);
    assertEquals('normal', windowProvider.windows[5].state);
    assertEquals(1, windowProvider.lastFocusedWindow);

    asyncTestCase.continueTesting();
  });
}


/**
 * Tests whether switching virtual desktops is refused if no windows are on the
 * destination desktop.
 * This is done by sending a window to another desktop from the initial state,
 * then switching back to the original desktop and verifying the window is now
 * minimized.
 */
function testSendWindowAndSwitchBack() {
  asyncTestCase.waitForAsync('finishing desktop switch 1/2');
  virtualDesktopManager.switchToDesktop(1, 1, true, function() {
    assertEquals(1, currentDesktop);
    assertEquals('normal', windowProvider.windows[1].state);
    assertEquals('minimized', windowProvider.windows[2].state);
    assertEquals('minimized', windowProvider.windows[3].state);
    assertEquals('minimized', windowProvider.windows[4].state);
    assertEquals('minimized', windowProvider.windows[5].state);
    assertEquals(1, windowProvider.lastFocusedWindow);

    asyncTestCase.waitForAsync('finishing desktop switch 2/2');

    virtualDesktopManager.switchToDesktop(0, 1, false, function() {
      assertEquals(0, currentDesktop);
      assertEquals('minimized', windowProvider.windows[1].state);
      assertEquals('normal', windowProvider.windows[2].state);
      assertEquals('normal', windowProvider.windows[3].state);
      assertEquals('minimized', windowProvider.windows[4].state);
      assertEquals('normal', windowProvider.windows[5].state);
      assertContains(windowProvider.lastFocusedWindow, [2, 3, 5]);

      asyncTestCase.continueTesting();
    });
  });
}


/**
 * Tests whether desktops are preserved on "reboot".
 * This is done by sending a window to another desktop from the initial state,
 * simulating a ChromeOS "reboot" by re-initializing the virtualDesktopManager,
 * then switching back to the original desktop and verifying the window is now
 * minimized.
 */
function testSendWindowRebootAndSwitchBack() {
  asyncTestCase.waitForAsync('finishing desktop switch 1/2');

  virtualDesktopManager.switchToDesktop(1, 1, true, function() {
    assertEquals(1, currentDesktop);
    assertEquals('normal', windowProvider.windows[1].state);
    assertEquals('minimized', windowProvider.windows[2].state);
    assertEquals('minimized', windowProvider.windows[3].state);
    assertEquals('minimized', windowProvider.windows[4].state);
    assertEquals('minimized', windowProvider.windows[5].state);
    assertEquals(1, windowProvider.lastFocusedWindow);
    virtualDesktopManager = new virtualdesktops.VirtualDesktopManager(
        windowProvider, function(desktop) { currentDesktop = desktop; });

    asyncTestCase.waitForAsync('finishing desktop switch 2/2');

    virtualDesktopManager.switchToDesktop(0, 1, false, function() {
      assertEquals(0, currentDesktop);
      assertEquals('minimized', windowProvider.windows[1].state);
      assertEquals('normal', windowProvider.windows[2].state);
      assertEquals('normal', windowProvider.windows[3].state);
      assertEquals('minimized', windowProvider.windows[4].state);
      assertEquals('normal', windowProvider.windows[5].state);
      assertContains(windowProvider.lastFocusedWindow, [2, 3, 5]);

      asyncTestCase.continueTesting();
    });
  });
}


/**
 * Tests whether switching to the next virtual desktop switches to zero if the
 * current desktop is unavailable.
 */
function testSwitchForwardFromDeletedDesktop() {
  asyncTestCase.waitForAsync('finishing desktop switch 1/4');

  virtualDesktopManager.switchToDesktop(1, 1, true, function() {
    asyncTestCase.waitForAsync('finishing desktop switch 2/4');

    virtualDesktopManager.switchToDesktop(3, 3, true, function() {
      asyncTestCase.waitForAsync('finishing desktop switch 3/4');

      virtualDesktopManager.switchToDesktop(2, 2, true, function() {
        assertEquals(2, currentDesktop);

        // Reduce the number of desktops!
        virtualdesktops.settings.setDesktops(2);

        asyncTestCase.waitForAsync('finishing desktop switch 4/4');

        // Switching from desktop 2 to desktop 3 then should actually switch to
        // 0.
        virtualDesktopManager.switchToDesktop(3, 2, false, function() {
          assertEquals(0, currentDesktop);

          asyncTestCase.continueTesting();
        });
      });
    });
  });
}


/**
 * Tests whether switching to the previous virtual desktop switches to the last
 * desktop if the current desktop is unavailable.
 */
function testSwitchBackwardFromDeletedDesktop() {
  asyncTestCase.waitForAsync('finishing desktop switch 1/4');

  virtualDesktopManager.switchToDesktop(1, 1, true, function() {
    asyncTestCase.waitForAsync('finishing desktop switch 2/4');

    virtualDesktopManager.switchToDesktop(2, 2, true, function() {
      asyncTestCase.waitForAsync('finishing desktop switch 3/4');

      virtualDesktopManager.switchToDesktop(3, 3, true, function() {
        assertEquals(3, currentDesktop);

        // Reduce the number of desktops!
        virtualdesktops.settings.setDesktops(2);

        asyncTestCase.waitForAsync('finishing desktop switch 4/4');

        // Switching from desktop 3 to desktop 2 then should actually switch to
        // 1.
        virtualDesktopManager.switchToDesktop(2, 3, false, function() {
          assertEquals(1, currentDesktop);

          asyncTestCase.continueTesting();
        });
      });
    });
  });
}


/**
 * Tests whether closing the last remaining window on a desktop will switch to
 * another desktop.
 */
function testForgetWindowSwitchesDesktop() {
  asyncTestCase.waitForAsync('finishing desktop switch');

  virtualDesktopManager.switchToDesktop(1, 1, true, function() {
    asyncTestCase.waitForAsync('closing window 1');

    delete windowProvider.windows[1];
    virtualDesktopManager.forgetWindow(1, function() {
      assertEquals(0, currentDesktop);

      asyncTestCase.continueTesting();
    });
  });
}


// This must be done at the end so compiled unit tests can work, as this
// triggers enumeration of all test* functions which are created using this
// compiled JSCompiler code:
// goog.exportSymbol("testXXX", function testXXX() { ... });
// This makes the function available only AFTER its declaration, according to
// ECMA-262 10.1.3.
asyncTestCase = goog.testing.AsyncTestCase.createAndInstall();
