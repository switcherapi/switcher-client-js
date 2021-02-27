const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const assert = chai.assert;

const sinon = require('sinon');
const Switcher = require('../src/index');
const axios = require('axios');
const services = require('../src/lib/services');
const fs = require('fs');

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
      //give
      clientAuth = sinon.stub(services, 'auth');
      requestGetStub = sinon.stub(axios, 'get');
      requestPostStub = sinon.stub(axios, 'post');
  
      clientAuth.returns(Promise.resolve({ data: { token: 'uqwu1u8qj18j28wj28', exp: (Date.now()+5000)/1000 } }));
      requestGetStub.returns(Promise.resolve({ data: { status: false } })); // Snapshot outdated
      requestPostStub.returns(Promise.resolve(JSON.parse(dataJSON)));

      //test
      Switcher.buildContext({ url, apiKey, domain, component, environment }, {
        snapshotLocation: 'generated-snapshots/',
        offline: true
      });
      
      await Switcher.loadSnapshot();
      assert.isTrue(await Switcher.checkSnapshot());
  
      //restore state to avoid process leakage
      Switcher.unloadSnapshot();
      fs.unlinkSync(`generated-snapshots/${environment}.json`);
    });
  
    it('should NOT update snapshot', async function () {
      //given
      clientAuth = sinon.stub(services, 'auth');
      requestGetStub = sinon.stub(axios, 'get');
  
      clientAuth.returns(Promise.resolve({ data: { token: 'uqwu1u8qj18j28wj28', exp: (Date.now()+5000)/1000 } }));
      requestGetStub.returns(Promise.resolve({ data: { status: true } })); // No available update
      
      //test
      await Switcher.loadSnapshot();
      assert.isFalse(await Switcher.checkSnapshot());
    });
  
    it('should NOT update snapshot - check Snapshot Error', async function () {
      this.timeout(3000);
  
      //given
      clientAuth = sinon.stub(services, 'auth');
      requestGetStub = sinon.stub(axios, 'get');
  
      clientAuth.returns(Promise.resolve({ data: { token: 'uqwu1u8qj18j28wj28', exp: (Date.now()+5000)/1000 } }));
      requestGetStub.throws({
        errno: 'ECONNREFUSED'
      });
      
      //test
      Switcher.setTestEnabled();
      await Switcher.loadSnapshot();
      await assert.isRejected(Switcher.checkSnapshot(),
        'Something went wrong: Connection has been refused - ECONNREFUSED');
    });
  
    it('should NOT update snapshot - resolve Snapshot Error', async function () {
      //given
      clientAuth = sinon.stub(services, 'auth');
      requestGetStub = sinon.stub(axios, 'get');
      requestPostStub = sinon.stub(axios, 'post');
  
      clientAuth.returns(Promise.resolve({ data: { token: 'uqwu1u8qj18j28wj28', exp: (Date.now()+5000)/1000 } }));
      requestGetStub.returns(Promise.resolve({ data: { status: false } })); // Snapshot outdated
      requestPostStub.throws({
        errno: 'ECONNREFUSED'
      });
      
      //test
      Switcher.setTestEnabled();
      await Switcher.loadSnapshot();
      await assert.isRejected(Switcher.checkSnapshot(), 
        'Something went wrong: Connection has been refused - ECONNREFUSED');
    });
  
    it('should update snapshot', async function () {
      //given
      clientAuth = sinon.stub(services, 'auth');
      requestGetStub = sinon.stub(axios, 'get');
      requestPostStub = sinon.stub(axios, 'post');
  
      clientAuth.returns(Promise.resolve({ data: { token: 'uqwu1u8qj18j28wj28', exp: (Date.now()+5000)/1000 } }));
      requestGetStub.returns(Promise.resolve({ data: { status: false } })); // Snapshot outdated
      requestPostStub.returns(Promise.resolve(JSON.parse(dataJSON)));
  
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
  
  });

  describe('Error Scenarios - Snapshot', function() {
    const apiKey = '$2b$08$S2Wj/wG/Rfs3ij0xFbtgveDtyUAjML1/TOOhocDg5dhOaU73CEXfK';
    const domain = 'currency-api';
    const component = 'Android';
    const environment = 'dev';
    const url = 'http://localhost:3000';

    it('should be invalid - Load snapshot was not called', async function () {
      Switcher.buildContext({ url, apiKey, domain, component, environment }, {
        offline: true, logger: true
      });
      
      const switcher = Switcher.factory();
      await assert.isRejected(switcher.isItOn('FF2FOR2030'), 
        'Snapshot not loaded. Try to use \'Switcher.loadSnapshot()\'');
    });
  });