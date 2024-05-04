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

export async function assertUntil(assert, actual, expected, timeout) {
  const start = Date.now();
  while (!actual()) {
    if (Date.now() - start > timeout) {
      assert.fail('Timeout');
    }
    await sleep(10);
  }

  assert.equal(expected, actual());
}

export async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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