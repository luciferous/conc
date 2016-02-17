"use strict";

/**
 * An buffered FIFO queue brokered by Promises.
 */
function asyncqueue() {
  var Polling = { promises: [] },
      Offering = { items: [] },
      Failing = { cause: null, items: [] },
      Idle = {};

  var state = Idle;

  return {
    /**
     * The number of items in the queue: when Offering, the size is positive;
     * when Polling, the size is negative.
     */
    size: function() {
      switch (state) {
      case Polling: return 0 - Polling.promises.length;
      case Offering: return Offering.items.length;
      default: return 0;
      }
    },
    /**
     * Demand an item from the front of the queue, potentially waiting if the
     * queue is empty.
     */
    poll: function() {
      switch (state) {
      case Failing:
        if (Failing.items.length == 0) {
          return Promise.reject(Failing.cause);
        } else {
          var item = Failing.items.shift();
          return Promise.resolve(item);
        }
      case Idle:
        return new Promise(function(resolve, fail) {
          Polling.promises.push({ resolve: resolve, fail: fail });
          state = Polling;
        })
      case Polling:
        return new Promise(function(resolve, fail) {
          Polling.promises.push({ resolve: resolve, fail: fail });
        })
      case Offering:
        var item = Offering.items.shift();
        if (Offering.items.length == 0) state = Idle;
        return Promise.resolve(item);
      }
    },
    /**
     * Add an item to the queue back of the queue.
     *
     * @param {*} item the item to add to the queue.
     */
    offer: function(item) {
      switch (state) {
      case Failing:
        // Drop.
        return false;
      case Idle:
        Offering.items.push(item);
        state = Offering;
        return true;
      case Polling:
        var promise = Polling.promises.shift();
        if (Polling.promises.length == 0) state = Idle;
        promise.resolve(item);
        return true;
      case Offering:
        Offering.items.push(item)
        return true;
      }
    },
    /**
     * Fail the queue. Subsequent fails and offers are ignored. Subsequent
     * polls return failure, unless there were items in the queue, then
     * `discard` determines whether or not they remain available.
     *
     * @param {Error} cause the exception.
     * @param {boolean} discard if true, subsequent polls return failure.
     */
    fail: function(cause, discard) {
      switch (state) {
      case Failing:
        // First failure is authoritative.
        break;
      case Polling:
        Failing.cause = cause;
        state = Failing;
        while (Polling.promises.length > 0) {
          try { Polling.promises.shift().fail(cause) } catch (e) { }
        }
        break;
      case Idle:
        Failing.cause = cause;
        state = Failing;
        break;
      case Offering:
        Failing.cause = cause;
        state = Failing;
        if (!discard) Failing.items = Offering.items;
        break;
      }
    }
  }
}

module.exports = asyncqueue;
