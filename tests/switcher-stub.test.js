import { assert } from 'chai';

import { Client } from '../switcher-client.js';
import { StrategiesType } from '../src/lib/snapshot.js';
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

describe('E2E test - Client testing (stub) feature:', function () {
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
