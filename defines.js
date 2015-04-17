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
 * @fileoverview Global defines of the virtual desktops extension.
 */
goog.provide('virtualdesktops');


/**
 * @define {boolean}
 * Disallow switching to an empty desktop. Rationale is that if a desktop
 * contains no Chrome window, there is no way to switch back.
 */
virtualdesktops.DISALLOW_EMPTY_DESKTOPS = true;


/**
 * @define {boolean}
 * Handle Alt-Tab (window switching) by always going to the just-activated
 * window.
 * TODO(rpolzer): ChromeOS changes position and size of the window when
 * alt-tabbing a minimized window in. Workaround that? Also, ChromeOS
 * immediately focuses windows during alt-tabbing, which also needs a
 * workaround.
 */
virtualdesktops.HANDLE_ALT_TAB = false;


/**
 * @define {number}
 * Attempts to wait for WINDOW_MANAGER_DELAY_MS. If after this time the new
 * window size doesn't roughly match the attempted size, the fixing is aborted.
 */
virtualdesktops.WINDOW_MANAGER_ATTEMPTS = 5;


/**
 * @define {number}
 * Delay after which we assume the window manager has processed the resize
 * event. Used to check the actual size for possible fixing after resizing.
 */
virtualdesktops.WINDOW_MANAGER_UPDATE_DELAY_MS = 50;


/**
 * @define {number}
 * Delay after which we assume the window manager has processed the create
 * event. Used to check the actual size for possible fixing after creating.
 */
virtualdesktops.WINDOW_MANAGER_CREATE_DELAY_MS = 200;


/**
 * @define {number}
 * Tolerance in total pixel differences to accept as a success of a resize
 * event. On X11, this should be at least as large as title bar size and border
 * size added together.
 */
virtualdesktops.WINDOW_MANAGER_TOLERANCE = 64;


/**
 * @define {number}
 * Total size, in pixels, of the borders that indicate window size. An offset of
 * x percent from a screen edge will be displayed as a border size of
 * x / 100.0 * WINDOW_SIZE_BORDER.
 */
virtualdesktops.WINDOW_SIZE_BORDER = 16;
