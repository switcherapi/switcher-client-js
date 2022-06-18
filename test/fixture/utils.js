function given(fetchStub, order, expect) {
    fetchStub.onCall(order).returns(Promise.resolve(expect));
}

function givenError(fetchStub, order, expect) {
    fetchStub.onCall(order).throws(expect);
}

function throws(fetchStub, expect) {
    fetchStub.throws(expect);
}

module.exports = {
    given,
    givenError,
    throws
};