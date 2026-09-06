import { assert } from 'chai';
import sinon from 'sinon';
import { EventEmitter } from 'node:events';
import http from 'node:http';
import https from 'node:https';
import FetchFacade from '../../src/lib/utils/fetchFacade.js';

class FakeRequest extends EventEmitter {
    constructor() {
        super();
        this.write = sinon.stub();
        this.end = sinon.stub();
    }
}

class FakeResponse extends EventEmitter {
    constructor(statusCode) {
        super();
        this.statusCode = statusCode;
    }
}

/**
 * Stubs the given lib's request function to invoke the response callback
 * asynchronously with a fake response, and returns the fake request so
 * tests can assert on write/end calls or emit additional events (e.g. error).
 */
function stubRequest(lib, statusCode, body) {
    const fakeReq = new FakeRequest();
    const stub = sinon.stub(lib, 'request').callsFake((_url, _init, callback) => {
        process.nextTick(() => {
            const fakeRes = new FakeResponse(statusCode);
            callback(fakeRes);
            fakeRes.emit('data', body);
            fakeRes.emit('end');
        });
        return fakeReq;
    });
    return { stub, fakeReq };
}

describe('UNIT FetchFacade', () => {
    afterEach(() => sinon.restore());

    it('should use http module and resolve status/json when url starts with http', async () => {
        const { stub: httpStub, fakeReq } = stubRequest(http, 200, '{"result":true}');
        const httpsStub = sinon.stub(https, 'request');

        const response = await FetchFacade.fetch('http://localhost/api', { method: 'get' });

        assert.isTrue(httpStub.calledOnce);
        assert.isFalse(httpsStub.called);
        assert.equal(response.status, 200);
        assert.deepEqual(response.json(), { result: true });
        assert.isTrue(fakeReq.end.calledOnce);
    });

    it('should use https module when url starts with https', async () => {
        const httpStub = sinon.stub(http, 'request');
        const { stub: httpsStub } = stubRequest(https, 200, '{"result":true}');

        const response = await FetchFacade.fetch('https://localhost/api', { method: 'get' });

        assert.isTrue(httpsStub.calledOnce);
        assert.isFalse(httpStub.called);
        assert.equal(response.status, 200);
    });

    it('should write the request body when init.body is present', async () => {
        const { fakeReq } = stubRequest(http, 200, '{}');

        await FetchFacade.fetch('http://localhost/api', { method: 'post', body: 'payload' });

        assert.isTrue(fakeReq.write.calledOnceWith('payload'));
        assert.isTrue(fakeReq.end.calledOnce);
    });

    it('should not write a body when init.body is absent', async () => {
        const { fakeReq } = stubRequest(http, 200, '{}');

        await FetchFacade.fetch('http://localhost/api', { method: 'get' });

        assert.isFalse(fakeReq.write.called);
        assert.isTrue(fakeReq.end.calledOnce);
    });

    it('should resolve with non-200 status codes and parsed body', async () => {
        stubRequest(http, 404, '{"error":"not found"}');

        const response = await FetchFacade.fetch('http://localhost/api', { method: 'get' });

        assert.equal(response.status, 404);
        assert.deepEqual(response.json(), { error: 'not found' });
    });

    it('should reject when the request emits an error', async () => {
        const fakeReq = new FakeRequest();
        sinon.stub(http, 'request').callsFake(() => {
            process.nextTick(() => fakeReq.emit('error', new Error('connection refused')));
            return fakeReq;
        });

        try {
            await FetchFacade.fetch('http://localhost/api', { method: 'get' });
            assert.fail('expected fetch to reject');
        } catch (e) {
            assert.equal(e.message, 'connection refused');
        }
    });
});
