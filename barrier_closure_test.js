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
 * @fileoverview Unit test for BarrierClosure.
 * @package
 */
goog.setTestOnly();

goog.require('goog.testing.AsyncTestCase');
goog.require('goog.testing.jsunit');
goog.require('virtualdesktops.BarrierClosure');


// This variable is initialized and explained at the bottom of this file.
var asyncTestCase;


/**
 * Tests whether BarrierClosure properly calls its 'then' closure when all 'get'
 * closures have been called.
 *
 * This test tests this property synchronously to verify the call to the 'then'
 * closure happens instantly from the last call to a 'get' closure.
 */
function testBarrierClosureCountsSync() {
  var c = new virtualdesktops.BarrierClosure();
  var f1 = c.get();
  var f2 = c.get();
  c.finalize();
  var f1Done = false;
  var f2Done = false;
  var hit = false;

  c.then(function() {
    assertFalse(hit);
    hit = true;
    assertTrue(f1Done);
    assertTrue(f2Done);
  });
  assertFalse(hit);

  f1Done = true;
  f1();

  assertFalse(hit);

  f2Done = true;
  f2();

  assertTrue(hit);
}


/**
 * Tests whether BarrierClosure properly calls its 'then' closure when all 'get'
 * closures have been called.
 *
 * This test tests this property asynchronously to verify the call to the 'then'
 * don't happen before the last call to a 'get' closure.
 */
function testBarrierClosureCountsAsync() {
  var c = new virtualdesktops.BarrierClosure();
  var f1Done = false;
  var f2Done = false;
  var hit = false;

  setTimeout(function() {
    var f1 = c.get();
    var f2 = c.get();
    c.finalize();

    setTimeout(function() {
      assertFalse(hit);
      f1Done = true;
      f1();

      asyncTestCase.waitForAsync('f2 (100ms)');
    }, 200);
    setTimeout(function() {
      assertFalse(hit);
      f2Done = true;
      f2();  // Will instantly call the 'then' closure!
    }, 300);

    asyncTestCase.waitForAsync('f1 (200ms)');
  }, 200);

  c.then(function() {
    assertFalse(hit);
    hit = true;
    assertTrue(f1Done);
    assertTrue(f2Done);

    asyncTestCase.waitForAsync('finishing (300ms)');
  });
  assertFalse(hit);

  setTimeout(function() {
    assertTrue(hit);

    asyncTestCase.continueTesting();
  }, 700);

  asyncTestCase.waitForAsync('initializing (200ms)');
}


// This must be done at the end so compiled unit tests can work, as this
// triggers enumeration of all test* functions which are created using this
// compiled JSCompiler code:
// goog.exportSymbol("testXXX", function testXXX() { ... });
// This makes the function available only AFTER its declaration, according to
// ECMA-262 10.1.3.
asyncTestCase = goog.testing.AsyncTestCase.createAndInstall();
