const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const assert = chai.assert;

const sinon = require('sinon');
const Switcher = require('../src/index');
const axios = require('axios');
const services = require('../src/lib/services');
const fs = require('fs');

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
        assert.isTrue(await switcher.isItOn(undefined, [
          Switcher.StrategiesType.VALUE, 'User 1', 
          Switcher.StrategiesType.NETWORK, '192.168.0.1'
        ]));
      });
  
      it('should be invalid - Missing url field', async function () {
        // given
        clientAuth.returns(Promise.resolve({ data: { token: 'uqwu1u8qj18j28wj28', exp: (Date.now()+5000)/1000 } }));
  
        // test
        Switcher.buildContext({ apiKey: 'apiKey', domain: 'domain', component: 'component', environment: 'default' });
        let switcher = Switcher.factory();
  
        await switcher.prepare('MY_FLAG', [
          Switcher.StrategiesType.VALUE, 'User 1', 
          Switcher.StrategiesType.NETWORK, '192.168.0.1'
        ]);
        await assert.isRejected(switcher.isItOn(), 
          'Something went wrong: Missing url field');
      });
  
      it('should be invalid - Missing API Key field', async function () {
        // given
        clientAuth.returns(Promise.resolve({ data: { token: 'uqwu1u8qj18j28wj28', exp: (Date.now()+5000)/1000 } }));
  
        // test
        Switcher.buildContext({ url: 'url', apiKey: undefined, domain: 'domain', component: 'component', environment: 'default' });
        let switcher = Switcher.factory();
  
        await switcher.prepare('MY_FLAG', [
          Switcher.StrategiesType.VALUE, 'User 1', 
          Switcher.StrategiesType.NETWORK, '192.168.0.1'
        ]);
  
        await assert.isRejected(switcher.isItOn(), 
          'Something went wrong: Missing API Key field');
      });
  
      it('should be invalid - Missing key field', async function () {
        // given
        requestStub.returns(Promise.resolve({ data: { result: undefined } }));
        clientAuth.returns(Promise.resolve({ data: { token: 'uqwu1u8qj18j28wj28', exp: (Date.now()+5000)/1000 } }));
  
        // test
        Switcher.buildContext({ url: 'url', apiKey: 'apiKey', domain: 'domain', component: 'component', environment: 'default' });
        let switcher = Switcher.factory();
        await switcher.prepare(undefined, [
          Switcher.StrategiesType.VALUE, 'User 1', 
          Switcher.StrategiesType.NETWORK, '192.168.0.1'
        ]);
  
        await assert.isRejected(switcher.isItOn(), 
          'Something went wrong: Missing key field');
      });
  
      it('should be invalid - Missing component field', async function () {
        // given
        requestStub.returns(Promise.resolve({ data: { result: undefined } }));
        clientAuth.returns(Promise.resolve({ data: { token: 'uqwu1u8qj18j28wj28', exp: (Date.now()+5000)/1000 } }));
  
        // test
        Switcher.buildContext({ url: 'url', apiKey: 'apiKey', domain: 'domain', component: undefined, environment: 'default' });
        let switcher = Switcher.factory();
  
        await assert.isRejected(switcher.isItOn('MY_FLAG', [
          Switcher.StrategiesType.VALUE, 'User 1', 
          Switcher.StrategiesType.NETWORK, '192.168.0.1'
        ]), 'Something went wrong: Missing component field');
      });
  
      it('should be invalid - Missing token field', async function () {
        // given
        requestStub.returns(Promise.resolve({ data: { result: undefined } }));
        clientAuth.returns(Promise.resolve({ data: { token: undefined, exp: (Date.now()+5000)/1000 } }));
  
        // test
        Switcher.buildContext({ url: 'url', apiKey: 'apiKey', domain: 'domain', component: 'component', environment: 'default' });
        let switcher = Switcher.factory();
        
        await assert.isRejected(switcher.isItOn('MY_FLAG', [
          Switcher.StrategiesType.VALUE, 'User 1', 
          Switcher.StrategiesType.NETWORK, '192.168.0.1'
        ]), 'Something went wrong: Missing token field');
      });
  
      it('should be invalid - bad strategy input', async function () {
        // given
        requestStub.returns(Promise.resolve({ result: undefined }));
        clientAuth.returns(Promise.resolve({ data: { token: 'uqwu1u8qj18j28wj28', exp: (Date.now()+5000)/1000 } }));
  
        // test
        Switcher.buildContext({ url: 'url', apiKey: 'apiKey', domain: 'domain', component: 'component', environment: 'default' });
        let switcher = Switcher.factory();
        await switcher.prepare('MY_WRONG_FLAG', ['THIS IS WRONG']);
  
        await assert.isRejected(switcher.isItOn(), 
          'Something went wrong: Invalid input format for \'THIS IS WRONG\'');
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
  
        await assert.isRejected(switcher.isItOn('FF2FOR2030'), 
          'Something went wrong: Connection has been refused - ECONNREFUSED');
      });
  
      it('should run in silent mode when API is unavailable', async function () {
        // given: API unavailable
        healthStub.returns(Promise.resolve({ data: { code: 503 } }));
  
        // test
        Switcher.buildContext({ url: 'url', apiKey: 'apiKey', domain: 'domain', component: 'component', environment: 'default' }, {
          silentMode: true
        });
  
        let switcher = Switcher.factory();
        assert.isTrue(await switcher.isItOn('FF2FOR2030'));
      });
  
    });
  
  });