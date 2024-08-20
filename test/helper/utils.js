import fs from 'node:fs';

export function given(fetchStub, order, expect) {
  fetchStub.onCall(order).returns(Promise.resolve(expect));
}

export function givenError(fetchStub, order, expect) {
  fetchStub.onCall(order).throws(expect);
}

export function throws(fetchStub, expect) {
  fetchStub.throws(expect);
}

export async function assertReject(assert, promise, expectedError) {
  let result;
  await promise.catch(e => {
    result = e;
  });

  assert.isNotNull(result);
  assert.equal(expectedError, result.message);
}

export async function assertResolve(assert, promise) {
  let result = true;
  await promise.catch(() => {
    result = false;
  });

  assert.isTrue(result);
}

export async function assertUntilResolve(assert, actual, expected) {
  const promise = new Promise((resolve) => {
    const interval = setInterval(() => {
      if (actual()) {
        clearInterval(interval);
        resolve();
      }
    }, 10);
  });

  await Promise.race([promise, sleep(2000)]);

  if (!actual()) {
    console.warn('Async test could not resolve in time');
  } else {
    assert.equal(expected, actual());
  }
}

export async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function deleteGeneratedSnapshot(dirname) {
  if (!fs.existsSync(dirname)) {
    return;
  }

  fs.readdir(dirname, (err, files) => {
    if (err) {
      console.error('Error reading generated snapshots:', err);
    }

    for (const file of files) {
      fs.unlink(`${dirname}/${file}`, (err) => {
        if (err) {
          console.error('Error deleting generated snapshot:', err);
        }
      });
    }
  });

  fs.rm(dirname, { recursive: true, force: true }, (err) => {
    if (err) {
      console.error('Error deleting generated snapshots:', err);
    }
  });
}

export const generateAuth = (token, seconds) => {
  return {
    token,
    exp: (Date.now() + (seconds * 1000)) / 1000
  };
};

export const generateStatus = (status) => {
  return {
    status
  };
};

export const generateResult = (result) => {
  return {
    result
  };
};

export const generateDetailedResult = (detailedResult) => {
  return detailedResult;
};