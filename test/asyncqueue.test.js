var assert = require("assert");
var asyncqueue = require("../src/asyncqueue");

require("../src/promise").patch(Promise.prototype);

test("offers then polls", function(done) {
  var q = asyncqueue();
  q.offer(1);
  q.offer(2);
  q.offer(3);
  q.poll().then(function(x) {
  q.poll().then(function(y) {
  q.poll().then(function(z) {
    assert(1, x);
    assert(2, y);
    assert(3, z);
    done();
  })})});
});

test("polls then offers", function(done) {
  var q = asyncqueue();
  q.poll().then(function(x) {
  q.poll().then(function(y) {
  q.poll().then(function(z) {
    assert(1, x);
    assert(2, y);
    assert(3, z);
    done();
  })})});
  setTimeout(function() {
    q.offer(1);
    q.offer(2);
    q.offer(3);
  }, 10);
});

test("failure then poll", function(done) {
  var q = asyncqueue();
  var exc = new Error("boo");
  q.fail(exc);
  q.poll().then(
    function() { done(Error("not ok")) },
    function(e) {
      assert.equal(exc, e);
      done();
    }
  );
});

test("first failure", function(done) {
  var q = asyncqueue();
  var exc = new Error("boo");
  q.fail(exc);
  q.fail(new Error("nope"));
  q.poll().then(
    function() { done(Error("not ok")) },
    function(e) {
      assert.ok(exc === e);
      done();
    }
  );
});

test("fail with discard", function(done) {
  var q = asyncqueue();
  q.offer(1);
  q.offer(2);
  q.fail(new Error(), true);
  var p = q.poll();
  p.lift().then(function(value) {
    assert.ok(value.rejected);
  }).then(done, done);
});

test("fail without discard", function(done) {
  var q = asyncqueue();
  var exc = new Error("boo");
  q.offer(1);
  q.offer(2);
  q.fail(exc, false);
  var all = Promise.all([q.poll().lift(), q.poll().lift(), q.poll().lift()]);
  all.then(function(values) {
    assert.deepEqual({ resolved: 1 }, values[0]);
    assert.deepEqual({ resolved: 2 }, values[1]);
    assert.deepEqual({ rejected: exc }, values[2]);
  }).then(done, done);
});

function test(name, go) {
  var done = false;
  var error;

  go(function(e) {
    done = true;
    error = e;
  });

  setTimeout(function() {
    try {
      assert.ok(done);
      assert.equal(undefined, error);
      console.log("[ok]", "\t", name);
    } catch(e) {
      console.log("[fail]", "\t", name);
      if (e) console.log(e.stack);
    }
  }, 500);
}
