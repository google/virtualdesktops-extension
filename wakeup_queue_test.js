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
 * @fileoverview Unit test for WakeupQueue.
 * @package
 */
goog.setTestOnly();

goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.jsunit');
goog.require('virtualdesktops.WakeupQueue');


// This variable is initialized and explained at the bottom of this file.
var asyncTestCase;


/**
 * Tests that the WakeupQueue has the following semantics:
 * 1) If the queue is idle, the closures are executed instantly.
 * 2) The closures run in the exact order of add() calls.
 *    As a corollary, only one of its closures run at the same time.
 */
function testWakeupQueue() {
  var q = new virtualdesktops.WakeupQueue();

  var aDone = false;
  var bDone = false;
  var cDone = false;

  // 1) Test immediate execution.
  assertTrue(q.isIdle());
  q.add(function(finished) {
    aDone = true;
    finished();
  });
  assertTrue(aDone);
  assertTrue(q.isIdle());

  // Test asynchronous execution;
  q.add(function(finished) {
    setTimeout(function() {
      bDone = true;
      finished();

      asyncTestCase.waitForAsync('200ms till c starts');
    }, 200);
  });
  assertFalse(bDone);
  assertFalse(q.isIdle());

  q.add(function(finished) {
    // 2) This verifies that this 'c' function can only run once 'b' is done.
    assertTrue(bDone);
    setTimeout(function() {
      cDone = true;
      finished();
      assertTrue(q.isIdle());

      asyncTestCase.continueTesting();
    }, 100);
  });
  assertFalse(cDone);
  assertFalse(q.isIdle());

  asyncTestCase.waitForAsync('200ms till b starts');
}


// This must be done at the end so compiled unit tests can work, as this
// triggers enumeration of all test* functions which are created using this
// compiled JSCompiler code:
// goog.exportSymbol("testXXX", function testXXX() { ... });
// This makes the function available only AFTER its declaration, according to
// ECMA-262 10.1.3.
asyncTestCase = goog.testing.AsyncTestCase.createAndInstall();
