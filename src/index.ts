import iterable from '@async-generators/iterable';
import * as EventEmitter from 'events';

export default async function* <T, R=T>(
  source: AsyncIterable<T> | Iterable<T>,
  selector: (value: T, index: number) => Promise<R> | R,
  limit: number = 3,
  limited: (item:T, index: number) => boolean | void = undefined,
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
        concurrent++;
        let $selector: any = selector(item, index);

        if ($selector instanceof Promise === false) {
          $selector = Promise.resolve(selector);
        }

        $selector.catch(x)
          .then((result) => {
            concurrent--;
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