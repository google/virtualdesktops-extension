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
 * @fileoverview JavaScript code to handle the browser action page.
 *
 * Creates the table of buttons, and its event handlers.
 */
goog.require('virtualdesktops');
goog.require('virtualdesktops.client');
goog.require('virtualdesktops.settings');


/**
 * Map from coordinates to keyboard positions, so that KEY_BY_POS[row][col]
 * identifies keys on a rectangle on the keyboard.
 * TODO(rpolzer): Turn into settings, as this is layout dependent.
 * @const {!Array<string>}
 */
var KEYCODE_BY_POS = [
  [81, 87, 69, 82, 84, 89, 85, 73, 79, 80],
  [65, 83, 68, 70, 71, 72, 74, 75, 76, 186],
  [90, 88, 67, 86, 66, 78, 77, 188, 190, 191]
];


/**
 * Map from coordinates to key caps, as printed on Chromebook keyboards.
 * Matches KEYCODE_BY_POS in indexes.
 */
var KEYCAP_BY_POS = [
  'qwertyuiop',
  'asdfghjkl;',
  'zxcvbnm,./'
];


/**
 * Event handlers for key down events per key. Used for arrow keys.
 * The key is the keyCode, optionally followed by a space and the modifier
 * status. The value is a button whose onclick event will be raised when the key
 * is pressed.
 * @private {!Object<string, !Element>}
 */
var onKeyDown_ = {};


/**
 * Maps an index to a pair of group index and index within group.
 * Group 0 has size n, group 1 has size n-1, ..., group n-1 has size 1.
 * Each group represents a window width/height in cells, and each index in a
 * group represents a coordinate of the lowest edge of a window position.
 * @private
 * @param {number} i Index to mapGroupIndex.
 * @param {number} n Size of the largest group.
 * @return {?{group: number, index: number}} Group index and index within group.
 */
function mapGroupIndex(i, n) {
  var groupIndex = 0;
  var groupStart = 0;
  var groupLength = n;
  while (groupLength > 0) {
    if (i < groupStart + groupLength) {
      return {group: groupIndex, index: i - groupStart};
    }
    groupStart += groupLength;
    --groupLength;
    ++groupIndex;
  }
  return null;
}


/**
 * Yields the number of valid indexes given a maximum group size. This is the
 * following sum: 1 + 2 + ... + n.
 * @private
 * @param {number} n The number of rows/columns.
 * @return {number} The number of indexes.
 */
function mapGroupIndexCount(n) {
  return n * (n + 1) / 2;
}


/**
 * @private
 * @param {number} i The index of the button panel row.
 * @return {number} The top window grid row to move a window to.
 */
function rowFor(i) {
  return mapGroupIndex(i, virtualdesktops.settings.getRows()).index;
}


/**
 * @private
 * @param {number} i The index of the button panel row.
 * @return {number} The height in window grid units to resize a window to.
 */
function heightFor(i) {
  return mapGroupIndex(i, virtualdesktops.settings.getRows()).group + 1;
}


/**
 * @private
 * @param {number} j The index of the button panel column.
 * @return {number} The left window grid column to move a window to.
 */
function columnFor(j) {
  return mapGroupIndex(j, virtualdesktops.settings.getColumns()).index;
}


/**
 * @private
 * @param {number} j The index of the button panel column.
 * @return {number} The width in window grid units to resize a window to.
 */
function widthFor(j) {
  return mapGroupIndex(j, virtualdesktops.settings.getColumns()).group + 1;
}


/**
 * Adds a HTML button to a table row.
 * @private
 * @param {!Element} r Table row to add to.
 * @param {string} className CSS class name to set the button to.
 * @param {string} text Text to display on the button.
 * @param {string} title Tooltip to display on the button.
 * @param {?string} keydown Special key to press to activate the button,
 *     followed by a space and the modifier status.
 * @param {function()|function(Event)} action Callback to invoke when pressing
 *     the button.
 * @return {!Element} Table data cell containing the button.
 */
function createButton(r, className, text, title, keydown, action) {
  var c = document.createElement('td');
  // TODO(rpolzer): Find a way to get rid of this DIV, or at least figure out
  // why it's required for the width/height positioning of the button to
  // actually work.
  var d = document.createElement('div');
  d.classList.add('button-container');
  var b = document.createElement('button');
  b.classList.add(className);
  b.title = title;
  var s = document.createElement('span');
  s.appendChild(document.createTextNode(text));
  b.appendChild(s);
  d.appendChild(b);
  c.appendChild(d);

  if (keydown != null) {
    onKeyDown_[keydown] = b;
  }
  b.addEventListener('click', action, false);

  return c;
}


/**
 * Calls window.close() so this can be used as an event handler.
 * @private
 */
function closeWhenDone() {
  window.close();
}


/**
 * Checks whether a given event has any modifiers pressed.
 * @param {!Event} event The event received.
 * @return {boolean} Whether a modifier has been pressed.
 */
function hasModifiers(event) {
  return event.shiftKey || event.altKey || event.metaKey || event.ctrlKey;
}


/**
 * Handles click events on size buttons.
 * If a modifier is held, the current tab will be moved to the destination;
 * otherwise, the current window will.
 * @param {number} x The 0-based x index of the leftmost grid cell to occupy.
 * @param {number} y The 0-based y index of the topmost grid cell to occupy.
 * @param {number} w The target width in grid cells.
 * @param {number} h The target height in grid cells.
 * @param {!Event} event The click event.
 */
function sizeButtonClicked(x, y, w, h, event) {
  if (hasModifiers(event)) {
    virtualdesktops.client.extractCurrentTabToGrid(x, y, w, h, closeWhenDone);
  } else {
    virtualdesktops.client.moveCurrentWindowToGrid(x, y, w, h, closeWhenDone);
  }
}


/**
 * Adds a HTML button to a table row that will resize the current window.
 * @private
 * @param {!Element} r Table row to add to.
 * @param {string} text Text to display on the button.
 * @param {string} title Tooltip to display on the button.
 * @param {?string} keydown Special key to press to activate the button,
 *     followed by a space and the modifier status.
 * @param {number} x The 0-based x index of the leftmost grid cell to occupy.
 * @param {number} y The 0-based y index of the topmost grid cell to occupy.
 * @param {number} w The target width in grid cells.
 * @param {number} h The target height in grid cells.
 * @return {!Element} Table data cell containing the button.
 */
function createSizeButton(r, text, title, keydown, x, y, w, h) {
  var c = createButton(r, 'size', text, title, keydown,
                       sizeButtonClicked.bind(null, x, y, w, h));
  var b = c.querySelector('button');
  var lw = virtualdesktops.WINDOW_SIZE_BORDER *
      x / virtualdesktops.settings.getColumns();
  var tw = virtualdesktops.WINDOW_SIZE_BORDER *
      y / virtualdesktops.settings.getRows();
  var rw = virtualdesktops.WINDOW_SIZE_BORDER *
      (virtualdesktops.settings.getColumns() - w - x) /
      virtualdesktops.settings.getColumns();
  var bw = virtualdesktops.WINDOW_SIZE_BORDER *
      (virtualdesktops.settings.getRows() - h - y) /
      virtualdesktops.settings.getRows();
  b.style.paddingLeft = lw + 'px';
  b.style.paddingRight = rw + 'px';
  b.style.paddingTop = tw + 'px';
  b.style.paddingBottom = bw + 'px';
  c.style.width =
      (1.0 / mapGroupIndexCount(virtualdesktops.settings.getColumns())) + 'em';
  return c;
}


/**
 * Handles key down events.
 * @private
 * @param {Event} event onkeydown event.
 */
function gotKeyDown(event) {
  var b =
      onKeyDown_[event.keyCode + ' ' + hasModifiers(event)] ||
      onKeyDown_[event.keyCode.toString()];
  if (b != null) {
    var ev = new Event('click');
    ev.shiftKey = event.shiftKey;
    ev.altKey = event.altKey;
    ev.metaKey = event.metaKey;
    ev.ctrlKey = event.ctrlKey;
    b.dispatchEvent(ev);
  }
}


/**
 * Creates the button tables.
 * @private
 */
function createTables() {
  var container = document.body;
  if (virtualdesktops.settings.getRows() > 1 ||
      virtualdesktops.settings.getColumns() > 1) {
    var p = document.createElement('p');
    p.appendChild(document.createTextNode('Move/resize:'));
    container.appendChild(p);
    var t = document.createElement('table');

    var icount = mapGroupIndexCount(virtualdesktops.settings.getRows());
    var jcount = mapGroupIndexCount(virtualdesktops.settings.getColumns());

    for (var i = 0; i < icount; ++i) {
      var y = rowFor(i);
      var h = heightFor(i);
      var r = document.createElement('tr');
      for (var j = 0; j < jcount; ++j) {
        var x = columnFor(j);
        var w = widthFor(j);
        var text = w + 'x' + h + '+' + x + '+' + y;
        var keyCap = KEYCAP_BY_POS[i][j];
        var keyCode = KEYCODE_BY_POS[i][j];
        r.appendChild(createSizeButton(r, keyCap, text, keyCode, x, y, w, h));
      }

      t.appendChild(r);
    }
    container.appendChild(t);
  }

  if (virtualdesktops.settings.getDesktops() > 1) {
    var p = document.createElement('p');
    p.appendChild(document.createTextNode('Virtual desktops:'));
    container.appendChild(p);
    var t = document.createElement('table');
    var r = document.createElement('tr');
    r.appendChild(createButton(r, 'desktop', '<', 'Go to previous desktop',
        '37 false', virtualdesktops.client.switchToPreviousDesktop.bind(
            null, closeWhenDone)));
    r.appendChild(createButton(r, 'desktop', 'C-<', 'Send to previous desktop',
        '37 true', virtualdesktops.client.currentToPreviousDesktop.bind(
            null, closeWhenDone)));
    r.appendChild(createButton(r, 'desktop', 'C->', 'Send to next desktop',
        '39 true', virtualdesktops.client.currentToNextDesktop.bind(
            null, closeWhenDone)));
    r.appendChild(createButton(r, 'desktop', '>', 'Go to next desktop',
        '39 false', virtualdesktops.client.switchToNextDesktop.bind(
            null, closeWhenDone)));
    t.appendChild(r);
    container.appendChild(t);
  }

  container.addEventListener('keydown', gotKeyDown, true);
}

document.addEventListener('DOMContentLoaded', createTables);
