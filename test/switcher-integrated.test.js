import { assert } from 'chai';
import { stub, spy } from 'sinon';
import { unwatchFile } from 'fs';

import FetchFacade from '../src/lib/utils/fetchFacade.js';
import { Switcher, checkValue, checkNetwork, checkDate, checkTime, checkRegex, checkNumeric, checkPayload } from '../switcher-client.js';
import { given, givenError, throws, generateAuth, generateResult, assertReject, assertResolve, generateDetailedResult } from './helper/utils.js';
import ExecutionLogger from '../src/lib/utils/executionLogger.js';

describe('Integrated test - Switcher:', function () {

  let contextSettings;

  this.afterAll(function() {
    unwatchFile('./snapshot/default.json');
  });

  this.beforeEach(function() {
    Switcher.testMode();

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
    });
  
    afterEach(function() {
      fetchStub.restore();
    });

    it('should be valid', async function () {
      // given API responding properly
      given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });
      given(fetchStub, 1, { json: () => generateResult(true), status: 200 });

      // test
      Switcher.buildContext(contextSettings);
      let switcher = Switcher.factory();
      
      await switcher.prepare('FLAG_1');
      assert.isTrue(await switcher.isItOn());
    });

    it('should NOT be valid - API returned 429 (too many requests)', async function () {
      // given API responding properly
      given(fetchStub, 0, { error: 'Too many requests', status: 429 });

      // test
      Switcher.buildContext(contextSettings);
      let switcher = Switcher.factory();
      
      await assertReject(assert, switcher.isItOn('FLAG_1'), 'Something went wrong: [auth] failed with status 429');
    });

    it('should be valid - throttle', async function () {
      this.timeout(3000);

      // given API responding properly
      // first API call
      given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });
      given(fetchStub, 1, { json: () => generateResult(true), status: 200 });

      // first async API call
      given(fetchStub, 2, { status: 200 });
      given(fetchStub, 3, { json: () => generateResult(true), status: 200 });

      // test
      Switcher.buildContext(contextSettings);
      let switcher = Switcher.factory();
      switcher.throttle(1000);

      const spyPrepare = spy(switcher, '_executeAsyncRemoteCriteria');
      const spyExecutionLogger = spy(ExecutionLogger, 'add');

      for (let index = 0; index < 10; index++) {
        assert.isTrue(await switcher.isItOn('FLAG_1'));
      }

      assert.equal(spyPrepare.callCount, 9);
      assert.equal(spyExecutionLogger.callCount, 1); // First call is not throttled

      // Next call should call the API again as the throttle has expired
      await new Promise(resolve => setTimeout(resolve, 2000));
      assert.isTrue(await switcher.isItOn('FLAG_1'));
      assert.equal(spyPrepare.callCount, 10);
      assert.equal(spyExecutionLogger.callCount, 2); // Last call is not throttled, expired throttle
    });

    it('should be valid - throttle - with details', async function () {
      this.timeout(3000);

      // given API responding properly
      // first API call
      given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });
      given(fetchStub, 1, { json: () => generateResult(true), status: 200 });

      // test
      Switcher.buildContext(contextSettings);

      let switcher = Switcher.factory();
      switcher.throttle(1000);

      // first API call - stores result in cache
      await switcher.isItOn('FLAG_2');

      // first async API call
      const response = await switcher.detail().isItOn('FLAG_2');
      assert.isTrue(response.result);
    });
  });

  describe('force remote (hybrid):', function () {

    let fetchStub;
    
    const forceRemoteOptions = { 
      local: true, 
      snapshotLocation: './snapshot/',
      regexSafe: false
    };

    beforeEach(function() {
      fetchStub = stub(FetchFacade, 'fetch');
    });
  
    afterEach(function() {
      fetchStub.restore();
    });

    it('should return true - snapshot switcher is true', async function () {
      Switcher.buildContext(contextSettings, forceRemoteOptions);

      const switcher = Switcher.factory();
      await Switcher.loadSnapshot();
      assert.isTrue(await switcher.isItOn('FF2FOR2030'));
    });

    it('should return false - same switcher return false when remote', async function () {
      // given API responding properly
      given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });
      given(fetchStub, 1, { json: () => generateResult(false), status: 200 });

      // test
      Switcher.buildContext(contextSettings, forceRemoteOptions);

      const switcher = Switcher.factory();
      const executeRemoteCriteria = spy(switcher, '_executeRemoteCriteria');
      
      await Switcher.loadSnapshot();
      assert.isFalse(await switcher.remote().isItOn('FF2FOR2030'));
      assert.equal(executeRemoteCriteria.callCount, 1);
    });

    it('should return true - including reason and metadata', async function () {
      // given API responding properly
      given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });
      given(fetchStub, 1, { json: () => generateDetailedResult({ 
        result: true, 
        reason: 'Success',
        metadata: { 
          user: 'user1',
        }
      }), status: 200 });

      // test
      Switcher.buildContext(contextSettings);

      const switcher = Switcher.factory();
      const detailedResult = await switcher.detail().isItOn('FF2FOR2030');
      assert.isTrue(detailedResult.result);
      assert.equal(detailedResult.reason, 'Success');
      assert.equal(detailedResult.metadata.user, 'user1');
    });

    it('should return error when local is not enabled', async function () {
      Switcher.buildContext(contextSettings, { regexSafe: false, local: false });

      const switcher = Switcher.factory();
      
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

    it('should NOT be valid - API returned 429 (too many requests) at checkHealth/auth', async function () {
      // given API responding properly
      given(fetchStub, 0, { status: 429 });
      given(fetchStub, 1, { error: 'Too many requests', status: 429 });

      // test
      Switcher.buildContext(contextSettings);
      let switcher = Switcher.factory();
      
      await assertReject(assert, switcher.isItOn('FLAG_1'), 'Something went wrong: [auth] failed with status 429');
    });

    it('should NOT be valid - API returned 429 (too many requests) at checkCriteria', async function () {
      // given API responding properly
      given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });
      given(fetchStub, 1, { error: 'Too many requests', status: 429 });

      // test
      Switcher.buildContext(contextSettings);
      let switcher = Switcher.factory();
      
      await assertReject(assert, switcher.isItOn('FLAG_1'), 'Something went wrong: [checkCriteria] failed with status 429');
    });

    it('should use silent mode when fail to check switchers', async function() {
      //given
      given(fetchStub, 0, { status: 429 });

      //test
      Switcher.buildContext(contextSettings, { silentMode: '5m', regexSafe: false, snapshotLocation: './snapshot/' });
      await Switcher.checkSwitchers(['FEATURE01', 'FEATURE02']).catch(e => {
        assert.equal(e.message, 'Something went wrong: [FEATURE01,FEATURE02] not found');
      });

      await assertResolve(assert, Switcher.checkSwitchers(['FF2FOR2021', 'FF2FOR2021']));
    });

    it('should use silent mode when fail to check criteria', async function () {
      // given API responding properly
      given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });
      given(fetchStub, 1, { status: 429 });

      // test
      Switcher.buildContext(contextSettings, { silentMode: '5m', regexSafe: false, snapshotLocation: './snapshot/' });
      let switcher = Switcher.factory();
      
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
      // given API responding properly
      given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });
      given(fetchStub, 1, { json: () => generateResult(true), status: 200 });

      // test
      Switcher.buildContext(contextSettings, { logger: true });
      let switcher = Switcher.factory();
      
      await switcher.prepare('SWITCHER_MULTIPLE_INPUT', [
        checkValue('User 1'),
        checkNumeric('1'),
        checkNetwork('192.168.0.1'),
        checkDate('2019-12-01T08:30'),
        checkTime('08:00'),
        checkRegex('\\bUSER_[0-9]{1,2}\\b'),
        checkPayload(JSON.stringify({ name: 'User 1' }))
      ]);
      
      assert.isTrue(await switcher.isItOn());
      
      const input = ExecutionLogger.getByKey('SWITCHER_MULTIPLE_INPUT').map(log => log.input)[0];
      assert.sameDeepMembers(input, [
        [ 'VALUE_VALIDATION', 'User 1' ],
        [ 'NUMERIC_VALIDATION', '1' ],
        [ 'NETWORK_VALIDATION', '192.168.0.1' ],  
        [ 'DATE_VALIDATION', '2019-12-01T08:30' ],
        [ 'TIME_VALIDATION', '08:00' ],
        [ 'REGEX_VALIDATION', '\\bUSER_[0-9]{1,2}\\b' ],
        [ 'PAYLOAD_VALIDATION', '{"name":"User 1"}' ]
      ]);
    });

    it('should NOT throw when switcher keys provided were configured properly', async function() {
      //given
      given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });
      const response = { not_found: [] };
      given(fetchStub, 1, { json: () => response, status: 200 });

      //test
      Switcher.buildContext(contextSettings);
      await assertResolve(assert, Switcher.checkSwitchers(['FEATURE01', 'FEATURE02']));
    });

    it('should throw when switcher keys provided were not configured properly', async function() {
      //given
      given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });
      const response = { not_found: ['FEATURE02'] };
      given(fetchStub, 1, { json: () => response, status: 200 });

      //test
      Switcher.buildContext(contextSettings);
      await assertReject(assert, Switcher.checkSwitchers(['FEATURE01', 'FEATURE02']), 
        'Something went wrong: Something went wrong: [FEATURE02] not found');
    });

    it('should throw when no switcher keys were provided', async function() {
      //given
      given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });
      given(fetchStub, 1, { status: 422 });

      //test
      Switcher.buildContext(contextSettings);
      await assertReject(assert, Switcher.checkSwitchers([]), 
        'Something went wrong: [checkSwitchers] failed with status 422');
    });

    it('should throw when switcher keys provided were invalid', async function() {
      //given
      given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });
      given(fetchStub, 1, { errno: 'ERROR' });

      //test
      Switcher.buildContext(contextSettings);
      await assertReject(assert, Switcher.checkSwitchers('FEATURE02'), 
        'Something went wrong: [checkSwitchers] failed with status undefined');
    });

    it('should throw when certPath is invalid', function() {
      assert.throws(() => Switcher.buildContext(contextSettings, { certPath: 'invalid' }), 
        'Invalid certificate path \'invalid\'');
    });

    it('should NOT throw when certPath is valid', function() {
      assert.doesNotThrow(() => Switcher.buildContext(contextSettings, { certPath: './test/helper/dummy-cert.pem' }));
    });
    
    it('should renew the token after expiration', async function () {
      this.timeout(3000);

      // given API responding properly
      given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 1), status: 200 });

      Switcher.buildContext(contextSettings);
      let switcher = Switcher.factory();
      const spyPrepare = spy(switcher, 'prepare');

      // Prepare the call generating the token
      given(fetchStub, 1, { json: () => generateResult(true), status: 200 });
      await switcher.prepare('MY_FLAG');
      assert.equal(await switcher.isItOn(), true);

      // The program delay 2 secs later for the next call
      await new Promise(resolve => setTimeout(resolve, 2000));

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
      // given API responding properly
      given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });
      given(fetchStub, 1, { json: () => generateResult(true), status: 200 });

      // test
      Switcher.buildContext(contextSettings);
      let switcher = Switcher.factory();
      assert.isTrue(await switcher.isItOn('MY_FLAG', [
        checkValue('User 1'),
        checkNetwork('192.168.0.1')
      ]));
    });

    it('should be valid - when preparing key and sending input strategy afterwards', async function () {
      // given API responding properly
      given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });
      given(fetchStub, 1, { json: () => generateResult(true), status: 200 });

      // test
      Switcher.buildContext(contextSettings);
      let switcher = Switcher.factory();

      await switcher.prepare('MY_FLAG');
      assert.isTrue(await switcher.isItOn(undefined, [
        checkValue('User 1'),
        checkNetwork('192.168.0.1')
      ]));
    });

    it('should be invalid - Missing API url field', async function () {
      // given
      given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });

      // test
      Switcher.buildContext({ url: undefined, apiKey: 'apiKey', domain: 'domain', component: 'component', environment: 'default' });
      let switcher = Switcher.factory();

      await switcher.prepare('MY_FLAG', [
        checkValue('User 1'),
        checkNetwork('192.168.0.1')
      ]);

      await assertReject(assert, switcher.isItOn(), 'Something went wrong: Missing API url field');
    });

    it('should be invalid - Missing API Key field', async function () {
      // given
      given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });

      // test
      Switcher.buildContext({ url: 'url', apiKey: undefined, domain: 'domain', component: 'component', environment: 'default' });
      let switcher = Switcher.factory();

      await switcher.prepare('MY_FLAG', [
        checkValue('User 1'),
        checkNetwork('192.168.0.1')
      ]);

      await assertReject(assert, switcher.isItOn(), 'Something went wrong: Missing API Key field');
    });

    it('should be invalid - Missing key field', async function () {
      // given
      given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });
      given(fetchStub, 1, { json: () => generateResult(undefined) });

      // test
      Switcher.buildContext(contextSettings);
      let switcher = Switcher.factory();
      await switcher.prepare(undefined, [
        checkValue('User 1'),
        checkNetwork('192.168.0.1')
      ]);

      await assertReject(assert, switcher.isItOn(), 'Something went wrong: Missing key field');
    });

    it('should be invalid - Missing component field', async function () {
      // given
      given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });
      given(fetchStub, 1, { json: () => generateResult(undefined) });

      // test
      Switcher.buildContext({ url: 'url', apiKey: 'apiKey', domain: 'domain', component: undefined, environment: 'default' });
      let switcher = Switcher.factory();

      await assertReject(assert, switcher.isItOn('MY_FLAG', [
        checkValue('User 1'),
        checkNetwork('192.168.0.1')
      ]), 'Something went wrong: Missing component field');
    });

    it('should be invalid - Missing token field', async function () {
      // given
      given(fetchStub, 0, { json: () => generateAuth(undefined, 1), status: 200 });
      given(fetchStub, 1, { json: () => generateResult(undefined) });

      // test
      Switcher.buildContext(contextSettings);
      let switcher = Switcher.factory();
      
      await assertReject(assert, switcher.isItOn('MY_FLAG', [
        checkValue('User 1'),
        checkNetwork('192.168.0.1')
      ]), 'Something went wrong: Missing token field');
    });

    it('should be invalid - bad strategy input', async function () {
      // given
      given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });
      given(fetchStub, 1, { json: () => generateResult(undefined) });

      // test
      Switcher.buildContext(contextSettings);
      let switcher = Switcher.factory();
      await switcher.prepare('MY_WRONG_FLAG', ['THIS IS WRONG']);

      await assertReject(assert, switcher.isItOn(), 'Something went wrong: Invalid input format for \'THIS IS WRONG\'');
    });

    it('should run in silent mode', async function () {
      this.timeout(6000);

      // setup context to read the snapshot in case the API does not respond
      Switcher.buildContext(contextSettings, {
        snapshotLocation: './snapshot/',
        regexSafe: false,
        silentMode: '2s'
      });
      
      let switcher = Switcher.factory();
      const spyRemote = spy(switcher, '_executeRemoteCriteria');

      // First attempt to reach the API - Since it's configured to use silent mode, it should return true (according to the snapshot)
      givenError(fetchStub, 0, { errno: 'ECONNREFUSED' });
      assert.isTrue(await switcher.isItOn('FF2FOR2030'));

      await new Promise(resolve => setTimeout(resolve, 500));
      // The call below is in silent mode. It is getting the configuration from the local snapshot again
      assert.isTrue(await switcher.isItOn());

      // As the silent mode was configured to retry after 2 seconds, it's still in time, 
      // therefore, remote call was not yet invoked
      assert.equal(spyRemote.callCount, 0);

      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Setup the remote mocked response and made it to return false just to make sure it's not fetching from the snapshot
      given(fetchStub, 1, { status: 200 });
      given(fetchStub, 2, { json: () => generateAuth('[auth_token]', 10), status: 200 });
      given(fetchStub, 3, { json: () => generateResult(false), status: 200 });

      // Auth is async when silent mode is enabled to prevent blocking the execution while the API is not available
      assert.isTrue(await switcher.isItOn());
      assert.isFalse(await switcher.isItOn());
      assert.equal(spyRemote.callCount, 1);
    });

    it('should throw error if not in silent mode', async function () {
      // given
      fetchStub.restore();
      fetchStub = stub(FetchFacade, 'fetch');
      throws(fetchStub, { errno: 'ECONNREFUSED' });

      // test
      Switcher.buildContext(contextSettings);
      let switcher = Switcher.factory();

      await assertReject(assert, switcher.isItOn('FF2FOR2030'), 
        'Something went wrong: Connection has been refused - ECONNREFUSED');
    });

    it('should run in silent mode when API is unavailable', async function () {
      // given: API unavailable
      given(fetchStub, 0, { status: 503 });

      // test
      Switcher.buildContext(contextSettings, {
        snapshotLocation: './snapshot/',
        regexSafe: false,
        silentMode: '5m'
      });

      let switcher = Switcher.factory();
      assert.isTrue(await switcher.isItOn('FF2FOR2030'));
    });

  });

});