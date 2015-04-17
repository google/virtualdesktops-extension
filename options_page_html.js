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
 * @fileoverview JavaScript code to handle the options page.
 *
 * Provides nothing, but adds event handlers to the DOM of options_page.html on
 * load.
 */
goog.require('virtualdesktops.settings');


/**
 * Saves the options from the form fields to the localStorage values.
 * Settings values are re-parsed to give user feedback on possible clamping.
 * @private
 */
function saveOptions() {
  var rows = document.getElementById('rows');
  virtualdesktops.settings.setRows(parseInt(rows.value, 10));
  rows.value = virtualdesktops.settings.getRows();

  var columns = document.getElementById('columns');
  virtualdesktops.settings.setColumns(parseInt(columns.value, 10));
  columns.value = virtualdesktops.settings.getColumns();

  var desktops = document.getElementById('desktops');
  virtualdesktops.settings.setDesktops(parseInt(desktops.value, 10));
  desktops.value = virtualdesktops.settings.getDesktops();

  // Show a status message for a short period of time, then remove it again.
  var status = document.getElementById('status');
  status.textContent = 'Options Saved.';
  setTimeout(function() {
    status.textContent = '';
  }, 750);
}


/**
 * Sets up event handlers, and restore the options from the localStorage values
 * to the form fields.
 * @private
 */
function init() {
  document.querySelector('#save').addEventListener('click', saveOptions);
  document.querySelector('#configure-commands').addEventListener('click',
      function() {
        chrome.tabs.create({url: 'chrome://extensions/configureCommands'});
      });

  var rows = document.getElementById('rows');
  rows.value = virtualdesktops.settings.getRows();

  var columns = document.getElementById('columns');
  columns.value = virtualdesktops.settings.getColumns();

  var desktops = document.getElementById('desktops');
  desktops.value = virtualdesktops.settings.getDesktops();
}


document.addEventListener('DOMContentLoaded', init);
