import { assert } from 'chai';
import { stub, spy } from 'sinon';
import { unwatchFile } from 'node:fs';

import FetchFacade from '../src/lib/utils/fetchFacade.js';
import ExecutionLogger from '../src/lib/utils/executionLogger.js';
import { Client } from '../switcher-client.js';
import { given, generateAuth, generateResult, assertReject, 
  assertResolve, generateDetailedResult, sleep } from './helper/utils.js';

describe('Switcher Remote:', function () {

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

  describe('check criteria:', function () {

    let fetchStub;

    beforeEach(function() {
      fetchStub = stub(FetchFacade, 'fetch');
      ExecutionLogger.clearLogger();
    });
  
    afterEach(function() {
      fetchStub.restore();
    });

    it('should be valid (simple)', async function () {
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

    it('should be valid (with all strategies)', async function () {
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

    it('should return false - same switcher return false when remote', async function () {
      // given API responses
      given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });
      given(fetchStub, 1, { json: () => generateResult(false), status: 200 });

      // test
      Client.buildContext(contextSettings, forceRemoteOptions);

      const switcher = Client.getSwitcher();
      const executeRemoteCriteria = spy(switcher, 'executeRemoteCriteria');
      
      await Client.loadSnapshot();
      assert.isTrue(await switcher.isItOn('FF2FOR2030')); // snapshot value is true
      assert.isFalse(await switcher.remote().isItOn('FF2FOR2030')); // remote value is false
      assert.equal(executeRemoteCriteria.callCount, 1);
    });

    it('should return error when local is not enabled', async function () {
      Client.buildContext(contextSettings, { regexSafe: false, local: false });

      const switcher = Client.getSwitcher();
      
      assert.throws(() => switcher.remote().isItOn('FF2FOR2030'), 
        'Local mode is not enabled');
    });

  });

  describe('check fail response:', function () {

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

  });

});