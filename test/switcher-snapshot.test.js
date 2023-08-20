const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const assert = chai.assert;

const sinon = require('sinon');
const { Switcher } = require('../src/index');
const fetch = require('node-fetch');
const services = require('../src/lib/remote');
const fs = require('fs');
const { given, givenError, generateAuth, generateStatus } = require('./helper/utils');

describe('E2E test - Switcher offline - Snapshot:', function () {
  const apiKey = '[api_key]';
  const domain = 'Business';
  const component = 'business-service';
  const environment = 'dev';
  const url = 'http://localhost:3000';

  const dataBuffer = fs.readFileSync('./snapshot/dev.json');
  const dataJSON = dataBuffer.toString();

  let fetchStub;
  let clientAuth;
  let fsStub;

  afterEach(function() {
    if (fetchStub != undefined)
      fetchStub.restore();
    
    if (clientAuth != undefined)
      clientAuth.restore();

    if (fsStub != undefined)
      fsStub.restore();
  });

  beforeEach(function() {
    Switcher.buildContext({ url, apiKey, domain, component, environment }, {
      snapshotLocation: './snapshot/',
      offline: true,
      regexSafe: false
    });

    Switcher.setTestEnabled();
  });

  this.afterAll(function() {
    Switcher.unloadSnapshot();
  });

  it('should update snapshot', async function () {
    //given
    clientAuth = sinon.stub(services, 'auth');
    fetchStub = sinon.stub(fetch, 'Promise');

    clientAuth.returns(Promise.resolve({ json: () => generateAuth('[API_KEY]', 5), status: 200 }));
    given(fetchStub, 0, { json: () => generateStatus(false), status: 200 }); // Snapshot outdated
    given(fetchStub, 1, { json: () => JSON.parse(dataJSON), status: 200 });

    //test
    Switcher.buildContext({ url, apiKey, domain, component, environment }, {
      snapshotLocation: 'generated-snapshots/',
      offline: true,
      regexSafe: false
    });
    
    await Switcher.loadSnapshot(true);
    assert.isTrue(await Switcher.checkSnapshot());

    //restore state to avoid process leakage
    Switcher.unloadSnapshot();
    fs.unlinkSync(`generated-snapshots/${environment}.json`);
  });

  it('should update snapshot - store file', async function () {
    //given
    clientAuth = sinon.stub(services, 'auth');
    fetchStub = sinon.stub(fetch, 'Promise');

    clientAuth.returns(Promise.resolve({ json: () => generateAuth('[API_KEY]', 5), status: 200 }));
    given(fetchStub, 0, { json: () => generateStatus(false), status: 200 }); // Snapshot outdated
    given(fetchStub, 1, { json: () => JSON.parse(dataJSON), status: 200 });

    //test
    Switcher.buildContext({ url, apiKey, domain, component, environment }, {
      snapshotLocation: 'generated-snapshots/',
      offline: true,
      regexSafe: false
    });
    
    await Switcher.loadSnapshot(true);
    assert.isTrue(await Switcher.checkSnapshot());
    assert.isTrue(fs.existsSync(`generated-snapshots/${environment}.json`));

    //restore state to avoid process leakage
    Switcher.unloadSnapshot();
  });

  it('should NOT update snapshot', async function () {
    //given
    clientAuth = sinon.stub(services, 'auth');
    fetchStub = sinon.stub(fetch, 'Promise');

    clientAuth.returns(Promise.resolve({ json: () => generateAuth('[API_KEY]', 5) }));
    given(fetchStub, 0, { json: () => generateStatus(true), status: 200 }); // No available update
    
    //test
    await Switcher.loadSnapshot();
    assert.isFalse(await Switcher.checkSnapshot());
  });

  it('should NOT update snapshot - check Snapshot Error', async function () {
    this.timeout(3000);

    //given
    clientAuth = sinon.stub(services, 'auth');
    fetchStub = sinon.stub(fetch, 'Promise');

    clientAuth.returns(Promise.resolve({ json: () => generateAuth('[API_KEY]', 5), status: 200 }));
    givenError(fetchStub, 0, { errno: 'ECONNREFUSED' });
    
    //test
    Switcher.setTestEnabled();
    await Switcher.loadSnapshot();
    await assert.isRejected(Switcher.checkSnapshot(),
      'Something went wrong: Connection has been refused - ECONNREFUSED');
  });

  it('should NOT update snapshot - resolve Snapshot Error', async function () {
    //given
    clientAuth = sinon.stub(services, 'auth');
    fetchStub = sinon.stub(fetch, 'Promise');

    clientAuth.returns(Promise.resolve({ json: () => generateAuth('[API_KEY]', 5) }));
    given(fetchStub, 0, { json: () => generateStatus(false), status: 200 }); // Snapshot outdated
    givenError(fetchStub, 1, { errno: 'ECONNREFUSED' });
    
    //test
    Switcher.setTestEnabled();
    await Switcher.loadSnapshot();
    await assert.isRejected(Switcher.checkSnapshot(), 
      'Something went wrong: Connection has been refused - ECONNREFUSED');
  });

  it('should NOT check snapshot with success - Snapshot not loaded', async function () {
    //given
    clientAuth = sinon.stub(services, 'auth');
    fetchStub = sinon.stub(fetch, 'Promise');

    clientAuth.returns(Promise.resolve({ json: () => generateAuth('[API_KEY]', 5) }));
    given(fetchStub, 0, { json: () => generateStatus(true), status: 200 });
    
    //pre-load snapshot
    Switcher.setTestDisabled();
    await Switcher.loadSnapshot();
    assert.equal(await Switcher.checkSnapshot(), false);

    //unload snapshot
    Switcher.unloadSnapshot();
    
    //test
    let error = null;
    await Switcher.checkSnapshot().catch((err) => error = err);
    assert.exists(error);
    assert.equal(error.message, 'Something went wrong: Snapshot is not loaded. Use Switcher.loadSnapshot()');
  });

  it('should update snapshot', async function () {
    //given
    clientAuth = sinon.stub(services, 'auth');
    fetchStub = sinon.stub(fetch, 'Promise');

    clientAuth.returns(Promise.resolve({ json: () => generateAuth('[API_KEY]', 5) }));
    given(fetchStub, 0, { json: () => generateStatus(false), status: 200 }); // Snapshot outdated
    given(fetchStub, 1, { json: () => JSON.parse(dataJSON), status: 200 });

    //test
    Switcher.buildContext({ url, apiKey, domain, component, environment }, {
      snapshotLocation: 'generated-snapshots/'
    });

    await Switcher.loadSnapshot();
    assert.isNotNull(Switcher.snapshot);

    //restore state to avoid process leakage
    Switcher.unloadSnapshot();
    fs.unlinkSync(`generated-snapshots/${environment}.json`);
  });

  it('should not throw when switcher keys provided were configured properly', async function () {
    await Switcher.loadSnapshot();
    await assert.isFulfilled(Switcher.checkSwitchers(['FF2FOR2030']));
  });

  it('should throw when switcher keys provided were not configured properly', async function () {
    await Switcher.loadSnapshot();
    await assert.isRejected(Switcher.checkSwitchers(['FEATURE02']), 
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
  let clientAuth;
  let fsStub;

  afterEach(function() {
    if (fetchStub != undefined)
      fetchStub.restore();
    
    if (clientAuth != undefined)
      clientAuth.restore();

    if (fsStub != undefined)
      fsStub.restore();
  });

  beforeEach(function() {
    Switcher.buildContext({ url, apiKey, domain, component, environment }, {
      offline: true
    });
    Switcher.setTestEnabled();
  });

  this.afterAll(function() {
    Switcher.unloadSnapshot();
  });

  it('should NOT update snapshot - Too many requests at checkSnapshotVersion', async function () {
    //given
    clientAuth = sinon.stub(services, 'auth');
    fetchStub = sinon.stub(fetch, 'Promise');

    clientAuth.returns(Promise.resolve({ json: () => generateAuth('[API_KEY]', 5), status: 200 }));
    given(fetchStub, 0, { status: 429 })
    
    //test
    Switcher.setTestEnabled();
    await Switcher.loadSnapshot();
    await assert.isRejected(Switcher.checkSnapshot(),
      'Something went wrong: [checkSnapshotVersion] failed with status 429');
  });

  it('should NOT update snapshot - Too many requests at resolveSnapshot', async function () {
    //given
    clientAuth = sinon.stub(services, 'auth');
    fetchStub = sinon.stub(fetch, 'Promise');

    clientAuth.returns(Promise.resolve({ json: () => generateAuth('[API_KEY]', 5) }));
    given(fetchStub, 0, { json: () => generateStatus(false), status: 200 }); // Snapshot outdated
    given(fetchStub, 1, { status: 429 });

    //test
    Switcher.buildContext({ url, apiKey, domain, component, environment }, {
      snapshotLocation: 'generated-snapshots/',
      regexSafe: false
    });

    await assert.isRejected(Switcher.loadSnapshot(),
      'Something went wrong: [resolveSnapshot] failed with status 429');
  });

});

describe('E2E test - Snapshot AutoUpdater:', function () {
  const apiKey = '[api_key]';
  const domain = 'Business';
  const component = 'business-service';
  const environment = 'dev';
  const url = 'http://localhost:3000';

  const dataBuffer = fs.readFileSync('./snapshot/dev.json');
  const dataJSON = dataBuffer.toString();

  const dataBufferV2 = fs.readFileSync('./snapshot/dev_v2.json');
  const dataJSONV2 = dataBufferV2.toString();

  let fetchStub;
  let clientAuth;
  let fsStub;

  afterEach(function() {
    if (fetchStub != undefined)
      fetchStub.restore();
    
    if (clientAuth != undefined)
      clientAuth.restore();

    if (fsStub != undefined)
      fsStub.restore();
  });

  beforeEach(function() {
    Switcher.buildContext({ url, apiKey, domain, component, environment }, {
      offline: true
    });
    Switcher.setTestEnabled();
  });

  this.afterAll(function() {
    Switcher.terminateSnapshotAutoUpdate();
    Switcher.unloadSnapshot();
  });

  it('should auto update snapshot every second', async function () {
    this.timeout(3000);

    //given
    clientAuth = sinon.stub(services, 'auth');
    fetchStub = sinon.stub(fetch, 'Promise');

    clientAuth.returns(Promise.resolve({ json: () => generateAuth('[API_KEY]', 5), status: 200 }));
    given(fetchStub, 0, { json: () => generateStatus(false), status: 200 }); // Loading current version
    given(fetchStub, 1, { json: () => JSON.parse(dataJSON), status: 200 });
    given(fetchStub, 2, { json: () => generateStatus(false), status: 200 }); // Loading updated version
    given(fetchStub, 3, { json: () => JSON.parse(dataJSONV2), status: 200 });

    //test
    Switcher.buildContext({ url, apiKey, domain, component, environment }, {
      snapshotLocation: 'generated-snapshots/',
      offline: true,
      regexSafe: false,
      snapshotAutoUpdateInterval: 1
    });

    //optional (already set in the buildContext)
    Switcher.scheduleSnapshotAutoUpdate(1);
    
    await Switcher.loadSnapshot(false, true);

    const switcher = Switcher.factory();
    assert.isFalse(await switcher.isItOn('FF2FOR2030'));
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    assert.isTrue(await switcher.isItOn('FF2FOR2030'));
  });
});

describe('Error Scenarios - Snapshot', function() {
  const apiKey = '[api_key]';
  const domain = 'Business';
  const component = 'business-service';
  const environment = 'dev';
  const url = 'http://localhost:3000';

  it('should be invalid - Load snapshot was not called', async function () {
    Switcher.buildContext({ url, apiKey, domain, component, environment }, {
      offline: true, logger: true, regexSafe: false
    });
    
    const switcher = Switcher.factory();
    await assert.isRejected(switcher.isItOn('FF2FOR2030'), 
      'Snapshot not loaded. Try to use \'Switcher.loadSnapshot()\'');
  });
});