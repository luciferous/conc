export const name = "asyncqueue";

export interface AsyncQueue<T> {
  size(): number
  poll(): Promise<T>
  offer(t: T): boolean
  fail(cause: Error, discard: boolean): void
}

interface Callback<T> {
  resolve(t: T): void
  fail(e: Error): void
}

interface IPolling<T> { kind: "polling", promises: Callback<T>[] }
interface IOffering<T> { kind: "offering", items: T[] }
interface IFailing<T> { kind: "failing", cause: Error, items: T[] }
interface IIdle<T> { kind: "idle" }

type State<T> = IPolling<T> | IOffering<T> | IFailing<T> | IIdle<T>

/**
 * An buffered FIFO queue brokered by Promises.
 */
export default function asyncqueue<T>(): AsyncQueue<T> {
  let state: State<T> = { kind: "idle" };

  return {
    /**
     * The number of items in the queue: when Offering, the size is positive;
     * when Polling, the size is negative.
     */
    size(): number {
      switch (state.kind) {
      case "polling": return 0 - state.promises.length;
      case "offering": return state.items.length;
      default: return 0;
      }
    },
    /**
     * Demand an item from the front of the queue, potentially waiting if the
     * queue is empty.
     */
    poll(): Promise<T> {
      switch (state.kind) {
      case "failing":
        if (state.items.length == 0) {
          return Promise.reject(state.cause);
        } else {
          var item = state.items.shift();
          return Promise.resolve(item);
        }
      case "idle":
        return new Promise(function(resolve, fail) {
          state = { kind: "polling", promises: [{ resolve: resolve, fail: fail }] }
        });
      case "polling":
        return new Promise(function(resolve, fail) {
          Polling.promises.push({ resolve: resolve, fail: fail });
        })
      case "offering":
        var item = state.items.shift();
        if (state.items.length == 0) state = Idle;
        return Promise.resolve(item);
      }
    },
    /**
     * Add an item to the queue back of the queue.
     *
     * @param {*} item the item to add to the queue.
     */
    offer(item: T): boolean {
      switch (state.kind) {
      case "failing":
        // Drop.
        return false;
      case "idle":
        state = { kind: "offering", items: [item] };
        return true;
      case "polling":
        var promise = state.promises.shift();
        if (state.promises.length == 0) state = Idle;
        promise.resolve(item);
        return true;
      case "offering":
        state.items.push(item)
        return true;
      }
      return true;
    },
    /**
     * Fail the queue. Subsequent fails and offers are ignored. Subsequent
     * polls return failure, unless there were items in the queue, then
     * `discard` determines whether or not they remain available.
     *
     * @param {Error} cause the exception.
     * @param {boolean} discard if true, subsequent polls return failure.
     */
    fail(cause: Error, discard: boolean): void {
      switch (state.kind) {
      case "failing":
        // First failure is authoritative.
        break;
      case "polling":
        Failing.cause = cause;
        state = Failing;
        while (Polling.promises.length > 0) {
          try { Polling.promises.shift().fail(cause) } catch (e) { }
        }
        break;
      case "idle":
        state = {kind: "failing", cause: cause, items: []};
        break;
      case "offering":
        let newState: Failing<T> = {
          kind: "failing",
          cause: cause,
          items: (!discard) ? state.items : []
        };
        state = newState;
        break;
      }
    }
  };
}
