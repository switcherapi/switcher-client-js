import { assert } from 'chai';
import { stub, spy } from 'sinon';
import { unwatchFile } from 'node:fs';

import FetchFacade from '../src/lib/utils/fetchFacade.js';
import ExecutionLogger from '../src/lib/utils/executionLogger.js';
import { Client } from '../switcher-client.js';
import { given, givenError, throws, generateAuth, generateResult, assertReject, 
  assertResolve, sleep, assertUntilResolve } from './helper/utils.js';

describe('Switcher Silent Mode:', function () {
  
  let contextSettings;
  let fetchStub;

  this.afterAll(function() {
    unwatchFile('./tests/snapshot/default.json');
  });

  beforeEach(function() {
    fetchStub = stub(FetchFacade, 'fetch');
    ExecutionLogger.clearLogger();
    Client.testMode();

    contextSettings = {
      apiKey: '[api_key]',
      domain: 'Business',
      component: 'business-service',
      environment: 'default',
      url: 'http://localhost:3000'
    };
  });

  afterEach(function() {
    fetchStub.restore();
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