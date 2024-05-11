import { assert } from 'chai';

import { Client } from '../switcher-client.js';

describe('Switcher integrated test', () => {

    it('should hit remote API and return Switcher response', async function () {
        this.timeout(3000);

        // given context build
        Client.buildContext({
            url: 'https://api.switcherapi.com',
            apiKey: 'JDJiJDA4JEFweTZjSTR2bE9pUjNJOUYvRy9raC4vRS80Q2tzUnk1d3o1aXFmS2o5eWJmVW11cjR0ODNT',
            domain: 'Playground',
            component: 'switcher-playground'
        });

        // test
        const switcher = Client.getSwitcher().detail();
        const result = await switcher.isItOn('CLIENT_JS_FEATURE_1');

        assert.isNotNull(result);
    });

});