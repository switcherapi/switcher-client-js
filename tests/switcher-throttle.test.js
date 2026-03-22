import { assert } from 'chai';
import { stub, spy } from 'sinon';
import { unwatchFile } from 'node:fs';

import FetchFacade from '../src/lib/utils/fetchFacade.js';
import ExecutionLogger from '../src/lib/utils/executionLogger.js';
import { Client } from '../switcher-client.js';
import { given, generateAuth, generateResult, 
  sleep, assertUntilResolve } from './helper/utils.js';

describe('Switcher Throttle:', function () {
  
  let fetchStub;
  let contextSettings;

  this.afterAll(function() {
    unwatchFile('./tests/snapshot/default.json');
  });
  
  afterEach(function() {
    fetchStub.restore();
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

  it('should flush executions from a specific switcher key', async function () {
    // given API responses
    given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 1), status: 200 });
    given(fetchStub, 1, { json: () => generateResult(true), status: 200 }); // sync

    Client.buildContext(contextSettings);
    const switcher = Client.getSwitcher('FLAG_1').throttle(1000);
    
    // when
    assert.isTrue(await switcher.isItOn());
    let switcherExecutions = ExecutionLogger.getByKey('FLAG_1');
    assert.equal(switcherExecutions.length, 1);

    // test
    switcher.flushExecutions();
    switcherExecutions = ExecutionLogger.getByKey('FLAG_1');
    assert.equal(switcherExecutions.length, 0);
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