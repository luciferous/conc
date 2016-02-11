"use strict";

/**
 * Patch Promise prototype. Usage: patch(Promise.prototype).
 */
function patch(proto) {
  /**
   * Invoked whether or not the promise was resolved or rejected.
   *
   * Note: it is possible for f to override the value of the promise if it
   * throws an exception.
   */
  proto.finally = function(f) {
    return this.then(
      function(value) { f(); return value },
      function(error) { f(); throw error });
  };

  proto.lift = function() {
    return this.then(
      function(value) { return { resolved: value } },
      function(error) { return { rejected: error } });
  };
}

exports.patch = patch;
