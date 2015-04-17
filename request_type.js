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


goog.provide('virtualdesktops.RequestType');


/**
 * Types of requests. This is the content of the 'request' member of a
 * browser-action-to-background-page request.
 * @enum {string}
 */
virtualdesktops.RequestType = {
  MOVE_WINDOW: 'moveWindow',
  EXTRACT_TAB: 'extractTab',
  SWITCH_TO_NEXT_DESKTOP: 'switchToNextDesktop',
  SWITCH_TO_PREVIOUS_DESKTOP: 'switchToPreviousDesktop',
  CURRENT_TO_NEXT_DESKTOP: 'currentToNextDesktop',
  CURRENT_TO_PREVIOUS_DESKTOP: 'currentToPreviousDesktop'
};
