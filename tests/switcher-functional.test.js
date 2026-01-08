import { assert } from 'chai';
import { stub, spy } from 'sinon';
import { unwatchFile } from 'node:fs';

import FetchFacade from '../src/lib/utils/fetchFacade.js';
import ExecutionLogger from '../src/lib/utils/executionLogger.js';
import { Client } from '../switcher-client.js';
import { given, givenError, throws, generateAuth, generateResult, assertReject, 
  assertResolve, generateDetailedResult, sleep, assertUntilResolve } from './helper/utils.js';

describe('Integrated test - Switcher:', function () {

  let contextSettings;

  this.afterAll(function() {
    unwatchFile('./tests/snapshot/default.json');
  });

  this.beforeEach(function() {
    Client.testMode();

    contextSettings = {
      apiKey: '[api_key]',
      domain: 'Business',
      component: 'business-service',
      environment: 'default',
      url: 'http://localhost:3000'
    };
  });

  describe('check criteria (e2e):', function () {

    let fetchStub;

    beforeEach(function() {
      fetchStub = stub(FetchFacade, 'fetch');
      ExecutionLogger.clearLogger();
    });
  
    afterEach(function() {
      fetchStub.restore();
    });

    it('should be valid', async function () {
      // given API responses
      given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });
      given(fetchStub, 1, { json: () => generateResult(true), status: 200 });

      // test
      Client.buildContext(contextSettings);
      let switcher = Client.getSwitcher();
      
      await switcher.prepare('FLAG_1');
      assert.isTrue(await switcher.isItOn());
    });

    it('should be valid - using persisted switcher key', async function () {
      // given API responses
      given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });
      given(fetchStub, 1, { json: () => generateResult(true), status: 200 });

      // test
      Client.buildContext(contextSettings);
      
      // Get switcher multiple times with the same key
      const switcher1 = Client.getSwitcher('MY_PERSISTED_SWITCHER_KEY');
      const switcher2 = Client.getSwitcher('MY_PERSISTED_SWITCHER_KEY');
      const differentSwitcher = Client.getSwitcher('DIFFERENT_KEY');

      // Verify they are the same instance (persisted)
      assert.strictEqual(switcher1, switcher2, 'Switcher instances should be the same (persisted)');
      assert.notStrictEqual(switcher1, differentSwitcher, 'Different keys should create different instances');
      assert.isTrue(await switcher1.isItOn());
    });

    it('should NOT throw error when default result is provided using remote', async function () {
      // given API responses
      given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });
      given(fetchStub, 1, { error: 'ERROR', status: 404 });

      // test
      let asyncErrorMessage = null;
      Client.buildContext(contextSettings);
      Client.subscribeNotifyError((error) => asyncErrorMessage = error.message);
      let switcher = Client.getSwitcher().defaultResult(true);

      assert.isTrue(await switcher.isItOn('UNKNOWN_FEATURE'));
      assert.equal(asyncErrorMessage, 'Something went wrong: [checkCriteria] failed with status 404');
    });

    it('should NOT be valid - API returned 429 (too many requests)', async function () {
      // given API responses
      given(fetchStub, 0, { error: 'Too many requests', status: 429 });

      // test
      Client.buildContext(contextSettings);
      let switcher = Client.getSwitcher();
      
      await assertReject(assert, switcher.isItOn('FLAG_1'), 'Something went wrong: [auth] failed with status 429');
    });

    it('should be valid - throttle', async function () {
      this.timeout(2000);

      // given API responses
      // first API call
      given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });
      given(fetchStub, 1, { json: () => generateResult(true), status: 200 }); // sync
      given(fetchStub, 2, { json: () => generateResult(true), status: 200 }); // async

      // test
      Client.buildContext(contextSettings);
      let switcher = Client.getSwitcher();
      switcher.throttle(1000);

      const spyExecutionLogger = spy(ExecutionLogger, 'add');

      assert.isTrue(await switcher.isItOn('FLAG_1')); // sync
      assert.isTrue(await switcher.isItOn('FLAG_1')); // async
      await sleep(500); // wait resolve async Promise

      assert.equal(spyExecutionLogger.callCount, 1);
    });

    it('should be valid - throttle - with details', async function () {
      this.timeout(3000);

      // given API responses
      // first API call
      given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });
      given(fetchStub, 1, { json: () => generateResult(true), status: 200 }); // sync
      given(fetchStub, 2, { json: () => generateResult(true), status: 200 }); // async

      // test
      Client.buildContext(contextSettings);

      let switcher = Client.getSwitcher();
      switcher.throttle(1000);

      // first API call - stores result in cache
      await switcher.isItOn('FLAG_2');

      // first async API call
      const response = await switcher.detail().isItOn('FLAG_2');
      assert.isTrue(response.result);
    });

    it('should renew token when using throttle', async function () {
      this.timeout(3000);

      // given API responses
      // first API call
      given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 1), status: 200 });
      given(fetchStub, 1, { json: () => generateResult(true), status: 200 }); // sync
      
      // test
      Client.buildContext(contextSettings);
      
      const switcher = Client.getSwitcher()
        .throttle(500)
        .detail();
      
      const spyPrepare = spy(switcher, 'prepare');
      
      // 1st - calls remote API and stores result in cache
      let isItOn = await switcher.isItOn('FLAG_3');
      assert.isTrue(isItOn.result);
      assert.isUndefined(isItOn.metadata);
      assert.equal(spyPrepare.callCount, 1);
      
      // 2nd - uses cached result
      isItOn = await switcher.isItOn('FLAG_3');
      assert.isTrue(isItOn.result);
      assert.isTrue(isItOn.metadata.cached);
      assert.equal(spyPrepare.callCount, 1);
      
      // should call the remote API - token has expired
      await sleep(2000);
      
      // given
      given(fetchStub, 2, { json: () => generateAuth('[auth_token]', 5), status: 200 });
      given(fetchStub, 3, { json: () => generateResult(false), status: 200 }); // after token expires

      // 3rd - use cached result, asynchronous renew token and stores new result in cache
      isItOn = await switcher.isItOn('FLAG_3');
      assert.isTrue(isItOn.result);
      assert.equal(spyPrepare.callCount, 2);
      
      // 4th - uses cached result
      await sleep(50);
      isItOn = await switcher.isItOn('FLAG_3');
      assert.isFalse(isItOn.result);
      assert.equal(spyPrepare.callCount, 2);
    });

    it('should not crash when async checkCriteria fails', async function () {
      this.timeout(5000);

      // given API responses
      // first API call
      given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });
      given(fetchStub, 1, { json: () => generateResult(true), status: 200 }); // before token expires

      // test
      let asyncErrorMessage = null;
      Client.buildContext(contextSettings);
      Client.subscribeNotifyError((error) => asyncErrorMessage = error.message);

      const switcher = Client.getSwitcher();
      switcher.throttle(1000);

      assert.isTrue(await switcher.isItOn('FLAG_1')); // sync
      assert.isTrue(await switcher.isItOn('FLAG_1')); // async

      // Next call should call the API again - valid token but crashes on checkCriteria
      await sleep(1000);
      assert.isNull(asyncErrorMessage);

      // given
      given(fetchStub, 2, { status: 500 });

      // test
      assert.isTrue(await switcher.isItOn('FLAG_1')); // async
      await assertUntilResolve(assert, () => asyncErrorMessage, 
        'Something went wrong: [checkCriteria] failed with status 500');
    });

  });

  describe('force remote (hybrid):', function () {

    let fetchStub;
    
    const forceRemoteOptions = { 
      local: true, 
      snapshotLocation: './tests/snapshot/',
      regexSafe: false
    };

    beforeEach(function() {
      fetchStub = stub(FetchFacade, 'fetch');
    });
  
    afterEach(function() {
      fetchStub.restore();
    });

    it('should return true - snapshot switcher is true', async function () {
      Client.buildContext(contextSettings, forceRemoteOptions);

      const switcher = Client.getSwitcher();
      await Client.loadSnapshot();
      assert.isTrue(await switcher.isItOn('FF2FOR2030'));
    });

    it('should return false - same switcher return false when remote', async function () {
      // given API responses
      given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });
      given(fetchStub, 1, { json: () => generateResult(false), status: 200 });

      // test
      Client.buildContext(contextSettings, forceRemoteOptions);

      const switcher = Client.getSwitcher();
      const executeRemoteCriteria = spy(switcher, 'executeRemoteCriteria');
      
      await Client.loadSnapshot();
      assert.isFalse(await switcher.remote().isItOn('FF2FOR2030'));
      assert.equal(executeRemoteCriteria.callCount, 1);
    });

    it('should return true - including reason and metadata', async function () {
      // given API responses
      given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });
      given(fetchStub, 1, { json: () => generateDetailedResult({ 
        result: true, 
        reason: 'Success',
        metadata: { 
          user: 'user1',
        }
      }), status: 200 });

      // test
      Client.buildContext(contextSettings);

      const switcher = Client.getSwitcher();
      const detailedResult = await switcher.detail().isItOn('FF2FOR2030');
      assert.isTrue(detailedResult.result);
      assert.equal(detailedResult.reason, 'Success');
      assert.equal(detailedResult.metadata.user, 'user1');
    });

    it('should return error when local is not enabled', async function () {
      Client.buildContext(contextSettings, { regexSafe: false, local: false });

      const switcher = Client.getSwitcher();
      
      assert.throws(() => switcher.remote().isItOn('FF2FOR2030'), 
        'Local mode is not enabled');
    });

  });

  describe('check fail response (e2e):', function () {

    let fetchStub;

    beforeEach(function() {
      fetchStub = stub(FetchFacade, 'fetch');
    });
  
    afterEach(function() {
      fetchStub.restore();
    });

    it('should NOT be valid - API returned 429 (too many requests) at auth', async function () {
      // given API responses
      given(fetchStub, 0, { status: 429 });
      given(fetchStub, 1, { error: 'Too many requests', status: 429 });

      // test
      Client.buildContext(contextSettings);
      let switcher = Client.getSwitcher();
      
      await assertReject(assert, switcher.isItOn('FLAG_1'), 'Something went wrong: [auth] failed with status 429');
    });

    it('should NOT be valid - API returned 429 (too many requests) at checkCriteria', async function () {
      // given API responses
      given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });
      given(fetchStub, 1, { error: 'Too many requests', status: 429 });

      // test
      Client.buildContext(contextSettings);
      let switcher = Client.getSwitcher();
      
      await assertReject(assert, switcher.isItOn('FLAG_1'), 'Something went wrong: [checkCriteria] failed with status 429');
    });

    it('should use silent mode when fail to check switchers', async function() {
      // given
      given(fetchStub, 0, { status: 429 });

      // test
      Client.buildContext(contextSettings, { silentMode: '5m', regexSafe: false, snapshotLocation: './tests/snapshot/' });
      await Client.checkSwitchers(['FEATURE01', 'FEATURE02']).catch(e => {
        assert.equal(e.message, 'Something went wrong: [FEATURE01,FEATURE02] not found');
      });

      await assertResolve(assert, Client.checkSwitchers(['FF2FOR2021', 'FF2FOR2021']));
    });

    it('should use silent mode when fail to check criteria', async function () {
      // given API responses
      given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });
      given(fetchStub, 1, { status: 429 }); // [POST@/criteria]
      givenError(fetchStub, 2, { errno: 'ECONNREFUSED' }); // [GET@/check] used in the 2nd isItOn call

      // test
      let asyncErrorMessage = null;
      Client.buildContext(contextSettings, { silentMode: '1s', regexSafe: false, snapshotLocation: './tests/snapshot/' });
      Client.subscribeNotifyError((error) => asyncErrorMessage = error.message);

      const switcher = Client.getSwitcher();

      // assert silent mode being used while registering the error
      await assertResolve(assert, switcher.isItOn('FF2FOR2021'));
      await assertUntilResolve(assert, () => asyncErrorMessage, 
        'Something went wrong: [checkCriteria] failed with status 429');

      // assert silent mode being used in the next call
      await sleep(1500);
      await assertResolve(assert, switcher.isItOn('FF2FOR2021'));
    });

  });

  describe('check criteria:', function () {

    let fetchStub;

    beforeEach(function() {
      fetchStub = stub(FetchFacade, 'fetch');
    });
  
    afterEach(function() {
      fetchStub.restore();
    });

    it('should be valid', async function () {
      // given API responses
      given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });
      given(fetchStub, 1, { json: () => generateResult(true), status: 200 });

      // test
      Client.buildContext(contextSettings);
      let switcher = Client.getSwitcher();
      
      await switcher
        .checkValue('User 1')
        .checkNumeric('1')
        .checkNetwork('192.168.0.1')
        .checkDate('2019-12-01T08:30')
        .checkTime('08:00')
        .checkRegex(String.raw`\bUSER_[0-9]{1,2}\b`)
        .checkPayload(JSON.stringify({ name: 'User 1' }))
        .prepare('SWITCHER_MULTIPLE_INPUT');
      
      assert.sameDeepMembers(switcher.input, [
        [ 'VALUE_VALIDATION', 'User 1' ],
        [ 'NUMERIC_VALIDATION', '1' ],
        [ 'NETWORK_VALIDATION', '192.168.0.1' ],  
        [ 'DATE_VALIDATION', '2019-12-01T08:30' ],
        [ 'TIME_VALIDATION', '08:00' ],
        [ 'REGEX_VALIDATION', String.raw`\bUSER_[0-9]{1,2}\b` ],
        [ 'PAYLOAD_VALIDATION', '{"name":"User 1"}' ]
      ]);
    });

    it('should NOT throw when switcher keys provided were configured properly', async function() {
      // given
      given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });
      const response = { not_found: [] };
      given(fetchStub, 1, { json: () => response, status: 200 });

      // test
      Client.buildContext(contextSettings);
      await assertResolve(assert, Client.checkSwitchers(['FEATURE01', 'FEATURE02']));
    });

    it('should throw when switcher keys provided were not configured properly', async function() {
      // given
      given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });
      const response = { not_found: ['FEATURE02'] };
      given(fetchStub, 1, { json: () => response, status: 200 });

      // test
      Client.buildContext(contextSettings);
      await assertReject(assert, Client.checkSwitchers(['FEATURE01', 'FEATURE02']), 
        'Something went wrong: [FEATURE02] not found');
    });

    it('should throw when no switcher keys were provided', async function() {
      // given
      given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });
      given(fetchStub, 1, { status: 422 });

      // test
      Client.buildContext(contextSettings);
      await assertReject(assert, Client.checkSwitchers([]), 
        'Something went wrong: [checkSwitchers] failed with status 422');
    });

    it('should throw when switcher keys provided were invalid', async function() {
      // given
      given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });
      given(fetchStub, 1, { errno: 'ERROR' });

      // test
      Client.buildContext(contextSettings);
      await assertReject(assert, Client.checkSwitchers('FEATURE02'), 
        'Something went wrong: [checkSwitchers] failed with status undefined');
    });

    it('should throw when certPath is invalid', function() {
      assert.throws(() => Client.buildContext(contextSettings, { certPath: 'invalid' }), 
        'Invalid certificate path \'invalid\'');
    });

    it('should NOT throw when certPath is valid', function() {
      assert.doesNotThrow(() => Client.buildContext(contextSettings, { certPath: './tests/helper/dummy-cert.pem' }));
    });
    
    it('should renew the token after expiration', async function () {
      this.timeout(3000);

      // given API responses
      given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 1), status: 200 });

      Client.buildContext(contextSettings);
      let switcher = Client.getSwitcher();
      const spyPrepare = spy(switcher, 'prepare');

      // Prepare the call generating the token
      given(fetchStub, 1, { json: () => generateResult(true), status: 200 });
      await switcher.prepare('MY_FLAG');
      assert.equal(await switcher.isItOn(), true);

      // The program delay 2 secs later for the next call
      await sleep(2000);

      // Prepare the stub to provide the new token
      given(fetchStub, 2, { json: () => generateAuth('asdad12d2232d2323f', 1), status: 200 });

      // In this time period the expiration time has reached, it should call prepare once again to renew the token
      given(fetchStub, 3, { json: () => generateResult(false), status: 200 });
      assert.equal(await switcher.isItOn(), false);
      assert.equal(spyPrepare.callCount, 2);

      // In the meantime another call is made by the time the token is still not expired, so there is no need to call prepare again
      given(fetchStub, 4, { json: () => generateResult(false), status: 200 });
      assert.equal(await switcher.isItOn(), false);
      assert.equal(spyPrepare.callCount, 2);
    });

    it('should be valid - when sending key without calling prepare', async function () {
      // given API responses
      given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });
      given(fetchStub, 1, { json: () => generateResult(true), status: 200 });

      // test
      Client.buildContext(contextSettings);
      let switcher = Client.getSwitcher();
      assert.isTrue(await switcher
          .checkValue('User 1')
          .checkNetwork('192.168.0.1')
          .isItOn('MY_FLAG'));
    });

    it('should be valid - when preparing key and sending input strategy afterwards', async function () {
      // given API responses
      given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });
      given(fetchStub, 1, { json: () => generateResult(true), status: 200 });

      // test
      Client.buildContext(contextSettings);
      let switcher = Client.getSwitcher();

      await switcher.prepare('MY_FLAG');
      assert.isTrue(await switcher
        .checkValue('User 1')
        .checkNetwork('192.168.0.1')
        .isItOn(undefined));
    });

    it('should be invalid - Missing API url field', async function () {
      // given
      given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });

      // test
      Client.buildContext({ url: undefined, apiKey: 'apiKey', domain: 'domain', component: 'component', environment: 'default' });
      let switcher = Client.getSwitcher();

      await switcher
        .checkValue('User 1')
        .checkNetwork('192.168.0.1')
        .prepare('MY_FLAG');

      await assertReject(assert, switcher.isItOn(), 'Something went wrong: URL is required');
    });

    it('should be invalid - Missing API Key field', async function () {
      // given
      given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });

      // test
      Client.buildContext({ url: 'url', apiKey: undefined, domain: 'domain', component: 'component', environment: 'default' });
      let switcher = Client.getSwitcher();

      await switcher
        .checkValue('User 1')
        .checkNetwork('192.168.0.1')
        .prepare('MY_FLAG');

      await assertReject(assert, switcher.isItOn(), 'Something went wrong: API Key is required');
    });

    it('should be invalid - Missing key field', async function () {
      // given
      given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });
      given(fetchStub, 1, { json: () => generateResult(undefined) });

      // test
      Client.buildContext(contextSettings);
      let switcher = Client.getSwitcher();
      await switcher
        .checkValue('User 1')
        .checkNetwork('192.168.0.1')
        .prepare(undefined);

      await assertReject(assert, switcher.isItOn(), 'Something went wrong: Missing key field');
    });

    it('should be invalid - Missing component field', async function () {
      // given
      given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });
      given(fetchStub, 1, { json: () => generateResult(undefined) });

      // test
      Client.buildContext({ url: 'url', apiKey: 'apiKey', domain: 'domain', component: undefined, environment: 'default' });
      let switcher = Client.getSwitcher();

      await assertReject(assert, switcher
        .checkValue('User 1')
        .checkNetwork('192.168.0.1')
        .isItOn('MY_FLAG'), 'Something went wrong: Component is required');
    });

    it('should be invalid - Missing token field', async function () {
      // given
      given(fetchStub, 0, { json: () => generateAuth(undefined, 1), status: 200 });
      given(fetchStub, 1, { json: () => generateResult(undefined) });

      // test
      Client.buildContext(contextSettings);
      let switcher = Client.getSwitcher();
      
      await assertReject(assert, switcher
        .checkValue('User 1')
        .checkNetwork('192.168.0.1')
        .isItOn('MY_FLAG'), 'Something went wrong: Missing token field');
    });

    it('should run in silent mode', async function () {
      this.timeout(6000);

      // setup context to read the snapshot in case the API does not respond
      Client.buildContext(contextSettings, {
        snapshotLocation: './tests/snapshot/',
        regexSafe: false,
        silentMode: '2s'
      });
      
      let switcher = Client.getSwitcher();
      const spyRemote = spy(switcher, 'executeRemoteCriteria');

      // First attempt to reach the API - Since it's configured to use silent mode, it should return true (according to the snapshot)
      givenError(fetchStub, 0, { errno: 'ECONNREFUSED' });
      assert.isTrue(await switcher.isItOn('FF2FOR2030'));

      // The call below is in silent mode. It is getting the configuration from the local snapshot again
      await sleep(500);
      assert.isTrue(await switcher.isItOn());

      // As the silent mode was configured to retry after 2 seconds, it's still in time, 
      // therefore, remote call was not yet invoked
      assert.equal(spyRemote.callCount, 0);
      await sleep(3000);
      
      // Setup the remote mocked response and made it to return false just to make sure it's not fetching from the snapshot
      given(fetchStub, 1, { status: 200 });
      given(fetchStub, 2, { json: () => generateAuth('[auth_token]', 10), status: 200 });
      given(fetchStub, 3, { json: () => generateResult(false), status: 200 });

      // Auth is async when silent mode is enabled to prevent blocking the execution while the API is not available
      assert.isTrue(await switcher.isItOn());

      // Now the remote call was invoked, so it should return false
      await sleep(500);
      assert.isFalse(await switcher.isItOn());
      assert.equal(spyRemote.callCount, 1);
    });

    it('should throw error if not in silent mode', async function () {
      // given
      fetchStub.restore();
      fetchStub = stub(FetchFacade, 'fetch');
      throws(fetchStub, { errno: 'ECONNREFUSED' });

      // test
      Client.buildContext(contextSettings);
      let switcher = Client.getSwitcher();

      await assertReject(assert, switcher.isItOn('FF2FOR2030'), 
        'Something went wrong: Connection has been refused - ECONNREFUSED');
    });

    it('should run in silent mode when API is unavailable', async function () {
      // given: API unavailable
      given(fetchStub, 0, { status: 503 });

      // test
      Client.buildContext(contextSettings, {
        snapshotLocation: './tests/snapshot/',
        regexSafe: false,
        silentMode: '5m'
      });

      let switcher = Client.getSwitcher();
      assert.isTrue(await switcher.isItOn('FF2FOR2030'));
    });

  });

});