"use strict"

const assert = require('chai').assert
const sinon = require('sinon');
const Switcher = require('../src/index')
const request = require('request-promise')
const services = require('../src/utils/services')
const { StrategiesType } = require('../src/utils/index')

describe('Integrated test - Switcher offline:', function () {
  let switcher;

  this.beforeAll(function() {
    const apiKey = '$2b$08$S2Wj/wG/Rfs3ij0xFbtgveDtyUAjML1/TOOhocDg5dhOaU73CEXfK';
    const environment = 'default';
    const domain = 'currency-api';
    const component = 'Android';
    const url = 'http://localhost:3000/criteria'

    switcher = new Switcher(url, apiKey, domain, component, environment, true, './snapshot/default.json')
  })

  it('Should be valid', async function () {
    await switcher.prepare('FF2FOR2020', [StrategiesType.VALUE, 'Japan', StrategiesType.NETWORK, '10.0.0.3'])
    
    await switcher.isItOn('FF2FOR2020').then(function (result) {
      console.log('Fullfilled:', result);
    }, function (error) {
      console.log('Rejected:', error);
    })
  })

  it('Should be invalid - Input (IP) does not match', async function () {
    await switcher.prepare('FF2FOR2020', [StrategiesType.VALUE, 'Japan', StrategiesType.NETWORK, '192.168.0.2'])
    await switcher.isItOn().then(function (result) {
      console.log('Fullfilled:', result);
    }, function (error) {
      console.log('Rejected:', error);
    })
  })

  it('Should be valid assuming key to be false and then forgetting it', async function () {
    await switcher.prepare('FF2FOR2020', [StrategiesType.VALUE, 'Japan', StrategiesType.NETWORK, '10.0.0.3'])
    
    assert.isTrue(await switcher.isItOn())
    switcher.assume('FF2FOR2020').false()
    assert.isFalse(await switcher.isItOn())
    switcher.forget('FF2FOR2020')
    assert.isTrue(await switcher.isItOn())
  })

  it('Should be valid assuming unknown key to be true', async function () {
    await switcher.prepare('UNKNOWN', [StrategiesType.VALUE, 'Japan', StrategiesType.NETWORK, '10.0.0.3'])
    
    switcher.assume('UNKNOWN').true()
    assert.isTrue(await switcher.isItOn())

    switcher.forget('UNKNOWN')
    await switcher.isItOn().then(function (result) {
      assert.isUndefined(result)
    }, function (error) {
      assert.equal('Offline - Something went wrong: {"error":"Unable to load a key UNKNOWN"}', error.message)
    })
  })
})

describe('Unit test - Switcher:', function () {

  describe('check criteria:', function () {

    let requestStub;
    let clientAuth;

    beforeEach(function() {
      requestStub = sinon.stub(request, 'get');
      clientAuth = sinon.stub(services, 'auth');
    })
  
    afterEach(function() {
      requestStub.restore();
      clientAuth.restore();
    })

    it('should be valid', async function () {
      requestStub.returns(Promise.resolve({ return: true }));
      clientAuth.returns(Promise.resolve({ token: 'uqwu1u8qj18j28wj28', exp: (Date.now()+5000)/1000 }));

      let switcher = new Switcher('url', 'apiKey', 'domain', 'component', 'default')
      await switcher.prepare('FLAG_1', [StrategiesType.VALUE, 'User 1', StrategiesType.NETWORK, '192.168.0.1'])
      assert.isTrue(await switcher.isItOn())
    })
    
    it('should renew the token after expiration', async function () {
      this.timeout(3000);

      requestStub.returns(Promise.resolve({ return: true }));
      clientAuth.returns(Promise.resolve({ token: 'uqwu1u8qj18j28wj28', exp: (Date.now()+1000)/1000 }));
      let switcher = new Switcher('url', 'apiKey', 'domain', 'component', 'default')
      const spyPrepare = sinon.spy(switcher, 'prepare')

      // Prepare the call generating the token
      await switcher.prepare('MY_FLAG')
      await switcher.isItOn()

      // The program delay 2 secs later for the next call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Prepare the stub to provide the new token
      clientAuth.returns(Promise.resolve({ token: 'asdad12d2232d2323f', exp: (Date.now()+1000)/1000 }));

      // In this time period the expiration time has reached, it should call prepare once again to renew the token
      await switcher.isItOn()
      assert.equal(spyPrepare.callCount, 2)

      // In the meantime another call is made by the time the token is still not expired, so there is no need to call prepare again
      await switcher.isItOn()
      assert.equal(spyPrepare.callCount, 2)
    })

    it('should be valid - when sending key without calling prepare', async function () {
      requestStub.returns(Promise.resolve({ return: true }));
      clientAuth.returns(Promise.resolve({ token: 'uqwu1u8qj18j28wj28', exp: (Date.now()+5000)/1000 }));

      let switcher = new Switcher('url', 'apiKey', 'domain', 'component', 'default')
      assert.isTrue(await switcher.isItOn('MY_FLAG', [StrategiesType.VALUE, 'User 1', StrategiesType.NETWORK, '192.168.0.1']))
    })

    it('should be valid - when preparing key and sending input strategy afterwards', async function () {
      requestStub.returns(Promise.resolve({ return: true }));
      clientAuth.returns(Promise.resolve({ token: 'uqwu1u8qj18j28wj28', exp: (Date.now()+5000)/1000 }));

      let switcher = new Switcher('url', 'apiKey', 'domain', 'component', 'default')
      await switcher.prepare('MY_FLAG')
      assert.isTrue(await switcher.isItOn(undefined, [StrategiesType.VALUE, 'User 1', StrategiesType.NETWORK, '192.168.0.1']))
    })

    it('should be invalid - bad url', async function () {
      let switcher = new Switcher(undefined, 'apiKey', 'domain', 'component', 'default')
      clientAuth.returns(Promise.resolve({ token: 'uqwu1u8qj18j28wj28', exp: (Date.now()+5000)/1000 }));

      await switcher.prepare('MY_FLAG', [StrategiesType.VALUE, 'User 1', StrategiesType.NETWORK, '192.168.0.1'])
      await switcher.isItOn().then(function (result) {
        assert.isUndefined(result)
      }, function (error) {
        assert.equal('Something went wrong: Missing url field', error.message)
      })
    })

    it('should be invalid - bad api key', async function () {
      let switcher = new Switcher('url', undefined, 'domain', 'component', 'default')
      clientAuth.returns(Promise.resolve({ token: 'uqwu1u8qj18j28wj28', exp: (Date.now()+5000)/1000 }));

      await switcher.prepare('MY_FLAG', [StrategiesType.VALUE, 'User 1', StrategiesType.NETWORK, '192.168.0.1'])
      await switcher.isItOn().then(function (result) {
        assert.isUndefined(result)
      }, function (error) {
        assert.equal('Something went wrong: Missing API Key field', error.message)
      })
    })

    it('should be invalid - bad key', async function () {
      requestStub.returns(Promise.resolve({ return: undefined }));
      clientAuth.returns(Promise.resolve({ token: 'uqwu1u8qj18j28wj28', exp: (Date.now()+5000)/1000 }));

      let switcher = new Switcher('url', 'apiKey', 'domain', 'component', 'default')
      await switcher.prepare(undefined, [StrategiesType.VALUE, 'User 1', StrategiesType.NETWORK, '192.168.0.1'])
      
      await switcher.isItOn().then(function (result) {
        assert.isUndefined(result)
      }, function (error) {
        assert.equal('Something went wrong: Missing key field', error.message)
      })
    })

    it('should be invalid - bad strategy input', async function () {
      requestStub.returns(Promise.resolve({ return: undefined }));
      clientAuth.returns(Promise.resolve({ token: 'uqwu1u8qj18j28wj28', exp: (Date.now()+5000)/1000 }));

      let switcher = new Switcher('url', 'apiKey', 'domain', 'component', 'default')
      await switcher.prepare('MY_WRONG_FLAG', ['THIS IS WRONG'])
      await switcher.isItOn().then(function (result) {
        assert.isUndefined(result)
      }, function (error) {
        assert.equal('Something went wrong: Invalid input format for \'THIS IS WRONG\'', error.message)
      })
    })

  })

})