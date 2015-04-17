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
 * @externs
 */


/**
 * Changes one can apply to a window using virtualdesktops.WindowProvider's
 * update method. This is a subset of the properties allowed in
 * chrome.windows.update; all of these must be supported by FakeWindowProvider
 * as well. This is an extern as it is part of the interface to Chrome, thus its
 * field must not be renamed.
 * All fields are optional; leaving out a value requests not changing it.
 * @typedef {{
 *   state: (string|undefined),
 *   focused: (boolean|undefined),
 *   left: (number|undefined),
 *   top: (number|undefined),
 *   width: (number|undefined),
 *   height: (number|undefined)
 * }} */
var ChromeWindowUpdateInfo;
