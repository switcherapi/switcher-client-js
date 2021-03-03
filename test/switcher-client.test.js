const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const assert = chai.assert;
const { Switcher, checkValue, checkNetwork } = require('../src/index');

describe('E2E test - Switcher offline:', function () {
  let switcher;
  const apiKey = '$2b$08$S2Wj/wG/Rfs3ij0xFbtgveDtyUAjML1/TOOhocDg5dhOaU73CEXfK';
  const domain = 'currency-api';
  const component = 'Android';
  const environment = 'default';
  const url = 'http://localhost:3000';

  this.beforeAll(async function() {
    Switcher.buildContext({ url, apiKey, domain, component, environment }, {
      offline: true, logger: true
    });

    await Switcher.loadSnapshot();
    switcher = Switcher.factory();
  });

  this.afterAll(function() {
    Switcher.unloadSnapshot();
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

  it('should be invalid - Input (IP) does not match', async function () {
    await switcher.prepare('FF2FOR2020', [
      checkValue('Japan'),
      checkNetwork('192.168.0.2')
    ]);

    const result = await switcher.isItOn();
    assert.isFalse(result);
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
    Switcher.buildContext({ url, apiKey, domain, component, environment }, {
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

    Switcher.buildContext({ url, apiKey, domain, component, environment }, {
      offline: true,
      snapshotLocation: '//somewhere/'
    });

    Switcher.setTestEnabled();
    await assert.isRejected(Switcher.loadSnapshot(), 
      'Something went wrong: It was not possible to load the file at //somewhere/');
  });

  it('should be valid - Offline mode', async function () {
    this.timeout(3000);

    Switcher.buildContext({ url, apiKey, domain, component, environment }, {
      offline: true,
      snapshotLocation: 'generated-snapshots/'
    });

    await assert.isFulfilled(Switcher.loadSnapshot());
    assert.isNotNull(Switcher.snapshot);
  });
});