import { assert } from 'chai';

import { Client } from '../switcher-client.js';

describe('Switcher integrated test', () => {

    it('should hit remote API and return Switcher response', async function () {
        this.timeout(3000);

        // given context build
        Client.buildContext({
            url: 'https://api.switcherapi.com',
            apiKey: process.env.SWITCHER_API_KEY,
            domain: 'Playground',
            component: 'switcher-playground'
        });

        // test
        const switcher = Client.getSwitcher().detail();
        const result = await switcher.isItOn('CLIENT_JS_FEATURE_1');

        assert.isNotNull(result);
    });

});