const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const assert = chai.assert;

const sinon = require('sinon');
const fetch = require('node-fetch');
const services = require('../src/lib/services');
const fs = require('fs');
const { 
  Switcher, 
  checkValue, 
  checkNetwork, 
  checkDate, 
  checkTime, 
  checkRegex, 
  checkNumeric 
} = require('../src/index');

const generateAuth = (token, seconds) => {
  return { 
    token, 
    exp: (Date.now()+(seconds*1000))/1000
  };
};

const generateResult = (result) => {
  return {
    result
  };
};

describe('Integrated test - Switcher:', function () {

  this.afterAll(function() {
    fs.unwatchFile('./snapshot/default.json');
  });

  this.beforeEach(function() {
    Switcher.setTestEnabled();
  });

  describe('check criteria (e2e):', function () {

    let fetchStub;

    beforeEach(function() {
      fetchStub = sinon.stub(fetch, 'Promise');
    });
  
    afterEach(function() {
      fetchStub.restore();
    });

    it('should be valid', async function () {
      // given API responding properly
      fetchStub.onCall(0).returns(Promise.resolve({ json: () => generateAuth('uqwu1u8qj18j28wj28', 5) }));
      fetchStub.onCall(1).returns(Promise.resolve({ status: 200 }));
      fetchStub.onCall(2).returns(Promise.resolve({ json: () => generateResult(true) }));

      // test
      Switcher.buildContext({ url: 'url', apiKey: 'apiKey', domain: 'domain', component: 'component', environment: 'default' });
      let switcher = Switcher.factory();
      
      await switcher.prepare('FLAG_1');
      assert.isTrue(await switcher.isItOn());
    });

    it('should be valid - throttle', async function () {
      this.timeout(3000);

      // given API responding properly
      // first API call
      fetchStub.onCall(0).returns(Promise.resolve({ status: 200 }));
      fetchStub.onCall(1).returns(Promise.resolve({ json: () => generateAuth('uqwu1u8qj18j28wj28', 5) }));
      fetchStub.onCall(2).returns(Promise.resolve({ json: () => generateResult(true), status: 200 }));

      // first async API call
      fetchStub.onCall(3).returns(Promise.resolve({ status: 200 }));
      fetchStub.onCall(4).returns(Promise.resolve({ json: () => generateResult(true), status: 200 }));

      // after throttle value has expired
      fetchStub.onCall(5).returns(Promise.resolve({ status: 200 }));
      fetchStub.onCall(6).returns(Promise.resolve({ json: () => generateResult(true), status: 200 }));

      // test
      Switcher.buildContext({ url: 'url', apiKey: 'apiKey', domain: 'domain', component: 'component', environment: 'default' });
      let switcher = Switcher.factory();
      switcher.throttle(1000);

      const spyPrepare = sinon.spy(switcher, '_executeAsyncOnlineCriteria');
      for (let index = 0; index < 10; index++) {
        assert.isTrue(await switcher.isItOn('FLAG_1'));
      }

      assert.equal(spyPrepare.callCount, 9);

      // Next call should call the API again as the throttle has expired
      await new Promise(resolve => setTimeout(resolve, 2000));
      assert.isTrue(await switcher.isItOn('FLAG_1'));
      assert.equal(spyPrepare.callCount, 10);
    });
  });

  describe('check criteria:', function () {

    let fetchStub;
    let clientAuth;

    beforeEach(function() {
      fetchStub = sinon.stub(fetch, 'Promise');
      clientAuth = sinon.stub(services, 'auth');
    });
  
    afterEach(function() {
      clientAuth.restore();
      fetchStub.restore();
    });

    it('should be valid', async function () {
      // given API responding properly
      fetchStub.onCall(0).returns(Promise.resolve({ status: 200 }));
      fetchStub.onCall(1).returns(Promise.resolve({ json: () => generateResult(true) }));
      clientAuth.returns(generateAuth('uqwu1u8qj18j28wj28', 5));

      // test
      Switcher.buildContext({ url: 'url', apiKey: 'apiKey', domain: 'domain', component: 'component', environment: 'default' });
      let switcher = Switcher.factory();
      
      await switcher.prepare('FLAG_1', [
        checkValue('User 1'),
        checkNumeric('1'),
        checkNetwork('192.168.0.1'),
        checkDate('2019-12-01T08:30'),
        checkTime('08:00'),
        checkRegex('\\bUSER_[0-9]{1,2}\\b')
      ]);

      assert.isTrue(await switcher.isItOn());
    });

    it('should not throw when switcher keys provided were configured properly', async function() {
      //given
      clientAuth.returns(generateAuth('uqwu1u8qj18j28wj28', 5));
      const response = { not_found: [] };
      fetchStub.onCall(0).returns(Promise.resolve({ json: () => response, status: 200 }));

      //test
      Switcher.buildContext({ url: 'url', apiKey: 'apiKey', domain: 'domain', component: 'component', environment: 'default' });
      await assert.isFulfilled(Switcher.checkSwitchers(['FEATURE01', 'FEATURE02']));
    });

    it('should throw when switcher keys provided were not configured properly', async function() {
      //given
      clientAuth.returns(generateAuth('uqwu1u8qj18j28wj28', 5));
      const response = { not_found: ['FEATURE02'] };
      fetchStub.onCall(0).returns(Promise.resolve({ json: () => response, status: 200 }));

      //test
      Switcher.buildContext({ url: 'url', apiKey: 'apiKey', domain: 'domain', component: 'component', environment: 'default' });
      await assert.isRejected(Switcher.checkSwitchers(['FEATURE01', 'FEATURE02']), 
        'Something went wrong: Something went wrong: [FEATURE02] not found');
    });

    it('should throw when no switcher keys were provided', async function() {
      //given
      clientAuth.returns(generateAuth('uqwu1u8qj18j28wj28', 5));
      const response = { errors: [ { msg: 'Switcher Key is required' } ] };
      fetchStub.onCall(0).returns(Promise.resolve({ json: () => response, status: 422 }));

      //test
      Switcher.buildContext({ url: 'url', apiKey: 'apiKey', domain: 'domain', component: 'component', environment: 'default' });
      await assert.isRejected(Switcher.checkSwitchers([]), 
        'Something went wrong: Switcher Key is required');
    });

    it('should throw when switcher keys provided were invalid', async function() {
      //given
      clientAuth.returns(generateAuth('uqwu1u8qj18j28wj28', 5));
      fetchStub.onCall(0).throws({ errno: 'ERROR' });

      //test
      Switcher.buildContext({ url: 'url', apiKey: 'apiKey', domain: 'domain', component: 'component', environment: 'default' });
      await assert.isRejected(Switcher.checkSwitchers('FEATURE02'));
    });
    
    it('should renew the token after expiration', async function () {
      this.timeout(3000);

      // given API responding properly
      clientAuth.returns(generateAuth('uqwu1u8qj18j28wj28', 1));

      Switcher.buildContext({ url: 'url', apiKey: 'apiKey', domain: 'domain', component: 'component', environment: 'default' });
      let switcher = Switcher.factory();
      const spyPrepare = sinon.spy(switcher, 'prepare');

      // Prepare the call generating the token
      fetchStub.onCall(0).returns(Promise.resolve({ status: 200 }));
      fetchStub.onCall(1).returns(Promise.resolve({ json: () => generateResult(true) }));
      await switcher.prepare('MY_FLAG');
      assert.equal(await switcher.isItOn(), true);

      // The program delay 2 secs later for the next call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Prepare the stub to provide the new token
      clientAuth.returns(generateAuth('asdad12d2232d2323f', 1));

      // In this time period the expiration time has reached, it should call prepare once again to renew the token
      fetchStub.onCall(3).returns(Promise.resolve({ json: () => generateResult(false) }));
      assert.equal(await switcher.isItOn(), false);
      assert.equal(spyPrepare.callCount, 2);

      // // In the meantime another call is made by the time the token is still not expired, so there is no need to call prepare again
      fetchStub.onCall(5).returns(Promise.resolve({ json: () => generateResult(false) }));
      assert.equal(await switcher.isItOn(), false);
      assert.equal(spyPrepare.callCount, 2);
    });

    it('should be valid - when sending key without calling prepare', async function () {
      // given API responding properly
      fetchStub.onCall(0).returns(Promise.resolve({ status: 200 }));
      fetchStub.onCall(1).returns(Promise.resolve({ json: () => generateResult(true) }));
      clientAuth.returns(generateAuth('uqwu1u8qj18j28wj28', 5));

      // test
      Switcher.buildContext({ url: 'url', apiKey: 'apiKey', domain: 'domain', component: 'component', environment: 'default' });
      let switcher = Switcher.factory();
      assert.isTrue(await switcher.isItOn('MY_FLAG', [
        checkValue('User 1'),
        checkNetwork('192.168.0.1')
      ]));
    });

    it('should be valid - when preparing key and sending input strategy afterwards', async function () {
      // given API responding properly
      fetchStub.onCall(0).returns(Promise.resolve({ status: 200 }));
      fetchStub.onCall(1).returns(Promise.resolve({ json: () => generateResult(true) }));
      clientAuth.returns(generateAuth('uqwu1u8qj18j28wj28', 5));

      // test
      Switcher.buildContext({ url: 'url', apiKey: 'apiKey', domain: 'domain', component: 'component', environment: 'default' });
      let switcher = Switcher.factory();

      await switcher.prepare('MY_FLAG');
      assert.isTrue(await switcher.isItOn(undefined, [
        checkValue('User 1'),
        checkNetwork('192.168.0.1')
      ]));
    });

    it('should be invalid - Missing API Key field', async function () {
      // given
      clientAuth.returns(generateAuth('uqwu1u8qj18j28wj28', 5));

      // test
      Switcher.buildContext({ url: 'url', apiKey: undefined, domain: 'domain', component: 'component', environment: 'default' });
      let switcher = Switcher.factory();

      await switcher.prepare('MY_FLAG', [
        checkValue('User 1'),
        checkNetwork('192.168.0.1')
      ]);

      await assert.isRejected(switcher.isItOn(), 
        'Something went wrong: Missing API Key field');
    });

    it('should be invalid - Missing key field', async function () {
      // given
      fetchStub.onCall(0).returns(Promise.resolve({ json: () => generateResult(undefined) }));
      clientAuth.returns(generateAuth('uqwu1u8qj18j28wj28', 5));

      // test
      Switcher.buildContext({ url: 'url', apiKey: 'apiKey', domain: 'domain', component: 'component', environment: 'default' });
      let switcher = Switcher.factory();
      await switcher.prepare(undefined, [
        checkValue('User 1'),
        checkNetwork('192.168.0.1')
      ]);

      await assert.isRejected(switcher.isItOn(), 
        'Something went wrong: Missing key field');
    });

    it('should be invalid - Missing component field', async function () {
      // given
      fetchStub.onCall(0).returns(Promise.resolve({ json: () => generateResult(undefined) }));
      clientAuth.returns(generateAuth('uqwu1u8qj18j28wj28', 5));

      // test
      Switcher.buildContext({ url: 'url', apiKey: 'apiKey', domain: 'domain', component: undefined, environment: 'default' });
      let switcher = Switcher.factory();

      await assert.isRejected(switcher.isItOn('MY_FLAG', [
        checkValue('User 1'),
        checkNetwork('192.168.0.1')
      ]), 'Something went wrong: Missing component field');
    });

    it('should be invalid - Missing token field', async function () {
      // given
      fetchStub.onCall(0).returns(Promise.resolve({ json: () => generateResult(undefined) }));
      clientAuth.returns(generateAuth(undefined, 1));

      // test
      Switcher.buildContext({ url: 'url', apiKey: 'apiKey', domain: 'domain', component: 'component', environment: 'default' });
      let switcher = Switcher.factory();
      
      await assert.isRejected(switcher.isItOn('MY_FLAG', [
        checkValue('User 1'),
        checkNetwork('192.168.0.1')
      ]), 'Something went wrong: Missing token field');
    });

    it('should be invalid - bad strategy input', async function () {
      // given
      fetchStub.onCall(0).returns(Promise.resolve({ json: () => generateResult(undefined) }));
      clientAuth.returns(generateAuth('uqwu1u8qj18j28wj28', 5));

      // test
      Switcher.buildContext({ url: 'url', apiKey: 'apiKey', domain: 'domain', component: 'component', environment: 'default' });
      let switcher = Switcher.factory();
      await switcher.prepare('MY_WRONG_FLAG', ['THIS IS WRONG']);

      await assert.isRejected(switcher.isItOn(), 
        'Something went wrong: Invalid input format for \'THIS IS WRONG\'');
    });

    it('should run in silent mode', async function () {
      this.timeout(5000);

      // setup context to read the snapshot in case the API not respond
      Switcher.buildContext({ url: 'url', apiKey: 'apiKey', domain: 'domain', component: 'component', environment: 'default' }, {
        silentMode: true,
        retryAfter: '2s'
      });
      
      let switcher = Switcher.factory();
      const spyPrepare = sinon.spy(switcher, 'prepare');

      // First attempt to reach the API - Since it's configured to use silent mode, it should return true (according to the snapshot)
      fetchStub.onCall(0).throws({ errno: 'ECONNREFUSED' });
      let result = await switcher.isItOn('FF2FOR2030');
      assert.isTrue(result);

      await new Promise(resolve => setTimeout(resolve, 500));
      // The call below is in silent mode. It is getting the configuration from the offline snapshot again
      // fetchStub.onCall(1).throws({ errno: 'ECONNREFUSED' });
      result = await switcher.isItOn();
      assert.isTrue(result);

      // As the silent mode was configured to retry after 2 seconds, it's still in time, 
      // therefore, prepare was never called
      assert.equal(spyPrepare.callCount, 0);

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Silent mode has expired. Again, the online API is still offline. Prepare cannot be invoked
      // fetchStub.onCall(2).throws({ errno: 'ECONNREFUSED' });
      result = await switcher.isItOn();
      assert.isTrue(result);
      assert.equal(spyPrepare.callCount, 0);

      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Setup the online mocked response and made it to return false just to make sure it's not fetching into the snapshot
      fetchStub.onCall(1).returns(Promise.resolve({ status: 200 }));
      fetchStub.onCall(2).returns(Promise.resolve({ json: () => generateResult(false) }));
      clientAuth.returns(generateAuth('uqwu1u8qj18j28wj28', 5));

      result = await switcher.isItOn();
      assert.equal(result, false);
    });

    it('should throw error if not in silent mode', async function () {
      // given
      fetchStub.restore();
      clientAuth.restore();
      fetchStub = sinon.stub(fetch, 'Promise');
      
      fetchStub.throws({
        errno: 'ECONNREFUSED'
      });

      // test
      Switcher.buildContext({ url: 'url', apiKey: 'apiKey', domain: 'domain', component: 'component', environment: 'default' });
      let switcher = Switcher.factory();

      await assert.isRejected(switcher.isItOn('FF2FOR2030'), 
        'Something went wrong: Connection has been refused - ECONNREFUSED');
    });

    it('should run in silent mode when API is unavailable', async function () {
      // given: API unavailable
      fetchStub.onCall(0).returns(Promise.resolve({ status: 503 }));

      // test
      Switcher.buildContext({ url: 'url', apiKey: 'apiKey', domain: 'domain', component: 'component', environment: 'default' }, {
        silentMode: true
      });

      let switcher = Switcher.factory();
      assert.isTrue(await switcher.isItOn('FF2FOR2030'));
    });

  });

});