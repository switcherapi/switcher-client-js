function given(fetchStub, order, expect) {
  fetchStub.onCall(order).returns(Promise.resolve(expect));
}

function givenError(fetchStub, order, expect) {
  fetchStub.onCall(order).throws(expect);
}

function throws(fetchStub, expect) {
  fetchStub.throws(expect);
}

const generateAuth = (token, seconds) => {
  return {
    token,
    exp: (Date.now() + (seconds * 1000)) / 1000
  };
};

const generateStatus = (status) => {
  return {
    status
  };
};

const generateResult = (result) => {
  return {
    result
  };
};

module.exports = {
  given,
  givenError,
  throws,
  generateAuth,
  generateStatus,
  generateResult
};