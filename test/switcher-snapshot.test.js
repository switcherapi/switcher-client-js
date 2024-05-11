import { assert } from 'chai';
import { stub } from 'sinon';
import { readFileSync, unlinkSync, existsSync } from 'fs';

import { Client } from '../switcher-client.js';
import FetchFacade from '../src/lib/utils/fetchFacade.js';
import { given, givenError, generateAuth, generateStatus, assertReject, assertResolve, sleep, deleteGeneratedSnapshot } from './helper/utils.js';

describe('E2E test - Switcher local - Snapshot:', function () {
  const apiKey = '[api_key]';
  const domain = 'Business';
  const component = 'business-service';
  const environment = 'dev';
  const url = 'http://localhost:3000';

  const dataBuffer = readFileSync('./test/snapshot/dev.json');
  const dataJSON = dataBuffer.toString();

  let fetchStub;
  let fsStub;

  afterEach(function() {
    if (fetchStub != undefined)
      fetchStub.restore();

    if (fsStub != undefined)
      fsStub.restore();
  });

  beforeEach(function() {
    Client.buildContext({ url, apiKey, domain, component, environment }, {
      snapshotLocation: './test/snapshot/',
      local: true,
      regexSafe: false
    });

    Client.testMode();
  });

  this.afterAll(function() {
    Client.unloadSnapshot();
  });

  it('should update snapshot', async function () {
    //given
    fetchStub = stub(FetchFacade, 'fetch');

    given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });
    given(fetchStub, 1, { json: () => generateStatus(false), status: 200 }); // Snapshot outdated
    given(fetchStub, 2, { json: () => JSON.parse(dataJSON), status: 200 });

    //test
    Client.buildContext({ url, apiKey, domain, component, environment }, {
      snapshotLocation: 'generated-snapshots/',
      local: true,
      regexSafe: false
    });
    
    await Client.loadSnapshot(true);
    assert.isTrue(await Client.checkSnapshot());

    //restore state to avoid process leakage
    Client.unloadSnapshot();
    unlinkSync(`generated-snapshots/${environment}.json`);
  });

  it('should update snapshot - store file', async function () {
    //given
    fetchStub = stub(FetchFacade, 'fetch');

    given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });
    given(fetchStub, 1, { json: () => generateStatus(false), status: 200 }); // Snapshot outdated
    given(fetchStub, 2, { json: () => JSON.parse(dataJSON), status: 200 });

    //test
    Client.buildContext({ url, apiKey, domain, component, environment }, {
      snapshotLocation: 'generated-snapshots/',
      local: true,
      regexSafe: false
    });
    
    await Client.loadSnapshot(true);
    assert.isTrue(await Client.checkSnapshot());
    assert.isTrue(existsSync(`generated-snapshots/${environment}.json`));

    //restore state to avoid process leakage
    Client.unloadSnapshot();
  });

  it('should update snapshot during load - store file', async function () {
    //given
    fetchStub = stub(FetchFacade, 'fetch');

    given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });
    given(fetchStub, 1, { json: () => generateStatus(false), status: 200 }); // Snapshot outdated
    given(fetchStub, 2, { json: () => JSON.parse(dataJSON), status: 200 });

    //test
    Client.buildContext({ url, apiKey, domain, component, environment }, {
      snapshotLocation: 'generated-snapshots/',
      local: true,
      regexSafe: false
    });
    
    await Client.loadSnapshot(true, true);
    assert.isTrue(existsSync(`generated-snapshots/${environment}.json`));

    //restore state to avoid process leakage
    Client.unloadSnapshot();
  });

  it('should NOT update snapshot', async function () {
    //given
    fetchStub = stub(FetchFacade, 'fetch');

    given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });
    given(fetchStub, 1, { json: () => generateStatus(true), status: 200 }); // No available update
    
    //test
    await Client.loadSnapshot();
    assert.isFalse(await Client.checkSnapshot());
  });

  it('should NOT update snapshot - check Snapshot Error', async function () {
    this.timeout(3000);

    //given
    fetchStub = stub(FetchFacade, 'fetch');

    given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });
    givenError(fetchStub, 1, { errno: 'ECONNREFUSED' });
    
    //test
    Client.testMode();
    await Client.loadSnapshot();
    await assertReject(assert, Client.checkSnapshot(), 
      'Something went wrong: Connection has been refused - ECONNREFUSED');
  });

  it('should NOT update snapshot - resolve Snapshot Error', async function () {
    //given
    fetchStub = stub(FetchFacade, 'fetch');

    given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });
    given(fetchStub, 1, { json: () => generateStatus(false), status: 200 }); // Snapshot outdated
    givenError(fetchStub, 2, { errno: 'ECONNREFUSED' });
    
    //test
    Client.testMode();
    await Client.loadSnapshot();
    await assertReject(assert, Client.checkSnapshot(), 
      'Something went wrong: Connection has been refused - ECONNREFUSED');
  });

  it('should NOT check snapshot with success - Snapshot not loaded', async function () {
    //given
    fetchStub = stub(FetchFacade, 'fetch');

    given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });
    given(fetchStub, 1, { json: () => generateStatus(true), status: 200 });
    
    //pre-load snapshot
    Client.testMode(false);
    await Client.loadSnapshot();
    assert.equal(await Client.checkSnapshot(), false);

    //unload snapshot
    Client.unloadSnapshot();
    
    //test
    let error = null;
    await Client.checkSnapshot().catch((err) => error = err);
    assert.exists(error);
    assert.equal(error.message, 'Something went wrong: Snapshot is not loaded. Use Client.loadSnapshot()');
  });

  it('should update snapshot', async function () {
    //given
    fetchStub = stub(FetchFacade, 'fetch');

    given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });
    given(fetchStub, 1, { json: () => generateStatus(false), status: 200 }); // Snapshot outdated
    given(fetchStub, 2, { json: () => JSON.parse(dataJSON), status: 200 });

    //test
    Client.buildContext({ url, apiKey, domain, component, environment }, {
      snapshotLocation: 'generated-snapshots/'
    });

    await Client.loadSnapshot();
    assert.isNotNull(Client.snapshot);

    //restore state to avoid process leakage
    Client.unloadSnapshot();
    unlinkSync(`generated-snapshots/${environment}.json`);
  });

  it('should not throw when switcher keys provided were configured properly', async function () {
    await Client.loadSnapshot();
    await assertResolve(assert, Client.checkSwitchers(['FF2FOR2030']));
  });

  it('should throw when switcher keys provided were not configured properly', async function () {
    await Client.loadSnapshot();
    await assertReject(assert, Client.checkSwitchers(['FEATURE02']),
      'Something went wrong: [FEATURE02] not found');
  });
  
});

describe('E2E test - Fail response - Snapshot:', function () {
  const apiKey = '[api_key]';
  const domain = 'Business';
  const component = 'business-service';
  const environment = 'dev';
  const url = 'http://localhost:3000';

  let fetchStub;
  let fsStub;

  afterEach(function() {
    if (fetchStub != undefined)
      fetchStub.restore();

    if (fsStub != undefined)
      fsStub.restore();
  });

  beforeEach(function() {
    Client.buildContext({ url, apiKey, domain, component, environment }, {
      local: true
    });
    Client.testMode();
  });

  this.afterAll(function() {
    Client.unloadSnapshot();
  });

  it('should NOT update snapshot - Too many requests at checkSnapshotVersion', async function () {
    //given
    fetchStub = stub(FetchFacade, 'fetch');

    given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });
    given(fetchStub, 1, { status: 429 });
    
    //test
    Client.testMode();
    await Client.loadSnapshot();
    await assertReject(assert, Client.checkSnapshot(),
      'Something went wrong: [checkSnapshotVersion] failed with status 429');
  });

  it('should NOT update snapshot - Too many requests at resolveSnapshot', async function () {
    //given
    fetchStub = stub(FetchFacade, 'fetch');

    given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });
    given(fetchStub, 1, { json: () => generateStatus(false), status: 200 }); // Snapshot outdated
    given(fetchStub, 2, { status: 429 });

    //test
    Client.buildContext({ url, apiKey, domain, component, environment }, {
      snapshotLocation: 'generated-snapshots/',
      regexSafe: false
    });

    await assertReject(assert, Client.loadSnapshot(),
      'Something went wrong: [resolveSnapshot] failed with status 429');
  });

});

describe('E2E test - Snapshot AutoUpdater:', function () {
  const apiKey = '[api_key]';
  const domain = 'Business';
  const component = 'business-service';
  const environment = 'dev';
  const url = 'http://localhost:3000';

  const dataBuffer = readFileSync('./test/snapshot/dev.json');
  const dataJSON = dataBuffer.toString();

  const dataBufferV2 = readFileSync('./test/snapshot/dev_v2.json');
  const dataJSONV2 = dataBufferV2.toString();

  let fetchStub;
  let fsStub;

  afterEach(function() {
    if (fetchStub != undefined)
      fetchStub.restore();

    if (fsStub != undefined)
      fsStub.restore();
  });

  beforeEach(function() {
    Client.buildContext({ url, apiKey, domain, component, environment }, {
      local: true
    });
    Client.testMode();
  });

  this.afterAll(function() {
    Client.terminateSnapshotAutoUpdate();
    Client.unloadSnapshot();
  });

  it('should auto update snapshot every second', async function () {
    this.timeout(3000);

    //given
    fetchStub = stub(FetchFacade, 'fetch');

    given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });
    given(fetchStub, 1, { json: () => generateStatus(false), status: 200 }); // Loading current version
    given(fetchStub, 2, { json: () => JSON.parse(dataJSON), status: 200 });
    given(fetchStub, 3, { json: () => generateStatus(false), status: 200 }); // Loading updated version
    given(fetchStub, 4, { json: () => JSON.parse(dataJSONV2), status: 200 });

    //test
    Client.buildContext({ url, apiKey, domain, component, environment }, {
      snapshotLocation: 'generated-snapshots/',
      local: true,
      regexSafe: false,
      snapshotAutoUpdateInterval: 1
    });

    let snapshotUpdated = false;
    Client.scheduleSnapshotAutoUpdate(1, (updated) => {
      if (updated != undefined) {
        snapshotUpdated = updated;
      }
    });
    
    await Client.loadSnapshot(false, true);

    const switcher = Client.getSwitcher();
    assert.isFalse(await switcher.isItOn('FF2FOR2030'));
    
    await sleep(2000);

    assert.isTrue(snapshotUpdated);
    assert.isTrue(await switcher.isItOn('FF2FOR2030'));
  });

  it('should NOT auto update snapshot ', async function () {
    this.timeout(3000);
    fetchStub = stub(FetchFacade, 'fetch');

    //given
    given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });
    given(fetchStub, 1, { json: () => generateStatus(false), status: 200 });
    given(fetchStub, 2, { json: () => JSON.parse(dataJSON), status: 200 });

    //test
    Client.buildContext({ url, apiKey, domain, component, environment }, {
      local: true,
      regexSafe: false
    });

    let error;
    Client.scheduleSnapshotAutoUpdate(1, (updated, err) => {
      if (err != undefined) {
        error = err;
      }
    });
    
    await Client.loadSnapshot(false, true);

    //next call will fail
    givenError(fetchStub, 3, { errno: 'ECONNREFUSED' });
    
    await sleep(2000);

    assert.exists(error);
    assert.equal(error.message, 'Something went wrong: Connection has been refused - ECONNREFUSED');

    //tearDown
    Client.terminateSnapshotAutoUpdate();
  });

});

describe('Error Scenarios - Snapshot', function() {
  const apiKey = '[api_key]';
  const domain = 'Business';
  const component = 'business-service';
  const environment = 'dev';
  const url = 'http://localhost:3000';

  this.afterAll(function() {
    deleteGeneratedSnapshot('./generated-snapshots');
  });

  it('should be invalid - Load snapshot was not called', async function () {
    Client.buildContext({ url, apiKey, domain, component, environment }, {
      local: true, logger: true, regexSafe: false
    });
    
    const switcher = Client.getSwitcher();
    await assertReject(assert, switcher.isItOn('FF2FOR2030'), 
      'Snapshot not loaded. Try to use \'Client.loadSnapshot()\'' );
  });
});