import { assert } from 'chai';
import { stub } from 'sinon';

import FetchFacade from '../src/lib/utils/fetchFacade.js';
import { Client } from '../switcher-client.js';
import { given, generateAuth, generateResult, assertReject } from './helper/utils.js';
import { removeAgent } from '../src/lib/remote.js';

describe('Switcher Remote:', function () {
  
  let contextSettings;
  let fetchStub;

  beforeEach(function() {
    fetchStub = stub(FetchFacade, 'fetch');

    contextSettings = {
      apiKey: '[api_key]',
      domain: 'Business',
      component: 'business-service',
      environment: 'default',
      url: 'http://localhost:3000'
    };
  });

  afterEach(function() {
    fetchStub.restore();
  });

  it('should throw when certPath is invalid', function() {
    assert.throws(() => Client.buildContext(contextSettings, { certPath: 'invalid' }), 
      'Invalid certificate path \'invalid\'');
  });

  it('should NOT throw when certPath is valid', function() {
    assert.doesNotThrow(() => Client.buildContext(contextSettings, { certPath: './tests/helper/dummy-cert.pem' }));
    removeAgent();
  });

  it('should be invalid - Missing API url field', async function () {
    // given
    given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });

    // test
    Client.buildContext({ url: undefined, apiKey: 'apiKey', domain: 'domain', component: 'component', environment: 'default' });
    let switcher = Client.getSwitcher();

    await switcher
      .checkValue('User 1')
      .checkNetwork('192.168.0.1')
      .prepare('MY_FLAG');

    await assertReject(assert, switcher.isItOn(), 'Something went wrong: URL is required');
  });

  it('should be invalid - Missing API Key field', async function () {
    // given
    given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });

    // test
    Client.buildContext({ url: 'url', apiKey: undefined, domain: 'domain', component: 'component', environment: 'default' });
    let switcher = Client.getSwitcher();

    await switcher
      .checkValue('User 1')
      .checkNetwork('192.168.0.1')
      .prepare('MY_FLAG');

    await assertReject(assert, switcher.isItOn(), 'Something went wrong: API Key is required');
  });

  it('should be invalid - Missing key field', async function () {
    // given
    given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });
    given(fetchStub, 1, { json: () => generateResult(undefined) });

    // test
    Client.buildContext(contextSettings);
    let switcher = Client.getSwitcher();
    await switcher
      .checkValue('User 1')
      .checkNetwork('192.168.0.1')
      .prepare(undefined);

    await assertReject(assert, switcher.isItOn(), 'Something went wrong: Missing key field');
  });

  it('should be invalid - Missing component field', async function () {
    // given
    given(fetchStub, 0, { json: () => generateAuth('[auth_token]', 5), status: 200 });
    given(fetchStub, 1, { json: () => generateResult(undefined) });

    // test
    Client.buildContext({ url: 'url', apiKey: 'apiKey', domain: 'domain', component: undefined, environment: 'default' });
    let switcher = Client.getSwitcher();

    await assertReject(assert, switcher
      .checkValue('User 1')
      .checkNetwork('192.168.0.1')
      .isItOn('MY_FLAG'), 'Something went wrong: Component is required');
  });

  it('should be invalid - Missing token field', async function () {
    // given
    given(fetchStub, 0, { json: () => generateAuth(undefined, 1), status: 200 });
    given(fetchStub, 1, { json: () => generateResult(undefined) });

    // test
    Client.buildContext(contextSettings);
    let switcher = Client.getSwitcher();
    
    await assertReject(assert, switcher
      .checkValue('User 1')
      .checkNetwork('192.168.0.1')
      .isItOn('MY_FLAG'), 'Something went wrong: Missing token field');
  });

});