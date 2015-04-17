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


goog.provide('virtualdesktops.WakeupQueue');



/**
 * A WakeupQueue manages a queue of asynchronous closures to execute in
 * sequence. Each closure is passed a callback it must call when done, which
 * will in turn execute the next item of the queue.
 *
 * Example usage:
 *   var q = new WakeupQueue();
 *   q.add(function(finished) {
 *     someAsyncFunction(..., finished);
 *   });
 *   q.add(function(finished) {
 *     moreAsyncStuff(..., finished);
 *   });
 *
 * This will ensure that moreAsyncStuff gets called only once someAsyncFunction
 * has completed.
 *
 * @constructor
 */
virtualdesktops.WakeupQueue = function() {
  /**
   * The queue of closures to wake up.
   * The currently running closure (if any) is the first element of this array.
   * @private {!Array<function(function())>}
   */
  this.queue_ = [];
};


/**
 * @private
 */
virtualdesktops.WakeupQueue.prototype.wakeupFirst_ = function() {
  if (this.queue_.length > 0) {
    this.queue_[0](this.wakeupNext_.bind(this));
  }
};


/**
 * @private
 */
virtualdesktops.WakeupQueue.prototype.wakeupNext_ = function() {
  this.queue_.shift();
  this.wakeupFirst_();
};


/**
 * Adds a function to a wakeup queue. If the queue is currently idle, the
 * function will be called immediately.
 * @param {function(function())} func The function to enqueue. Must call its
 *     argument when finished.
 */
virtualdesktops.WakeupQueue.prototype.add = function(func) {
  this.queue_.push(func);
  if (this.queue_.length == 1) {
    this.wakeupFirst_();
  }
};


/**
 * Returns true if the wakeup queue is currently idle.
 * @return {boolean} Idle status of the queue.
 */
virtualdesktops.WakeupQueue.prototype.isIdle = function() {
  return this.queue_.length == 0;
};
