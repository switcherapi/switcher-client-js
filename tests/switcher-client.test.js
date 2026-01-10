import { rmdir } from 'node:fs';
import { assert } from 'chai';
import { spy } from 'sinon';

import { Client, SwitcherContext, SwitcherOptions } from '../switcher-client.js';
import { StrategiesType } from '../src/lib/snapshot.js';
import { assertReject, assertResolve, deleteGeneratedSnapshot } from './helper/utils.js';
import TimedMatch from '../src/lib/utils/timed-match/index.js';

let switcher;
const contextSettings = {
  apiKey: '[api_key]',
  domain: 'Business',
  component: 'business-service',
  environment: 'default',
  url: 'http://localhost:3000'
};

const options = {
  snapshotLocation: './tests/snapshot/',
  local: true,
  logger: true,
  regexMaxBlackList: 1,
  regexMaxTimeLimit: 500
};

describe('E2E test - Client local #1:', function () {
  this.beforeAll(async function () {
    Client.buildContext(contextSettings, options);

    await Client.loadSnapshot();
    switcher = Client.getSwitcher();
  });

  this.afterAll(function () {
    Client.unloadSnapshot();
    rmdir('//somewhere/', () => {
      return;
    });
  });

  this.beforeEach(function () {
    Client.clearLogger();
    switcher = Client.getSwitcher();
  });

  it('should be valid - isItOn', async function () {
    await switcher
      .checkValue('Japan')
      .checkNetwork('10.0.0.3')
      .prepare('FF2FOR2020');
    
    assert.isTrue(switcher.isItOn() === true);
    assert.isTrue(await switcher.isItOn() === true);
    assert.isTrue(switcher.isItOnBool() === true);
    assert.isTrue(await switcher.isItOnBool(true) === true);
    assert.isTrue(switcher.isItOnDetail().result === true);
    assert.isTrue((await switcher.isItOnDetail(true)).result === true);
  });

  it('should get execution from logger', async function () {
    await switcher
      .checkValue('Japan')
      .checkNetwork('10.0.0.3')
      .prepare('FF2FOR2020');

    await switcher.isItOn('FF2FOR2020');
    const log = Client.getExecution(switcher);

    assert.equal(log.key, 'FF2FOR2020');
    assert.sameDeepMembers(log.input, [
      ['VALUE_VALIDATION', 'Japan'],
      ['NETWORK_VALIDATION', '10.0.0.3']]);
    assert.equal(log.response.reason, 'Success');
    assert.equal(log.response.result, true);
  });

  it('should be valid - isItOn - with detail', async function () {
    const response = await switcher
      .detail()
      .checkValue('Japan')
      .checkNetwork('10.0.0.3')
      .isItOn('FF2FOR2020');

    assert.isTrue(response.result);
    assert.equal(response.reason, 'Success');
    assert.deepEqual(response.toJSON(), {
      result: true,
      reason: 'Success',
      metadata: undefined
    });
  });

  it('should be valid - No prepare function needed', async function () {
    const result = await switcher
      .checkValue('Japan')
      .checkNetwork('10.0.0.3')
      .isItOn('FF2FOR2020');

    assert.isTrue(result);
  });

  it('should be valid - No prepare function needed (no input as well)', async function () {
    const result = await switcher.isItOn('FF2FOR2030');
    assert.isTrue(result);
  });

  it('should be valid - Client strategy disabled', async function () {
    const result = await switcher
      .checkNetwork('192.168.0.1')
      .isItOn('FF2FOR2021');

    assert.isTrue(result);
  });

  it('should be valid - No Client strategy', async function () {
    const result = await switcher.isItOn('FF2FOR2022');
    assert.isTrue(result);
  });

  it('should be valid - JSON Payload matches all keys', async function () {
    await switcher
      .checkPayload(JSON.stringify({
        id: 1,
        user: {
          login: 'USER_LOGIN',
          role: 'ADMIN'
        }
      }))
      .prepare('FF2FOR2023');

    const result = await switcher.isItOn();
    assert.isTrue(result);
  });

  it('should be invalid - REGEX failed to perform in time', async function () {
    const getTimer = (timer) => (timer - Date.now()) * -1;

    let timer = Date.now();
    const result = await switcher
      .checkRegex('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
      .isItOn('FF2FOR2024');

    timer = getTimer(timer);

    assert.isFalse(result);
    assert.isAbove(timer, 500);
    assert.isBelow(timer, 600);
  });

  it('should be invalid - JSON Payload does NOT match all keys', async function () {
    await switcher
      .checkPayload(JSON.stringify({
        id: 1,
        user: {
          login: 'USER_LOGIN'
        }
      }))
      .prepare('FF2FOR2023');

    const result = await switcher.isItOn();
    assert.isFalse(result);
    assert.equal(Client.getLogger('FF2FOR2023')[0].response.reason,
      `Strategy '${StrategiesType.PAYLOAD}' does not agree`);
  });

  it('should be invalid - Input (IP) does not match', async function () {
    await switcher
      .checkValue('Japan')
      .checkNetwork('192.168.0.2')
      .prepare('FF2FOR2020');

    const result = await switcher.isItOn();
    assert.isFalse(result);
    assert.equal(Client.getLogger('FF2FOR2020')[0].response.reason,
      `Strategy '${StrategiesType.NETWORK}' does not agree`);
  });

  it('should be invalid - Input not provided', async function () {
    const result = await switcher.isItOn('FF2FOR2020');
    assert.isFalse(result);
    assert.equal(Client.getLogger('FF2FOR2020')[0].response.reason,
      `Strategy '${StrategiesType.NETWORK}' did not receive any input`);
  });

  it('should be invalid - Switcher config disabled', async function () {
    const result = await switcher.isItOn('FF2FOR2031');
    assert.isFalse(result);
    assert.equal(Client.getLogger('FF2FOR2031')[0].response.reason,
      'Config disabled');
  });

  it('should be invalid - Switcher group disabled', async function () {
    const result = await switcher.isItOn('FF2FOR2040');
    assert.isFalse(result);
    assert.equal(Client.getLogger('FF2FOR2040')[0].response.reason,
      'Group disabled');
  });

  it('should clear strategy inputs', async function () {
    // when
    await switcher
      .checkValue('Japan')
      .checkNetwork('10.0.0.2')  
      .prepare('FF2FOR2020');

    assert.exists(switcher.input);
    assert.isTrue(await switcher.isItOn());

    // test
    switcher.resetInputs();
    assert.equal(switcher.input, undefined);
    assert.isFalse(await switcher.isItOn());  
  });

  it('should be valid - Local mode', async function () {
    this.timeout(3000);

    Client.buildContext(contextSettings, {
      local: true,
      regexSafe: false,
      snapshotLocation: 'generated-snapshots/'
    });

    await assertResolve(assert, Client.loadSnapshot());
    assert.isNotNull(Client.snapshot);
  });

  it('should be invalid - Local mode cannot load snapshot from an invalid path', async function () {
    this.timeout(3000);

    Client.buildContext(contextSettings, {
      local: true,
      regexSafe: false,
      snapshotLocation: '//somewhere/'
    });

    Client.testMode();
    await assertReject(assert, Client.loadSnapshot(), 'Something went wrong: It was not possible to load the file at //somewhere/');
  });

  it('should not throw error when a default result is provided', async function () {
    Client.buildContext(contextSettings, {
      local: true
    });

    const switcher = Client.getSwitcher('UNKNOWN_FEATURE').defaultResult(true);
    assert.isTrue(await switcher.isItOn());
  });

});

describe('E2E test - Client local #2:', function () {
  this.beforeAll(async function () {
    Client.buildContext({ domain: contextSettings.domain, environment: 'default_disabled' }, options);

    await Client.loadSnapshot();
    switcher = Client.getSwitcher();
  });

  this.afterAll(function () {
    Client.unloadSnapshot();
    TimedMatch.terminateWorker();
  });

  it('should be invalid - Client domain disabled', async function () {
    assert.isFalse(await switcher.isItOn('FF2FOR2040'));
    assert.equal(Client.getLogger('FF2FOR2040')[0].response.reason, 
      'Domain disabled');
  });
  
});

describe('E2E test - Client local from cache:', function () {
  this.beforeAll(async function () {
    Client.buildContext(contextSettings, options);

    await Client.loadSnapshot();
    switcher = Client.getSwitcher();
  });

   this.afterAll(function () {
    Client.unloadSnapshot();
    TimedMatch.terminateWorker();
  });

  this.beforeEach(function () {
    Client.clearLogger();
    switcher = Client.getSwitcher();
  });

  it('should get response from cache', async function () {
    // 1st call - should not get from cache
    let result = await switcher
      .throttle(1000)
      .detail()
      .checkValue('Japan')
      .checkNetwork('10.0.0.3')
      .isItOn('FF2FOR2020');

    assert.isTrue(result.result);
    assert.deepEqual(result.metadata || {}, {});

    // 2nd call - should get from cache
    result = await switcher
      .throttle(1000)
      .detail()
      .checkValue('Japan')
      .checkNetwork('10.0.0.3')
      .isItOn('FF2FOR2020');

    assert.isTrue(result.result);
    assert.deepEqual(result.metadata || {}, { cached: true });
  });

  it('should NOT get response from cache - different strategy input', async function () {
    // 1st call - should not get from cache
    let result = await switcher
      .throttle(1000)
      .detail()
      .checkValue('Japan')
      .checkNetwork('10.0.0.3')
      .isItOn('FF2FOR2020');

    assert.isTrue(result.result);
    assert.deepEqual(result.metadata || {}, {});

    // 2nd call - should get from cache
    result = await switcher
      .throttle(1000)
      .detail()
      .checkValue('USA')
      .checkNetwork('10.0.0.3')
      .isItOn('FF2FOR2020');

    assert.isFalse(result.result);
    assert.deepEqual(result.metadata || {}, {});
  });

  it('should NOT get response from cache - different key', async function () {
    // 1st call - should not get from cache
    let result = await switcher
      .throttle(1000)
      .detail()
      .isItOn('FF2FOR2021');

    assert.isTrue(result.result);
    assert.deepEqual(result.metadata || {}, {});

    // 2nd call - should get from cache
    result = await switcher
      .throttle(1000)
      .detail()
      .isItOn('FF2FOR2022');

    assert.isTrue(result.result);
    assert.deepEqual(result.metadata || {}, {});
  });

  it('should get response from cache when freeze mode is enabled', async function () {
    // given
    Client.buildContext(contextSettings, {
      snapshotLocation: options.snapshotLocation, 
      local: true,
      freeze: true
    });
    
    await Client.loadSnapshot();

    // test
    switcher = Client.getSwitcher();
    const spyScheduleBackgroundRefresh = spy(switcher, 'scheduleBackgroundRefresh');

    // 1st call - should not get from cache
    let result = await switcher
      .throttle(1000)
      .detail()
      .isItOn('FF2FOR2021');

    assert.isTrue(result.result);
    assert.deepEqual(result.metadata || {}, {});

    // 2nd call - should get from cache
    result = await switcher
      .throttle(1000)
      .detail()
      .isItOn('FF2FOR2021');

    assert.isTrue(result.result);
    assert.deepEqual(result.metadata || {}, { cached: true });
    
    assert.equal(spyScheduleBackgroundRefresh.callCount, 0);
  });
});

describe('E2E test - Client testing (assume) feature:', function () {
  this.beforeAll(async function () {
    Client.buildContext(contextSettings, options);

    await Client.loadSnapshot();
    switcher = Client.getSwitcher();
  });

  this.afterAll(function () {
    Client.unloadSnapshot();
    TimedMatch.terminateWorker();
  });

  this.beforeEach(function () {
    Client.clearLogger();
    Client.forget('FF2FOR2020');
    switcher = Client.getSwitcher();
  });
  
  it('should replace the result of isItOn with Client.assume', async function () {
    await switcher.prepare('DUMMY');

    Client.assume('DUMMY').true();
    assert.isTrue(await switcher.isItOn());

    Client.assume('DUMMY').false();
    assert.isFalse(await switcher.isItOn());
  });

  it('should be valid assuming key to be false and then forgetting it', async function () {
    await switcher
      .checkValue('Japan')
      .checkNetwork('10.0.0.3')
      .prepare('FF2FOR2020');

    assert.isTrue(await switcher.isItOn());
    Client.assume('FF2FOR2020').false();
    assert.isFalse(await switcher.isItOn());

    Client.forget('FF2FOR2020');
    assert.isTrue(await switcher.isItOn());
  });

  it('should be valid assuming key to be false - with details', async function () {
    Client.assume('FF2FOR2020').false();
    const { result, reason } = await switcher.detail().isItOn('FF2FOR2020');

    assert.isFalse(result);
    assert.equal(reason, 'Forced to false');
  });

  it('should be valid assuming key to be false - with metadata', async function () {
    Client.assume('FF2FOR2020').false().withMetadata({ value: 'something' });
    const { result, reason, metadata } = await switcher.detail().isItOn('FF2FOR2020');

    assert.isFalse(result);
    assert.equal(reason, 'Forced to false');
    assert.deepEqual(metadata, { value: 'something' });
  });

  it('should be valid assuming unknown key to be true and throw error when forgetting', async function () {
    await switcher
      .checkValue('Japan')
      .checkNetwork('10.0.0.3')
      .prepare('UNKNOWN');

    Client.assume('UNKNOWN').true();
    assert.isTrue(await switcher.isItOn());

    Client.forget('UNKNOWN');
    assert.throws(() => switcher.isItOn(), Error, 'Something went wrong: {"error":"Unable to load a key UNKNOWN"}');
  });

  it('should return true using Client.assume only when Strategy input values match', async function () {
    await switcher
      .checkValue('Canada') // result to be false
      .checkNetwork('10.0.0.3')
      .prepare('FF2FOR2020');

    assert.isFalse(await switcher.isItOn());
    Client.assume('FF2FOR2020').true()
      .when(StrategiesType.VALUE, 'Canada') // manipulate the condition to result to true
      .and(StrategiesType.NETWORK, '10.0.0.3');

    assert.isTrue(await switcher.isItOn());
  });

  it('should NOT return true using Client.assume when Strategy input values does not match', async function () {
    await switcher
      .checkValue('Japan')
      .checkNetwork('10.0.0.3')
      .prepare('FF2FOR2020');

    assert.isTrue(await switcher.isItOn());
    Client.assume('FF2FOR2020').true()
      .when(StrategiesType.VALUE, ['Brazil', 'Japan'])
      .and(StrategiesType.NETWORK, ['10.0.0.4', '192.168.0.1']);

    assert.isFalse(await switcher.isItOn());
  });

});

describe('Type placeholders:', function () {

  this.afterAll(function () {
    deleteGeneratedSnapshot('./generated-snapshots');
  });

  it('should check exported types', function () {
    const switcherContext = SwitcherContext.build();
    const switcherOptions = SwitcherOptions.build();

    assert.isTrue(switcherContext instanceof SwitcherContext);
    assert.isTrue(switcherOptions instanceof SwitcherOptions);

    assert.isNotNull(switcherContext);
    assert.isNotNull(switcherOptions);
  });
});

describe('E2E test - Restrict Relay:', function () {
  this.beforeAll(async function () {
    Client.buildContext(contextSettings, options);

    await Client.loadSnapshot();
  });

  this.afterAll(function () {
    Client.unloadSnapshot();
    TimedMatch.terminateWorker();
  });

  this.beforeEach(function () {
    Client.clearLogger();
  });

  it('should return false when Relay is enabled (restrict default: true)', async function () {
    Client.buildContext(contextSettings, {
      snapshotLocation: options.snapshotLocation, local: true
    });

    await Client.loadSnapshot();

    switcher = Client.getSwitcher();
    assert.isFalse(await switcher.isItOn('USECASE103'));
  });

  it('should return true when Relay is enabled (restrict: false)', async function () {
    Client.buildContext(contextSettings, {
      snapshotLocation: options.snapshotLocation, local: true, restrictRelay: false
    });

    await Client.loadSnapshot();

    switcher = Client.getSwitcher();
    assert.isTrue(await switcher.isItOn('USECASE103'));
  });

  it('should return true when Relay is disabled (restrict: true)', async function () {
    Client.buildContext(contextSettings, {
      snapshotLocation: options.snapshotLocation, local: true, restrictRelay: true
    });

    await Client.loadSnapshot();

    switcher = Client.getSwitcher();
    assert.isTrue(await switcher.isItOn('USECASE104'));
  });

});