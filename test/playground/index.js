/* eslint-disable no-unused-vars */
/* eslint-disable no-console */

import { Client } from '../../switcher-client.js';
import { sleep } from '../helper/utils.js';

const SWITCHER_KEY = 'MY_SWITCHER';
const apiKey = 'JDJiJDA4JEFweTZjSTR2bE9pUjNJOUYvRy9raC4vRS80Q2tzUnk1d3o1aXFmS2o5eWJmVW11cjR0ODNT';
const domain = 'Playground';
const component = 'switcher-playground';
const environment = 'default';
const url = 'https://api.switcherapi.com';
const snapshotLocation = './test/playground/snapshot/';

/**
 * Playground environment for showcasing the API
 */
async function setupSwitcher(local) {
    Client.buildContext({ url, apiKey, domain, component, environment }, { local, logger: true });
    await Client.loadSnapshot({ watchSnapshot: false, fetchRemote: local })
        .then(version => console.log('Snapshot loaded - version:', version))
        .catch(() => console.log('Failed to load Snapshot'));
}

/**
 * This code snippet is a minimal example of how to configure and use Switcher4Deno locally.
 * No remote API account is required.
 * 
 * Snapshot is loaded from file at test/playground/snapshot/local.json
 */
const _testLocal = async () => {
    Client.buildContext({ 
        domain: 'Local Playground', 
        environment: 'local' 
    }, { 
        snapshotLocation: './test/playground/snapshot/', 
        local: true
    });

    await Client.loadSnapshot()
        .then(version => console.log('Snapshot loaded - version:', version))
        .catch(() => console.log('Failed to load Snapshot'));

    const switcher = Client.getSwitcher();

    setInterval(async () => {
        const time = Date.now();
        const result = await switcher.detail().isItOn(SWITCHER_KEY);
        console.log(`- ${Date.now() - time} ms - ${JSON.stringify(result)}`);
    }, 1000);
};

// Requires remote API
const _testSimpleAPICall = async (local) => {
    await setupSwitcher(local);
    
    await Client.checkSwitchers([SWITCHER_KEY])
        .then(() => console.log('Switcher checked'))
        .catch(error => console.log(error));

    const switcher = Client.getSwitcher();

    setInterval(async () => {
        const time = Date.now();
        const result = await switcher.isItOn(SWITCHER_KEY);
        console.log(`- ${Date.now() - time} ms - ${JSON.stringify(result)}`);
    }, 1000);
};

// Requires remote API
const _testThrottledAPICall = async () => {
    setupSwitcher(false);
    
    await Client.checkSwitchers([SWITCHER_KEY]);
    Client.subscribeNotifyError((error) => console.log(error));

    const switcher = Client.getSwitcher();
    switcher.throttle(1000);

    setInterval(async () => {
        const time = Date.now();
        const result = await switcher
            .detail()
            .isItOn(SWITCHER_KEY);
            
        console.log(`- ${Date.now() - time} ms - ${JSON.stringify(result)}`);
    }, 1000);
};

// Requires remote API
const _testSnapshotUpdate = async () => {
    setupSwitcher(false);
    await sleep(2000);
    
    console.log('checkSnapshot:', await Client.checkSnapshot());

    Client.unloadSnapshot();
};

const _testAsyncCall = async () => {
    setupSwitcher(true);
    const switcher = Client.getSwitcher();

    console.log('Sync:', await switcher.isItOn(SWITCHER_KEY));

    switcher.isItOn(SWITCHER_KEY)
        .then(res => console.log('Promise result:', res))
        .catch(error => console.log(error));

    Client.unloadSnapshot();
};

const _testBypasser = async () => {
    setupSwitcher(true);
    const switcher = Client.getSwitcher();

    let result = await switcher.isItOn(SWITCHER_KEY);
    console.log(result);

    Client.assume(SWITCHER_KEY).true();
    result = await switcher.isItOn(SWITCHER_KEY);
    console.log(result);

    Client.forget(SWITCHER_KEY);
    result = await switcher.isItOn(SWITCHER_KEY);
    console.log(result);

    Client.unloadSnapshot();
};

// Requires remote API
const _testWatchSnapshot = async () => {
    Client.buildContext({ url, apiKey, domain, component, environment }, { snapshotLocation, local: true, logger: true });
    await Client.loadSnapshot({ watchSnapshot: false, fetchRemote: true })
        .then(() => console.log('Snapshot loaded'))
        .catch(() => console.log('Failed to load Snapshot'));

    const switcher = Client.getSwitcher();
    
    Client.watchSnapshot({
        success: async () => console.log('In-memory snapshot updated', await switcher.isItOn(SWITCHER_KEY)),
        reject: (err) => console.log(err)
    });
};

// Requires remote API
const _testSnapshotAutoUpdate = async () => {
    Client.buildContext({ url, apiKey, domain, component, environment }, 
        { local: true, logger: true });

    await Client.loadSnapshot({ watchSnapshot: false, fetchRemote: true });
    const switcher = Client.getSwitcher();

    Client.scheduleSnapshotAutoUpdate(1, {
        success: (updated) => console.log('In-memory snapshot updated', updated),
        reject: (err) => console.log(err)
    });

    setInterval(async () => {
        const time = Date.now();
        await switcher.checkValue('user_1').isItOn(SWITCHER_KEY);
        console.clear();
        console.log(Client.getLogger(SWITCHER_KEY), `executed in ${Date.now() - time}ms`);
    }, 2000);
};

_testLocal();