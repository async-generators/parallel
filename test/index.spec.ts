import equal from '@async-generators/equal';
import parallel from '../src';
import { expect } from 'chai';

function delay(item: number, durations: number[]) {
  return new Promise(r => setTimeout(r, durations[item % durations.length]));
}

export async function toArray<T>(
  source: AsyncIterable<T>
): Promise<T[]> {
  let items: T[] = [];
  for await (const item of source) items.push(item);
  return items;
}

describe("@async-generator/parallel", () => {
  it("should yield nothing and complete with empty source", async () => {
    let source = async function* () { }
    expect(
      await equal(
        parallel(source(), (x) => x),
        [])
    ).to.be.true;
  });

  it("should rethrow if selector throws error", async () => {
    let source = [1]
    let error: Error;
    try {
      await equal(
        parallel(source, (x) => { throw Error("pickle rick!") }),
        []);
    } catch (err) { error = err }

    expect(error.message).to.be.eq("pickle rick!");
  });

  it("should yield source in order when no delay", async () => {
    let source = async function* () {
      yield 1; yield 2; yield 3;
    }

    expect(
      await equal(
        parallel(source(), (x) => x),
        [1, 2, 3])
    ).to.be.true;
  })

  it("should yield source in expected delayed order", async () => {
    let source = async function* () {
      yield 0; yield 1; yield 2; yield 3;
    }
    let delays = [50, 0, 25, 100];
    let expected = [1, 2, 0, 3];
    let result = parallel(source(), async (value) => {
      await delay(value, delays);
      return value;
    }, 10);

    expect(await equal(expected, result)).to.be.true;
  }).timeout(500)

  it("should yield source in original order when limit:1", async () => {
    let source = async function* () {
      yield 0; yield 1; yield 2; yield 3;
    }
    let delays = [50, 0, 25, 100];
    let expected = source();
    let result = parallel(source(), async (value) => {
      await delay(value, delays);
      return value;
    }, 1, (index) => false);

    expect(await equal(expected, result)).to.be.true;
  }).timeout(500)

  it("should not execute when limited and limit method returns true", async () => {
    let source = async function* () {
      yield 0; yield 1; yield 2; yield 3;
    }
    let delays = [50, 0, 25, 100];
    let expected = [1, 0]
    let result = parallel(source(), async (value) => {
      await delay(value, delays);
      return value;
    }, 2, (index) => true);

    expect(await equal(expected, result)).to.be.true;
  }).timeout(500)

  it("should yield all items in any order", async () => {
    let source = async function* () {
      for (let i = 0; i < 1000; i++) {
        yield 0; yield 1; yield 2; yield 3;
      }
    }
    let delays = [50, 0, 25, 100];
    let expected = (await toArray(source())).sort();
    let result =
      (await toArray(parallel(source(), async (value) => {
        await delay(value, delays);
        return value;
      }, 50))).sort();

    expect(await equal(expected, result)).to.be.true;
  }).timeout(5000)
})
