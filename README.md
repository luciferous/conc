Concurrency utilities for Javascript.

## asyncqueue

`asyncqueue` is an asynchronous FIFO queue brokered by `Promise`s.
Feed the queue with `offer(item)`, and retrieve it with `poll()`.
Because poll may be called on an empty queue, the returned
`Promise` provides a way to suspend the poll until a rendezvous
with the next call to offer.

To illustrate its power and simplicity, below is an implementation
of a resource pool. We use the pool by passing it a closure, to
which the resource is applied, afterwards the resource goes back
into the pool, e.g.:

```javascript
// Initialize the pool with a capacity and an action that creates
// a new resource.
var withResource = createPool(10, () => new DbConnection);
// Pass `withResource` into some other part of the application
withResource(conn => conn.sql('SELECT ...')).then(result => {
  // ...Read the result...
});
```

The implementation of `createPool`.

```javascript
var asyncqueue = require('conc').asyncqueue;
function createPool(cap, newResource) {
  var queue = asyncqueue();
  for (var i = 0; i < cap; i++) queue.offer(newResource());
  return function(perform) {
    // Retrieve a resource from the pool.
    return queue.poll().then(resource =>
      // Perform an action with the resource.
      perform(resource).finally(() =>
        // Finally, return the resource to the pool.
        queue.offer(resource)));
  };
}
```
