/*
 * Copyright 2018 Google Inc. All Rights Reserved.
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
 * @fileoverview Functions to access the settings.
 */
goog.provide('virtualdesktops.settings');


/**
 * Clamps a value between a minimum and maximum. If the value is not a valid
 * integer (possibly converted to string), def is returned.
 * @private
 * @param {*} value The input value.
 * @param {number} min The minimum allowed value.
 * @param {number} max The maximum allowed value.
 * @param {number} def The default value.
 * @return {number} The clamped/defaulted value.
 */
virtualdesktops.settings.clampDefault_ = function(value, min, max, def) {
  value = parseInt(value, 10);
  if (isNaN(value)) {
    return def;
  }
  return Math.min(Math.max(value, min), max);
};


/**
 * Returns the configured number of tiling rows.
 * The configured number is clamped to the supported range on reading, not on
 * writing, to allow for updates to the extension to have a different range.
 * @package
 * @return {number}
 */
virtualdesktops.settings.getRows = function() {
  return virtualdesktops.settings.clampDefault_(
      window.localStorage['rows'], 1, 2, 2);
};


/**
 * Sets the number of tiling rows.
 * @package
 * @param {number} n Number of rows.
 */
virtualdesktops.settings.setRows = function(n) {
  window.localStorage['rows'] = n;
};


/**
 * Returns the configured number of tiling columns.
 * The configured number is clamped to the supported range on reading, not on
 * writing, to allow for updates to the extension to have a different range.
 * @package
 * @return {number}
 */
virtualdesktops.settings.getColumns = function() {
  return virtualdesktops.settings.clampDefault_(
      window.localStorage['columns'], 1, 4, 3);
};


/**
 * Sets the number of tiling columns.
 * @package
 * @param {number} n Number of columns.
 */
virtualdesktops.settings.setColumns = function(n) {
  window.localStorage['columns'] = n;
};


/**
 * Returns the configured shortcut grouping mode.
 * The configured value is mapped to a supported value on reading, not on
 * writing, to allow for updates to the extension to have a different values.
 * @package
 * @return {string}
 */
virtualdesktops.settings.getGroupBy = function() {
  var groupBy = window.localStorage['group-by'];
  if (groupBy != 'size' && groupBy != 'origin') {
    return 'size';
  }
  return groupBy;
};


/**
 * Sets the shortcut grouping mode.
 * @package
 * @param {string} groupBy Grouping mode.
 */
virtualdesktops.settings.setGroupBy = function(groupBy) {
  window.localStorage['group-by'] = groupBy;
};

/**
 * Returns the configured number of virtual desktops.
 * The configured number is clamped to the supported range on reading, not on
 * writing, to allow for updates to the extension to have a different range.
 * @package
 * @return {number}
 */
virtualdesktops.settings.getDesktops = function() {
  return virtualdesktops.settings.clampDefault_(
      window.localStorage['desktops'], 1, 10, 4);
};


/**
 * Sets the number of tiling desktops.
 * @package
 * @param {number} n Number of desktops.
 */
virtualdesktops.settings.setDesktops = function(n) {
  window.localStorage['desktops'] = n;
};
