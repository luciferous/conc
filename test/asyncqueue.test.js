var assert = require("assert");
var asyncqueue = require("../src/asyncqueue");

require("../src/promise").patch(Promise.prototype);

test("offers then polls", function(done) {
  var q = asyncqueue();
  q.offer(1);
  q.offer(2);
  q.offer(3);
  Promise.all([q.poll(), q.poll(), q.poll()]).then(function(xyz) {
    assert.deepEqual([1, 2, 3], xyz);
  }).then(done, done);
});

test("polls then offers", function(done) {
  var q = asyncqueue();
  Promise.all([q.poll(), q.poll(), q.poll()]).then(function(xyz) {
    assert.deepEqual([1, 2, 3], xyz);
  }).then(done, done);
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
  q.fail(new Error("nope"));
  q.poll().catch(function(e) {
    assert.ok(exc === e);
    done();
  }).catch(done);
});

test("fail with discard", function(done) {
  var q = asyncqueue();
  var exc = new Error("boo");
  q.offer(1);
  q.offer(2);
  q.fail(exc, true);
  var p = q.poll();
  p.lift().then(function(value) {
    assert.equal(exc, value.rejected);
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

test("poll/offer queue lengths", function(done) {
  var q = asyncqueue();
  assert.equal(0, q.size());

  q.offer('hey');
  q.offer('there');
  assert.equal(2, q.size());

  q.poll().then(function() {
    assert.equal(1, q.size());
    return q.poll().then(function() {
      assert.equal(0, q.size());
      q.poll();
      q.poll();
      assert.equal(-2, q.size());
    });
  }).then(done);
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
