import { assert } from 'chai';

import { Client } from '../switcher-client.js';

describe('Switcher integrated test', () => {

    const contextSettings = {
        url: 'https://api.switcherapi.com',
        apiKey: process.env.SWITCHER_API_KEY,
        domain: 'Switcher API',
        component: 'switcher-client-js'
    };

    it('should hit remote API and return Switcher response', async function () {
        this.timeout(3000);

        if (!process.env.SWITCHER_API_KEY) {
            this.skip();
        }

        // given context build
        Client.buildContext(contextSettings);

        // test
        const switcher = Client.getSwitcher().detail();
        const result = await switcher.isItOn('CLIENT_JS_FEATURE');

        assert.isNotNull(result);
    });

    it('should load snapshot from remote API', async function () {
        this.timeout(3000);

        if (!process.env.SWITCHER_API_KEY) {
            this.skip();
        }

        // given context build
        Client.buildContext(contextSettings, { local: true });

        // test
        await Client.loadSnapshot({ fetchRemote: true });

        const switcher = Client.getSwitcher().detail();
        const result = await switcher.isItOn('CLIENT_JS_FEATURE');

        assert.isNotNull(result);
        assert.isAbove(Client.snapshotVersion, 0);
    });

    it('should check Switcher availability', async function () {
        this.timeout(3000);

        if (!process.env.SWITCHER_API_KEY) {
            this.skip();
        }

        // given context build
        Client.buildContext(contextSettings);

        // test
        await Client.checkSwitchers(['CLIENT_JS_FEATURE']);
        
        assert.isTrue(true);
    });

});