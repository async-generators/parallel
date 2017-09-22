import iterable from '@async-generators/iterable';
import * as EventEmitter from 'events';

async function* parallel<T, R=T>(
  source: AsyncIterable<T> | Iterable<T>,
  selector: (value: T, index: number) => Promise<R> | R,
  limit: number,
  limited: (item: T, index: number) => boolean | void,
): AsyncIterable<R> {
  let it = iterable(source);
  let index = 0;
  let concurrent = 0;
  let consumed = 0;
  let consumedAll = false;
  let results = [];
  let signal = new EventEmitter();
  let consumer = new Promise(async (r, x) => {
    try {
      for await (const item of it) {
        index++;
        if (concurrent >= limit) {
          if (limited && limited(item, index)) continue;
          await new Promise(_ => { signal.once("next", _); })
        }
        consumed += 1;
        concurrent += 1;;
        let $selector: any = selector(item, index);

        if ($selector instanceof Promise === false) {
          $selector = Promise.resolve(selector);
        }

        $selector.catch(x)
          .then((result) => {
            concurrent -= 1;
            results.push(item);
            signal.emit("next");
          });
      }
    }
    catch (err) { x(err); }
    consumedAll = true;
    r();
  });
  let produced = 0;
  do {
    if (consumedAll) {
      await new Promise(_ => { signal.once("next", _); })
    } else {
      await Promise.race([
        new Promise(_ => { signal.once("next", _); }),
        consumer]);
    }
    if (results.length == 0 && consumed == 0) {
      break;
    }
    while (results.length > 0) {
      let foo = results.shift();
      produced += 1;
      yield foo;
    }
  } while (produced < consumed);
  await consumer;
}


export default function <T, R>(
  source: AsyncIterable<T> | Iterable<T>,
  selector: (value: T, index: number) => Promise<R> | R,
  limit: number,
  limited: (item: T, index: number) => boolean | void,
): AsyncIterable<R>
export default function <T, R>(
  source: AsyncIterable<T> | Iterable<T>,
  selector: (value: T, index: number) => Promise<R> | R,
  limit: number
): AsyncIterable<R>
export default function <T, R>(
  source: AsyncIterable<T> | Iterable<T>,
  selector: (value: T, index: number) => Promise<R> | R
): AsyncIterable<R>
export default function <T>(
  source: AsyncIterable<Promise<T>> | Iterable<Promise<T>>,
): AsyncIterable<T>
export default function <T>(
  source: AsyncIterable<Promise<T>> | Iterable<Promise<T>>,
  limit: number
): AsyncIterable<T>
export default function <T, R=T>(
  source: AsyncIterable<Promise<T>> | Iterable<Promise<T>>,
  selector?: any,
  limit?: any,
  limited?: any,
): AsyncIterable<R> {

  if (typeof selector == "number") {
    limited = limit;
    limit = selector;
    selector = async (x) => await x;
  } else if (typeof selector == "undefined") {
    selector = async (x) => await x;
  }

  if (limit === undefined) {
    limit = 20;
  }

  return parallel(source, selector, limit, limited)
}