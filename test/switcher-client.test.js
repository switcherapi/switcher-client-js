const fs = require('fs');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const assert = chai.assert;
const { Switcher, checkValue, checkNetwork, checkPayload, checkRegex } = require('../src/index');
const { StrategiesType } = require('../src/lib/snapshot');

describe('E2E test - Switcher offline:', function () {
  let switcher;

  const contextSettings = {
    apiKey: '[api_key]',
    domain: 'Business',
    component: 'business-service',
    environment: 'default',
    url: 'http://localhost:3000'
  };

  this.beforeAll(async function() {
    Switcher.buildContext(contextSettings, {
      offline: true, logger: true, regexMaxBlackList: 1, regexMaxTimeLimit: 500
    });

    await Switcher.loadSnapshot();
    switcher = Switcher.factory();
  });

  this.afterAll(function() {
    Switcher.unloadSnapshot();
    fs.rmdir('//somewhere/', () => {
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

  it('should be valid assuming unknown key to be true', async function () {
    await switcher.prepare('UNKNOWN', [
      checkValue('Japan'),
      checkNetwork('10.0.0.3')
    ]);
    
    Switcher.assume('UNKNOWN').true();
    assert.isTrue(await switcher.isItOn());

    Switcher.forget('UNKNOWN');
    await assert.isRejected(switcher.isItOn(), 
      'Something went wrong: {"error":"Unable to load a key UNKNOWN"}');
  });

  it('should enable test mode which will prevent a snapshot to be watchable', async function () {
    //given
    Switcher.buildContext(contextSettings, {
      offline: true, logger: true
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
      offline: true,
      snapshotLocation: '//somewhere/'
    });

    Switcher.setTestEnabled();
    await assert.isRejected(Switcher.loadSnapshot(), 
      'Something went wrong: It was not possible to load the file at //somewhere/');
  });

  it('should be valid - Offline mode', async function () {
    this.timeout(3000);

    Switcher.buildContext(contextSettings, {
      offline: true,
      snapshotLocation: 'generated-snapshots/'
    });

    await assert.isFulfilled(Switcher.loadSnapshot());
    assert.isNotNull(Switcher.snapshot);
  });
});