import parallel from './src';

async function* source() {
  yield 1; yield 2; yield 3; yield 4;
}

function delay(item) {
  let duration = {
    1: 500,
    2: 200,
    3: 1000,
    4: 700
  }
  return new Promise(r => setTimeout(r, duration[item ]));
}

async function main() {
  for await (let item of
    parallel(source(), async (value) => {
      await delay(value);
      return value;
    })
  ) {
    console.log(item);
  }
}

main();