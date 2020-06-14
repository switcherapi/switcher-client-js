const assert = require('chai').assert
const sinon = require('sinon');
const Switcher = require('../src/index');
const request = require('request-promise');
const services = require('../src/lib/services');
const fs = require('fs');
// const { StrategiesType } = require('../src/utils/index')

describe('E2E test - Switcher offline:', function () {
  let switcher;
  const apiKey = '$2b$08$S2Wj/wG/Rfs3ij0xFbtgveDtyUAjML1/TOOhocDg5dhOaU73CEXfK';
  const domain = 'currency-api';
  const component = 'Android';
  const environment = 'default';
  const url = 'http://localhost:3000';

  this.beforeAll(function() {
    switcher = new Switcher(url, apiKey, domain, component, environment, {
      offline: true
    });
  });

  this.afterAll(function() {
    fs.unwatchFile('./snapshot/default.json');
  });

  it('should be valid', async function () {
    await switcher.prepare('FF2FOR2020', [Switcher.StrategiesType.VALUE, 'Japan', Switcher.StrategiesType.NETWORK, '10.0.0.3']);
    await switcher.isItOn('FF2FOR2020').then(function (result) {
      assert.isTrue(result);
    }, function (error) {
      console.log('Rejected:', error);
    });
  });

  it('should be valid - No prepare function called', async function () {
    switcher.isItOn('FF2FOR2020', [Switcher.StrategiesType.VALUE, 'Japan', Switcher.StrategiesType.NETWORK, '10.0.0.3']).then(function (result) {
      assert.isTrue(result);
    }, function (error) {
      console.log('Rejected:', error);
    });
  });

  it('should be valid - No prepare function called (no input as well)', function () {
    switcher.isItOn('FF2FOR2030').then(function (result) {
      assert.isTrue(result);
    }, function (error) {
      console.log('Rejected:', error);
    });
  });

  it('should be invalid - Input (IP) does not match', async function () {
    await switcher.prepare('FF2FOR2020', [Switcher.StrategiesType.VALUE, 'Japan', Switcher.StrategiesType.NETWORK, '192.168.0.2']);
    switcher.isItOn().then(function (result) {
      assert.isFalse(result);
    }, function (error) {
      console.log('Rejected:', error);
    });
  });

  it('should be valid assuming key to be false and then forgetting it', async function () {
    await switcher.prepare('FF2FOR2020', [Switcher.StrategiesType.VALUE, 'Japan', Switcher.StrategiesType.NETWORK, '10.0.0.3']);
    
    assert.isTrue(await switcher.isItOn());
    Switcher.assume('FF2FOR2020').false();
    assert.isFalse(await switcher.isItOn());
    Switcher.forget('FF2FOR2020');
    assert.isTrue(await switcher.isItOn());
  })

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

  it('should be invalid - Offline file not found', async function () {
    try {
      new Switcher(url, apiKey, domain, component, environment, {
        offline: true,
        snapshotLocation: 'somewhere/'
      });
    } catch (error) {
      assert.equal('Something went wrong: It was not possible to load the file at somewhere/default.json', error.message);
    }
  });
});

describe('Unit test - Switcher:', function () {

  this.afterAll(function() {
    fs.unwatchFile('./snapshot/default.json');
  })

  describe('check criteria:', function () {

    let requestStub;
    let clientAuth;

    beforeEach(function() {
      requestStub = sinon.stub(request, 'post');
      clientAuth = sinon.stub(services, 'auth');
    })
  
    afterEach(function() {
      requestStub.restore();
      clientAuth.restore();
    })

    it('should be valid', async function () {
      requestStub.returns(Promise.resolve({ result: true }));
      clientAuth.returns(Promise.resolve({ token: 'uqwu1u8qj18j28wj28', exp: (Date.now()+5000)/1000 }));

      let switcher = new Switcher('url', 'apiKey', 'domain', 'component', 'default');
      
      await switcher.prepare('FLAG_1', [Switcher.StrategiesType.VALUE, 'User 1', Switcher.StrategiesType.NETWORK, '192.168.0.1']);
      assert.isTrue(await switcher.isItOn());
    });
    
    it('should renew the token after expiration', async function () {
      this.timeout(3000);

      requestStub.returns(Promise.resolve({ result: true }));
      clientAuth.returns(Promise.resolve({ token: 'uqwu1u8qj18j28wj28', exp: (Date.now()+1000)/1000 }));
      let switcher = new Switcher('url', 'apiKey', 'domain', 'component', 'default');
      const spyPrepare = sinon.spy(switcher, 'prepare');

      // Prepare the call generating the token
      await switcher.prepare('MY_FLAG');
      await switcher.isItOn();

      // The program delay 2 secs later for the next call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Prepare the stub to provide the new token
      clientAuth.returns(Promise.resolve({ token: 'asdad12d2232d2323f', exp: (Date.now()+1000)/1000 }));

      // In this time period the expiration time has reached, it should call prepare once again to renew the token
      await switcher.isItOn();
      assert.equal(spyPrepare.callCount, 2);

      // In the meantime another call is made by the time the token is still not expired, so there is no need to call prepare again
      await switcher.isItOn();
      assert.equal(spyPrepare.callCount, 2);
    });

    it('should be valid - when sending key without calling prepare', async function () {
      requestStub.returns(Promise.resolve({ result: true }));
      clientAuth.returns(Promise.resolve({ token: 'uqwu1u8qj18j28wj28', exp: (Date.now()+5000)/1000 }));

      let switcher = new Switcher('url', 'apiKey', 'domain', 'component', 'default');
      assert.isTrue(await switcher.isItOn('MY_FLAG', [Switcher.StrategiesType.VALUE, 'User 1', Switcher.StrategiesType.NETWORK, '192.168.0.1']));
    });

    it('should be valid - when preparing key and sending input strategy afterwards', async function () {
      requestStub.returns(Promise.resolve({ result: true }));
      clientAuth.returns(Promise.resolve({ token: 'uqwu1u8qj18j28wj28', exp: (Date.now()+5000)/1000 }));

      let switcher = new Switcher('url', 'apiKey', 'domain', 'component', 'default');
      await switcher.prepare('MY_FLAG');
      assert.isTrue(await switcher.isItOn(undefined, [Switcher.StrategiesType.VALUE, 'User 1', Switcher.StrategiesType.NETWORK, '192.168.0.1']));
    });

    it('should be invalid - Missing url field', async function () {
      let switcher = new Switcher(undefined, 'apiKey', 'domain', 'component', 'default');
      clientAuth.returns(Promise.resolve({ token: 'uqwu1u8qj18j28wj28', exp: (Date.now()+5000)/1000 }));

      await switcher.prepare('MY_FLAG', [Switcher.StrategiesType.VALUE, 'User 1', Switcher.StrategiesType.NETWORK, '192.168.0.1']);
      switcher.isItOn().then(function (result) {
        assert.isUndefined(result);
      }, function (error) {
        assert.equal('Something went wrong: Missing url field', error.message);
      });
    });

    it('should be invalid - Missing API Key field', async function () {
      let switcher = new Switcher('url', undefined, 'domain', 'component', 'default');
      clientAuth.returns(Promise.resolve({ token: 'uqwu1u8qj18j28wj28', exp: (Date.now()+5000)/1000 }));

      await switcher.prepare('MY_FLAG', [Switcher.StrategiesType.VALUE, 'User 1', Switcher.StrategiesType.NETWORK, '192.168.0.1']);
      switcher.isItOn().then(function (result) {
        assert.isUndefined(result);
      }, function (error) {
        assert.equal('Something went wrong: Missing API Key field', error.message);
      });
    });

    it('should be invalid - Missing key field', async function () {
      requestStub.returns(Promise.resolve({ result: undefined }));
      clientAuth.returns(Promise.resolve({ token: 'uqwu1u8qj18j28wj28', exp: (Date.now()+5000)/1000 }));

      let switcher = new Switcher('url', 'apiKey', 'domain', 'component', 'default');
      await switcher.prepare(undefined, [Switcher.StrategiesType.VALUE, 'User 1', Switcher.StrategiesType.NETWORK, '192.168.0.1']);
      
      switcher.isItOn().then(function (result) {
        assert.isUndefined(result);
      }, function (error) {
        assert.equal('Something went wrong: Missing key field', error.message);
      });
    });

    it('should be invalid - Missing component field', async function () {
      requestStub.returns(Promise.resolve({ result: undefined }));
      clientAuth.returns(Promise.resolve({ token: 'uqwu1u8qj18j28wj28', exp: (Date.now()+5000)/1000 }));

      let switcher = new Switcher('url', 'apiKey', 'domain', undefined, 'default');
      switcher.isItOn('MY_FLAG', [Switcher.StrategiesType.VALUE, 'User 1', Switcher.StrategiesType.NETWORK, '192.168.0.1']).then(function (result) {
        assert.isUndefined(result);
      }, function (error) {
        assert.equal('Something went wrong: Missing component field', error.message);
      });
    });

    it('should be invalid - Missing token field', async function () {
      requestStub.returns(Promise.resolve({ result: undefined }));
      clientAuth.returns(Promise.resolve({ token: undefined, exp: (Date.now()+5000)/1000 }));

      let switcher = new Switcher('url', 'apiKey', 'domain', 'component', 'default')
      switcher.isItOn('MY_FLAG', [Switcher.StrategiesType.VALUE, 'User 1', Switcher.StrategiesType.NETWORK, '192.168.0.1']).then(function (result) {
        assert.isUndefined(result);
      }, function (error) {
        assert.equal('Something went wrong: Missing token field', error.message);
      });
    });

    it('should be invalid - bad strategy input', async function () {
      requestStub.returns(Promise.resolve({ result: undefined }));
      clientAuth.returns(Promise.resolve({ token: 'uqwu1u8qj18j28wj28', exp: (Date.now()+5000)/1000 }));

      let switcher = new Switcher('url', 'apiKey', 'domain', 'component', 'default');
      await switcher.prepare('MY_WRONG_FLAG', ['THIS IS WRONG']);
      switcher.isItOn().then(function (result) {
        assert.isUndefined(result);
      }, function (error) {
        assert.equal('Something went wrong: Invalid input format for \'THIS IS WRONG\'', error.message);
      });
    });

    it('should run in silent mode', async function () {
      requestStub.restore();
      clientAuth.restore();
      requestStub = sinon.stub(request, 'post');

      this.timeout(5000);
      requestStub.throws({
        error: {
          errno: 'ECONNREFUSED',
          code: 'ECONNREFUSED',
          syscall: 'connect'
        }
      });

      let switcher = new Switcher('url', 'apiKey', 'domain', 'component', 'default', {
        silentMode: true,
        retryAfter: '1s'
      });
      const spyPrepare = sinon.spy(switcher, 'prepare');

      // First attempt to reach the online API - Since it's configured to use silent mode, it should return true (according to the snapshot)
      let result = await switcher.isItOn('FF2FOR2030');
      assert.equal(result, true);

      await new Promise(resolve => setTimeout(resolve, 500));
      // The call below is in silent mode. It is getting the configuration from the offline snapshot again
      result = await switcher.isItOn();
      assert.equal(result, true);

      // As the silent mode was configured to retry after 3 seconds, it's still in time, 
      // therefore, it's not required to try to reach the online API yet.
      assert.equal(spyPrepare.callCount, 1);

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Silent mode has expired its time. Again, the online API is still offline. Prepare is called once again.
      result = await switcher.isItOn();
      assert.equal(result, true);
      assert.equal(spyPrepare.callCount, 2);

      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Setup the online mocked response and made it to return false just to make sure it's not fetching into the snapshot
      requestStub.returns(Promise.resolve({ result: false }));
      clientAuth = sinon.stub(services, 'auth');
      clientAuth.returns(Promise.resolve({ token: 'uqwu1u8qj18j28wj28', exp: (Date.now()+5000)/1000 }));

      result = await switcher.isItOn();
      assert.equal(result, false);
    });

    it('should throw error if not in silent mode', async function () {
      requestStub.restore();
      clientAuth.restore();
      requestStub = sinon.stub(request, 'post');
      
      requestStub.throws({
        error: {
          errno: 'ECONNREFUSED',
          code: 'ECONNREFUSED',
          syscall: 'connect'
        }
      });

      let switcher = new Switcher('url', 'apiKey', 'domain', 'component', 'default');

      await switcher.isItOn('FF2FOR2030').then(function (result) {
        assert.isUndefined(result);
      }, function (error) {
        assert.equal('Something went wrong: {"errno":"ECONNREFUSED","code":"ECONNREFUSED","syscall":"connect"}', error.message);
      });
    });

  });

});

describe('E2E test - Switcher offline - Snapshot:', function () {
  let switcher;
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
    requestGetStub.restore();
    requestPostStub.restore();
    clientAuth.restore();
    fsStub.restore();
  })

  beforeEach(function() {
    switcher = new Switcher(url, apiKey, domain, component, environment, {
      offline: true
    });

    clientAuth = sinon.stub(services, 'auth');
    requestGetStub = sinon.stub(request, 'get');
    requestPostStub = sinon.stub(request, 'post');
    fsStub = sinon.stub(fs, 'writeFileSync');
  });

  this.afterAll(function() {
    switcher.unloadSnapshot();
  });

  it('should update snapshot', async function () {
    // Mocking starts
    clientAuth.returns(Promise.resolve({ token: 'uqwu1u8qj18j28wj28', exp: (Date.now()+5000)/1000 }));
    requestGetStub.returns(Promise.resolve({ status: false })); // Snapshot outdated
    requestPostStub.returns(Promise.resolve(JSON.stringify(JSON.parse(dataJSON), null, 4)));
    // Mocking finishes
    
    assert.isTrue(await switcher.checkSnapshot());
  });

  it('should NOT update snapshot', async function () {
    // Mocking starts
    clientAuth.returns(Promise.resolve({ token: 'uqwu1u8qj18j28wj28', exp: (Date.now()+5000)/1000 }));
    requestGetStub.returns(Promise.resolve({ status: true })); // No available update
    // Mocking finishes
    
    assert.isFalse(await switcher.checkSnapshot());
  });

  it('should NOT update snapshot - check Snapshot Error', async function () {
    // Mocking starts
    clientAuth.returns(Promise.resolve({ token: 'uqwu1u8qj18j28wj28', exp: (Date.now()+5000)/1000 }));
    requestGetStub.throws({
      error: {
        errno: 'ECONNREFUSED',
        code: 'ECONNREFUSED',
        syscall: 'connect'
      }
    });
    // Mocking finishes
    
    await switcher.checkSnapshot().then(function (result) {
      assert.isUndefined(result);
    }, function (error) {
      assert.equal('Something went wrong: {"errno":"ECONNREFUSED","code":"ECONNREFUSED","syscall":"connect"}', error.message);
    });
  });

  it('should NOT update snapshot - resolve Snapshot Error', async function () {
    // Mocking starts
    clientAuth.returns(Promise.resolve({ token: 'uqwu1u8qj18j28wj28', exp: (Date.now()+5000)/1000 }));
    requestGetStub.returns(Promise.resolve({ status: false })); // Snapshot outdated
    requestPostStub.throws({
      error: {
        errno: 'ECONNREFUSED',
        code: 'ECONNREFUSED',
        syscall: 'connect'
      }
    });
    // Mocking finishes
    
    await switcher.checkSnapshot().then(function (result) {
      assert.isUndefined(result);
    }, function (error) {
      assert.equal('Something went wrong: {"errno":"ECONNREFUSED","code":"ECONNREFUSED","syscall":"connect"}', error.message);
    });
  });

});