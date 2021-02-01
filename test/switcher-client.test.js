const assert = require('chai').assert;
const sinon = require('sinon');
const Switcher = require('../src/index');
const axios = require('axios');
const services = require('../src/lib/services');
const fs = require('fs');

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
    await switcher.prepare('FF2FOR2020', [Switcher.StrategiesType.VALUE, 'Japan', Switcher.StrategiesType.NETWORK, '10.0.0.3']);
    switcher.isItOn('FF2FOR2020').then(function (result) {
      assert.isTrue(result);
      assert.isNotEmpty(Switcher.getLogger('FF2FOR2020'));
    }, function (error) {
      assert.isUndefined(error);
    });
  });

  it('should be valid - No prepare function called', async function () {
    switcher.isItOn('FF2FOR2020', [Switcher.StrategiesType.VALUE, 'Japan', Switcher.StrategiesType.NETWORK, '10.0.0.3']).then(function (result) {
      assert.isTrue(result);
    }, function (error) {
      assert.isUndefined(error);
    });
  });

  it('should be valid - No prepare function called (no input as well)', function () {
    switcher.isItOn('FF2FOR2030').then(function (result) {
      assert.isTrue(result);
    }, function (error) {
      assert.isUndefined(error);
    });
  });

  it('should be invalid - Input (IP) does not match', async function () {
    await switcher.prepare('FF2FOR2020', [Switcher.StrategiesType.VALUE, 'Japan', Switcher.StrategiesType.NETWORK, '192.168.0.2']);
    switcher.isItOn().then(function (result) {
      assert.isFalse(result);
    }, function (error) {
      assert.isUndefined(error);
    });
  });

  it('should be valid assuming key to be false and then forgetting it', async function () {
    await Switcher.loadSnapshot();
    await switcher.prepare('FF2FOR2020', [Switcher.StrategiesType.VALUE, 'Japan', Switcher.StrategiesType.NETWORK, '10.0.0.3']);
    
    assert.isTrue(await switcher.isItOn());
    Switcher.assume('FF2FOR2020').false();
    Switcher.assume('FF2FOR2020').false();
    assert.isFalse(await switcher.isItOn());
    Switcher.forget('FF2FOR2020');
    assert.isTrue(await switcher.isItOn());
  });

  it('should be valid assuming unknown key to be true', async function () {
    await switcher.prepare('UNKNOWN', [Switcher.StrategiesType.VALUE, 'Japan', Switcher.StrategiesType.NETWORK, '10.0.0.3']);
    
    Switcher.assume('UNKNOWN').true();
    assert.isTrue(await switcher.isItOn());

    Switcher.forget('UNKNOWN');
    switcher.isItOn().then(function (result) {
      assert.isUndefined(result);
    }, function (error) {
      assert.equal('Something went wrong: {"error":"Unable to load a key UNKNOWN"}', error.message);
    });
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

    try {
      Switcher.buildContext({ url, apiKey, domain, component, environment }, {
        offline: true,
        snapshotLocation: '//somewhere/'
      });

      Switcher.setTestEnabled();
      await Switcher.loadSnapshot();
    } catch (error) {
      assert.equal('Something went wrong: It was not possible to load the file at //somewhere/', error.message);
    }
  });

  it('should be valid - Offline mode', async function () {
    this.timeout(3000);

    try {
      Switcher.buildContext({ url, apiKey, domain, component, environment }, {
        offline: true,
        snapshotLocation: 'generated-snapshots/'
      });

      await Switcher.loadSnapshot();
      assert.isNotNull(Switcher.snapshot);
    } catch (error) {
      assert.equal('Something went wrong: It was not possible to load the file at generated-snapshots/', error.message);
    }
  });
});

describe('Unit test - Switcher:', function () {

  this.afterAll(function() {
    fs.unwatchFile('./snapshot/default.json');
  });

  this.beforeEach(function() {
    Switcher.setTestEnabled();
  });

  describe('check criteria:', function () {

    let healthStub;
    let requestStub;
    let clientAuth;

    beforeEach(function() {
      healthStub = sinon.stub(axios, 'get');
      requestStub = sinon.stub(axios, 'post');
      clientAuth = sinon.stub(services, 'auth');
    });
  
    afterEach(function() {
      healthStub.restore();
      requestStub.restore();
      clientAuth.restore();
    });

    it('should be valid', async function () {
      // given API responding properly
      healthStub.returns(Promise.resolve({ data: { code: 200 } }));
      requestStub.returns(Promise.resolve({ data: { result: true } }));
      clientAuth.returns(Promise.resolve({ data: { token: 'uqwu1u8qj18j28wj28', exp: (Date.now()+5000)/1000 } }));

      // test
      Switcher.buildContext({ url: 'url', apiKey: 'apiKey', domain: 'domain', component: 'component', environment: 'default' });
      let switcher = Switcher.factory();
      
      await switcher.prepare('FLAG_1', [Switcher.StrategiesType.VALUE, 'User 1', Switcher.StrategiesType.NETWORK, '192.168.0.1']);
      assert.isTrue(await switcher.isItOn());
    });
    
    it('should renew the token after expiration', async function () {
      this.timeout(3000);

      // given API responding properly
      healthStub.returns(Promise.resolve({ data: { code: 200 } }));
      requestStub.returns(Promise.resolve({ data: { result: true } }));
      clientAuth.returns(Promise.resolve({ data: { token: 'uqwu1u8qj18j28wj28', exp: (Date.now()+1000)/1000 } }));

      Switcher.buildContext({ url: 'url', apiKey: 'apiKey', domain: 'domain', component: 'component', environment: 'default' });
      let switcher = Switcher.factory();
      const spyPrepare = sinon.spy(switcher, 'prepare');

      // Prepare the call generating the token
      await switcher.prepare('MY_FLAG');
      await switcher.isItOn();

      // The program delay 2 secs later for the next call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Prepare the stub to provide the new token
      clientAuth.returns(Promise.resolve({ data: { token: 'asdad12d2232d2323f', exp: (Date.now()+1000)/1000 } }));

      // In this time period the expiration time has reached, it should call prepare once again to renew the token
      await switcher.isItOn();
      assert.equal(spyPrepare.callCount, 2);

      // In the meantime another call is made by the time the token is still not expired, so there is no need to call prepare again
      await switcher.isItOn();
      assert.equal(spyPrepare.callCount, 2);
    });

    it('should be valid - when sending key without calling prepare', async function () {
      // given API responding properly
      healthStub.returns(Promise.resolve({ data: { code: 200 } }));
      requestStub.returns(Promise.resolve({ data: { result: true } }));
      clientAuth.returns(Promise.resolve({ data: { token: 'uqwu1u8qj18j28wj28', exp: (Date.now()+5000)/1000 } }));

      // test
      Switcher.buildContext({ url: 'url', apiKey: 'apiKey', domain: 'domain', component: 'component', environment: 'default' });
      let switcher = Switcher.factory();
      assert.isTrue(await switcher.isItOn('MY_FLAG', [Switcher.StrategiesType.VALUE, 'User 1', Switcher.StrategiesType.NETWORK, '192.168.0.1']));
    });

    it('should be valid - when preparing key and sending input strategy afterwards', async function () {
      // given API responding properly
      healthStub.returns(Promise.resolve({ data: { code: 200 } }));
      requestStub.returns(Promise.resolve({ data: { result: true } }));
      clientAuth.returns(Promise.resolve({ data: { token: 'uqwu1u8qj18j28wj28', exp: (Date.now()+5000)/1000 } }));

      // test
      Switcher.buildContext({ url: 'url', apiKey: 'apiKey', domain: 'domain', component: 'component', environment: 'default' });
      let switcher = Switcher.factory();
      await switcher.prepare('MY_FLAG');
      assert.isTrue(await switcher.isItOn(undefined, [Switcher.StrategiesType.VALUE, 'User 1', Switcher.StrategiesType.NETWORK, '192.168.0.1']));
    });

    it('should be invalid - Missing url field', async function () {
      // given
      clientAuth.returns(Promise.resolve({ data: { token: 'uqwu1u8qj18j28wj28', exp: (Date.now()+5000)/1000 } }));

      // test
      Switcher.buildContext({ url: 'url', apiKey: 'apiKey', domain: 'domain', component: 'component', environment: 'default' });
      let switcher = Switcher.factory();

      await switcher.prepare('MY_FLAG', [Switcher.StrategiesType.VALUE, 'User 1', Switcher.StrategiesType.NETWORK, '192.168.0.1']);
      switcher.isItOn().then(function (result) {
        assert.isUndefined(result);
      }, function (error) {
        assert.equal('Something went wrong: Missing url field', error.message);
      });
    });

    it('should be invalid - Missing API Key field', async function () {
      // given
      clientAuth.returns(Promise.resolve({ data: { token: 'uqwu1u8qj18j28wj28', exp: (Date.now()+5000)/1000 } }));

      // test
      Switcher.buildContext({ url: 'url', apiKey: undefined, domain: 'domain', component: 'component', environment: 'default' });
      let switcher = Switcher.factory();

      await switcher.prepare('MY_FLAG', [Switcher.StrategiesType.VALUE, 'User 1', Switcher.StrategiesType.NETWORK, '192.168.0.1']);
      switcher.isItOn().then(function (result) {
        assert.isUndefined(result);
      }, function (error) {
        assert.equal('Something went wrong: Missing API Key field', error.message);
      });
    });

    it('should be invalid - Missing key field', async function () {
      // given
      requestStub.returns(Promise.resolve({ data: { result: undefined } }));
      clientAuth.returns(Promise.resolve({ data: { token: 'uqwu1u8qj18j28wj28', exp: (Date.now()+5000)/1000 } }));

      // test
      Switcher.buildContext({ url: 'url', apiKey: 'apiKey', domain: 'domain', component: 'component', environment: 'default' });
      let switcher = Switcher.factory();
      await switcher.prepare(undefined, [Switcher.StrategiesType.VALUE, 'User 1', Switcher.StrategiesType.NETWORK, '192.168.0.1']);
      
      switcher.isItOn().then(function (result) {
        assert.isUndefined(result);
      }, function (error) {
        assert.equal('Something went wrong: Missing key field', error.message);
      });
    });

    it('should be invalid - Missing component field', async function () {
      // given
      requestStub.returns(Promise.resolve({ data: { result: undefined } }));
      clientAuth.returns(Promise.resolve({ data: { token: 'uqwu1u8qj18j28wj28', exp: (Date.now()+5000)/1000 } }));

      // test
      Switcher.buildContext({ url: 'url', apiKey: 'apiKey', domain: 'domain', component: undefined, environment: 'default' });
      let switcher = Switcher.factory();
      switcher.isItOn('MY_FLAG', [Switcher.StrategiesType.VALUE, 'User 1', Switcher.StrategiesType.NETWORK, '192.168.0.1']).then(function (result) {
        assert.isUndefined(result);
      }, function (error) {
        assert.equal('Something went wrong: Missing component field', error.message);
      });
    });

    it('should be invalid - Missing token field', async function () {
      // given
      requestStub.returns(Promise.resolve({ data: { result: undefined } }));
      clientAuth.returns(Promise.resolve({ data: { token: undefined, exp: (Date.now()+5000)/1000 } }));

      // test
      Switcher.buildContext({ url: 'url', apiKey: 'apiKey', domain: 'domain', component: 'component', environment: 'default' });
      let switcher = Switcher.factory();
      switcher.isItOn('MY_FLAG', [Switcher.StrategiesType.VALUE, 'User 1', Switcher.StrategiesType.NETWORK, '192.168.0.1']).then(function (result) {
        assert.isUndefined(result);
      }, function (error) {
        assert.equal('Something went wrong: Missing token field', error.message);
      });
    });

    it('should be invalid - bad strategy input', async function () {
      // given
      requestStub.returns(Promise.resolve({ result: undefined }));
      clientAuth.returns(Promise.resolve({ data: { token: 'uqwu1u8qj18j28wj28', exp: (Date.now()+5000)/1000 } }));

      // test
      Switcher.buildContext({ url: 'url', apiKey: 'apiKey', domain: 'domain', component: 'component', environment: 'default' });
      let switcher = Switcher.factory();
      await switcher.prepare('MY_WRONG_FLAG', ['THIS IS WRONG']);
      switcher.isItOn().then(function (result) {
        assert.isUndefined(result);
      }, function (error) {
        assert.equal('Something went wrong: Invalid input format for \'THIS IS WRONG\'', error.message);
      });
    });

    it('should run in silent mode', async function () {
      this.timeout(5000);

      // given: API offline
      healthStub.throws({ errno: 'ECONNREFUSED' });

      // setup context to read the snapshot in case the API not respond
      Switcher.buildContext({ url: 'url', apiKey: 'apiKey', domain: 'domain', component: 'component', environment: 'default' }, {
        silentMode: true,
        retryAfter: '1s'
      });
      
      let switcher = Switcher.factory();
      const spyPrepare = sinon.spy(switcher, 'prepare');

      // First attempt to reach the API - Since it's configured to use silent mode, it should return true (according to the snapshot)
      let result = await switcher.isItOn('FF2FOR2030');
      assert.equal(result, true);

      await new Promise(resolve => setTimeout(resolve, 500));
      // The call below is in silent mode. It is getting the configuration from the offline snapshot again
      result = await switcher.isItOn();
      assert.equal(result, true);

      // As the silent mode was configured to retry after 3 seconds, it's still in time, 
      // therefore, prepare was never called
      assert.equal(spyPrepare.callCount, 0);

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Silent mode has expired. Again, the online API is still offline. Prepare cannot be invoked
      result = await switcher.isItOn();
      assert.equal(result, true);
      assert.equal(spyPrepare.callCount, 0);

      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Setup the online mocked response and made it to return false just to make sure it's not fetching into the snapshot
      healthStub.returns(Promise.resolve({ data: { code: 200 } }));
      requestStub.returns(Promise.resolve({ data: { result: false } }));
      clientAuth.returns(Promise.resolve({ data : { token: 'uqwu1u8qj18j28wj28', exp: (Date.now()+5000)/1000 } }));

      result = await switcher.isItOn();
      assert.equal(result, false);
    });

    it('should throw error if not in silent mode', async function () {
      // given
      requestStub.restore();
      clientAuth.restore();
      requestStub = sinon.stub(axios, 'post');
      
      requestStub.throws({
        errno: 'ECONNREFUSED'
      });

      // test
      Switcher.buildContext({ url: 'url', apiKey: 'apiKey', domain: 'domain', component: 'component', environment: 'default' });
      let switcher = Switcher.factory();

      await switcher.isItOn('FF2FOR2030').then(function (result) {
        assert.isUndefined(result);
      }, function (error) {
        assert.equal('Something went wrong: Connection has been refused - ECONNREFUSED', error.message);
      });
    });

    it('should run in silent mode when API is unavailable', async function () {
      // given: API unavailable
      healthStub.returns(Promise.resolve({ data: { code: 503 } }));

      // test
      Switcher.buildContext({ url: 'url', apiKey: 'apiKey', domain: 'domain', component: 'component', environment: 'default' }, {
        silentMode: true
      });

      let switcher = Switcher.factory();
      const result = await switcher.isItOn('FF2FOR2030');
      assert.equal(result, true);
    });

  });

});

describe('E2E test - Switcher offline - Snapshot:', function () {
  const apiKey = '$2b$08$S2Wj/wG/Rfs3ij0xFbtgveDtyUAjML1/TOOhocDg5dhOaU73CEXfK';
  const domain = 'currency-api';
  const component = 'Android';
  const environment = 'dev';
  const url = 'http://localhost:3000';

  const dataBuffer = fs.readFileSync('./snapshot/dev.json');
  const dataJSON = dataBuffer.toString();

  let requestGetStub;
  let requestPostStub;
  let clientAuth;
  let fsStub;

  afterEach(function() {
    if (requestGetStub != undefined)
      requestGetStub.restore();
    
    if (requestPostStub != undefined)
      requestPostStub.restore();
    
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

  it('should update snapshot', async function () {
    // Mock starts
    clientAuth = sinon.stub(services, 'auth');
    requestGetStub = sinon.stub(axios, 'get');
    requestPostStub = sinon.stub(axios, 'post');

    clientAuth.returns(Promise.resolve({ data: { token: 'uqwu1u8qj18j28wj28', exp: (Date.now()+5000)/1000 } }));
    requestGetStub.returns(Promise.resolve({ data: { status: false } })); // Snapshot outdated
    requestPostStub.returns(Promise.resolve(JSON.parse(dataJSON)));
    // Mock finishes

    Switcher.buildContext({ url, apiKey, domain, component, environment }, {
      snapshotLocation: 'generated-snapshots/',
      offline: true
    });
    
    await Switcher.loadSnapshot();
    assert.isTrue(await Switcher.checkSnapshot());

    Switcher.unloadSnapshot();
    fs.unlinkSync(`generated-snapshots/${environment}.json`);
  });

  it('should NOT update snapshot', async function () {
    // Mocking starts
    clientAuth = sinon.stub(services, 'auth');
    requestGetStub = sinon.stub(axios, 'get');

    clientAuth.returns(Promise.resolve({ data: { token: 'uqwu1u8qj18j28wj28', exp: (Date.now()+5000)/1000 } }));
    requestGetStub.returns(Promise.resolve({ data: { status: true } })); // No available update
    // Mocking finishes
    
    await Switcher.loadSnapshot();
    assert.isFalse(await Switcher.checkSnapshot());
  });

  it('should NOT update snapshot - check Snapshot Error', async function () {
    this.timeout(3000);

    // Mocking starts
    clientAuth = sinon.stub(services, 'auth');
    requestGetStub = sinon.stub(axios, 'get');

    clientAuth.returns(Promise.resolve({ data: { token: 'uqwu1u8qj18j28wj28', exp: (Date.now()+5000)/1000 } }));
    requestGetStub.throws({
      errno: 'ECONNREFUSED'
    });
    // Mocking finishes
    
    Switcher.setTestEnabled();
    await Switcher.loadSnapshot();
    await Switcher.checkSnapshot().then(function (result) {
      assert.isUndefined(result);
    }, function (error) {
      assert.equal('Something went wrong: Connection has been refused - ECONNREFUSED', error.message);
    });
  });

  it('should NOT update snapshot - resolve Snapshot Error', async function () {
    // Mocking starts
    clientAuth = sinon.stub(services, 'auth');
    requestGetStub = sinon.stub(axios, 'get');
    requestPostStub = sinon.stub(axios, 'post');

    clientAuth.returns(Promise.resolve({ data: { token: 'uqwu1u8qj18j28wj28', exp: (Date.now()+5000)/1000 } }));
    requestGetStub.returns(Promise.resolve({ data: { status: false } })); // Snapshot outdated
    requestPostStub.throws({
      errno: 'ECONNREFUSED'
    });
    // Mocking finishes
    
    Switcher.setTestEnabled();
    await Switcher.loadSnapshot();
    await Switcher.checkSnapshot().then(function (result) {
      assert.isUndefined(result);
    }, function (error) {
      assert.equal('Something went wrong: Connection has been refused - ECONNREFUSED', error.message);
    });
  });

  it('should update snapshot', async function () {
    // Mocking starts
    clientAuth = sinon.stub(services, 'auth');
    requestGetStub = sinon.stub(axios, 'get');
    requestPostStub = sinon.stub(axios, 'post');

    clientAuth.returns(Promise.resolve({ data: { token: 'uqwu1u8qj18j28wj28', exp: (Date.now()+5000)/1000 } }));
    requestGetStub.returns(Promise.resolve({ data: { status: false } })); // Snapshot outdated
    requestPostStub.returns(Promise.resolve(JSON.parse(dataJSON)));
    
    // stringfy is not necessary as we use the object data afterwards
    // requestPostStub.returns(Promise.resolve(JSON.stringify(JSON.parse(dataJSON), null, 4)));
    // Mocking finishes

    try {
      Switcher.buildContext({ url, apiKey, domain, component, environment }, {
        snapshotLocation: 'generated-snapshots/'
      });

      await Switcher.loadSnapshot();
      assert.isNotNull(Switcher.snapshot);

      Switcher.unloadSnapshot();
      fs.unlinkSync(`generated-snapshots/${environment}.json`);
    } catch (error) {
      assert.equal('Something went wrong: It was not possible to load the file at generated-snapshots/', error.message);
    }
  });

});