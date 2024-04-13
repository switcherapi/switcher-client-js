import { rmdir } from 'fs';
import { assert } from 'chai';

import { Switcher, checkValue, checkNetwork, checkPayload, checkRegex } from '../switcher-client.js';
import { StrategiesType } from '../src/lib/snapshot.js';
import { assertReject, assertResolve } from './helper/utils.js';

describe('E2E test - Switcher local:', function () {
  let switcher;

  const contextSettings = {
    apiKey: '[api_key]',
    domain: 'Business',
    component: 'business-service',
    environment: 'default',
    url: 'http://localhost:3000'
  };

  const options = {
    snapshotLocation: './snapshot/',
    local: true, 
    logger: true, 
    regexMaxBlackList: 1, 
    regexMaxTimeLimit: 500
  };

  this.beforeAll(async function() {
    Switcher.buildContext(contextSettings, options);

    await Switcher.loadSnapshot();
    switcher = Switcher.factory();
  });

  this.afterAll(function() {
    Switcher.unloadSnapshot();
    rmdir('//somewhere/', () => {
      return;
    });
  });

  this.beforeEach(function() {
    Switcher.clearLogger();
    switcher = Switcher.factory();
  });

  it('should be valid - isItOn', async function () {
    await switcher.prepare('FF2FOR2020', [
      checkValue('Japan'),
      checkNetwork('10.0.0.3')
    ]);

    const result = await switcher.isItOn('FF2FOR2020');
    assert.isTrue(result);
    assert.isNotEmpty(Switcher.getLogger('FF2FOR2020'));
  });

  it('should be valid - isItOn - with detail', async function () {
    const response = await switcher.detail().isItOn('FF2FOR2020', [
      checkValue('Japan'),
      checkNetwork('10.0.0.3')
    ]);

    assert.isTrue(response.result);
    assert.equal(response.reason, 'Success');
  });

  it('should be valid - No prepare function needed', async function () {
    const result = await switcher.isItOn('FF2FOR2020', [
      checkValue('Japan'),
      checkNetwork('10.0.0.3')
    ]);
    assert.isTrue(result);
  });

  it('should be valid - No prepare function needed (no input as well)', async function () {
    const result = await switcher.isItOn('FF2FOR2030');
    assert.isTrue(result);
  });

  it('should be valid - Switcher strategy disabled', async function () {
    const result = await switcher.isItOn('FF2FOR2021', [checkNetwork('192.168.0.1')]);
    assert.isTrue(result);
  });

  it('should be valid - No Switcher strategy', async function () {
    const result = await switcher.isItOn('FF2FOR2022');
    assert.isTrue(result);
  });

  it('should be valid - JSON Payload matches all keys', async function () {
    await switcher.prepare('FF2FOR2023', [
      checkPayload(JSON.stringify({
        id: 1,
        user: {
          login: 'USER_LOGIN',
          role: 'ADMIN'
        }
      }))
    ]);

    const result = await switcher.isItOn();
    assert.isTrue(result);
  });

  it('should be invalid - REGEX failed to perform in time', async function () {
    const getTimer = (timer) => (timer - Date.now()) * -1;

    let timer = Date.now();
    const result = await switcher.isItOn('FF2FOR2024', [checkRegex('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')]);
    timer = getTimer(timer);

    assert.isFalse(result);
    assert.isAbove(timer, 500);
    assert.isBelow(timer, 600);
  });

  it('should be invalid - JSON Payload does NOT match all keys', async function () {
    await switcher.prepare('FF2FOR2023', [
      checkPayload(JSON.stringify({
        id: 1,
        user: {
          login: 'USER_LOGIN'
        }
      }))
    ]);

    const result = await switcher.isItOn();
    assert.isFalse(result);
    assert.equal(Switcher.getLogger('FF2FOR2023')[0].response.reason, 
      `Strategy '${StrategiesType.PAYLOAD}' does not agree`);
  });

  it('should be invalid - Input (IP) does not match', async function () {
    await switcher.prepare('FF2FOR2020', [
      checkValue('Japan'),
      checkNetwork('192.168.0.2')
    ]);

    const result = await switcher.isItOn();
    assert.isFalse(result);
    assert.equal(Switcher.getLogger('FF2FOR2020')[0].response.reason, 
      `Strategy '${StrategiesType.NETWORK}' does not agree`);
  });

  it('should be invalid - Input not provided', async function () {
    const result = await switcher.isItOn('FF2FOR2020');
    assert.isFalse(result);
    assert.equal(Switcher.getLogger('FF2FOR2020')[0].response.reason, 
      `Strategy '${StrategiesType.NETWORK}' did not receive any input`);
  });

  it('should be invalid - Switcher config disabled', async function () {
    const result = await switcher.isItOn('FF2FOR2031');
    assert.isFalse(result);
    assert.equal(Switcher.getLogger('FF2FOR2031')[0].response.reason, 
      'Config disabled');
  });

  it('should be invalid - Switcher group disabled', async function () {
    const result = await switcher.isItOn('FF2FOR2040');
    assert.isFalse(result);
    assert.equal(Switcher.getLogger('FF2FOR2040')[0].response.reason, 
      'Group disabled');
  });

  it('should be valid assuming key to be false and then forgetting it', async function () {
    await switcher.prepare('FF2FOR2020', [
      checkValue('Japan'),
      checkNetwork('10.0.0.3')
    ]);
    
    assert.isTrue(await switcher.isItOn());
    Switcher.assume('FF2FOR2020').false();
    assert.isFalse(await switcher.isItOn());
    
    Switcher.forget('FF2FOR2020');
    assert.isTrue(await switcher.isItOn());
  });

  it('should be valid assuming key to be false - with details', async function () {
    Switcher.assume('FF2FOR2020').false();
    const { result, reason } = await switcher.detail().isItOn('FF2FOR2020');

    assert.isFalse(result);
    assert.equal(reason, 'Forced to false');
  });

  it('should be valid assuming key to be false - with metadata', async function () {
    Switcher.assume('FF2FOR2020').false().withMetadata({ value: 'something' });
    const { result, reason, metadata } = await switcher.detail().isItOn('FF2FOR2020');

    assert.isFalse(result);
    assert.equal(reason, 'Forced to false');
    assert.deepEqual(metadata, { value: 'something' });
  });

  it('should be valid assuming unknown key to be true', async function () {
    await switcher.prepare('UNKNOWN', [
      checkValue('Japan'),
      checkNetwork('10.0.0.3')
    ]);
    
    Switcher.assume('UNKNOWN').true();
    assert.isTrue(await switcher.isItOn());

    Switcher.forget('UNKNOWN');
    await assertReject(assert, switcher.isItOn(), 'Something went wrong: {"error":"Unable to load a key UNKNOWN"}');
  });

  it('should enable test mode which will prevent a snapshot to be watchable', async function () {
    //given
    Switcher.buildContext(contextSettings, {
      local: true, logger: true, regexSafe: false
    });

    switcher = Switcher.factory();
    
    //test
    Switcher.assume('FF2FOR2020').false();
    assert.isFalse(await switcher.isItOn('FF2FOR2020'));
    Switcher.assume('FF2FOR2020').true();
    assert.isTrue(await switcher.isItOn('FF2FOR2020'));
  });

  it('should be invalid - Offline mode cannot load snapshot from an invalid path', async function () {
    this.timeout(3000);

    Switcher.buildContext(contextSettings, {
      local: true,
      regexSafe: false,
      snapshotLocation: '//somewhere/'
    });

    Switcher.setTestEnabled();
    await assertReject(assert, Switcher.loadSnapshot(), 'Something went wrong: It was not possible to load the file at //somewhere/');
  });

  it('should be valid - Offline mode', async function () {
    this.timeout(3000);

    Switcher.buildContext(contextSettings, {
      local: true,
      regexSafe: false,
      snapshotLocation: 'generated-snapshots/'
    });

    await assertResolve(assert, Switcher.loadSnapshot());
    assert.isNotNull(Switcher.snapshot);
  });
});