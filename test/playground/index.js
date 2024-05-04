/* eslint-disable no-unused-vars */
/* eslint-disable no-console */

import { Switcher, checkValue, checkNumeric } from '../../switcher-client.js';
import { sleep } from '../helper/utils.js';

const SWITCHER_KEY = 'MY_SWITCHER';
const apiKey = 'JDJiJDA4JEFweTZjSTR2bE9pUjNJOUYvRy9raC4vRS80Q2tzUnk1d3o1aXFmS2o5eWJmVW11cjR0ODNT';
const domain = 'Playground';
const component = 'switcher-playground';
const environment = 'default';
const url = 'https://api.switcherapi.com';
const snapshotLocation = './test/playground/snapshot/';

let switcher;

/**
 * Playground environment for showcasing the API
 */
async function setupSwitcher(local) {
    Switcher.buildContext({ url, apiKey, domain, component, environment }, { local, logger: true });
    await Switcher.loadSnapshot(false, local)
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
    Switcher.buildContext({ 
        domain: 'Local Playground', 
        environment: 'local' 
    }, { 
        snapshotLocation: './test/playground/snapshot/', 
        local: true
    });

    await Switcher.loadSnapshot()
        .then(version => console.log('Snapshot loaded - version:', version))
        .catch(() => console.log('Failed to load Snapshot'));

    switcher = Switcher.factory();

    setInterval(async () => {
        const time = Date.now();
        const result = await switcher.detail().isItOn(SWITCHER_KEY);
        console.log(`- ${Date.now() - time} ms - ${JSON.stringify(result)}`);
    }, 1000);
};

// Requires remote API
const _testSimpleAPICall = async (local) => {
    await setupSwitcher(local);
    
    await Switcher.checkSwitchers([SWITCHER_KEY])
        .then(() => console.log('Switcher checked'))
        .catch(error => console.log(error));

    switcher = Switcher.factory();

    setInterval(async () => {
        const time = Date.now();
        const result = await switcher.isItOn(SWITCHER_KEY);
        console.log(`- ${Date.now() - time} ms - ${JSON.stringify(result)}`);
    }, 1000);
};

// Requires remote API
const _testThrottledAPICall = async () => {
    setupSwitcher(false);
    
    await Switcher.checkSwitchers([SWITCHER_KEY]);

    switcher = Switcher.factory();
    switcher.throttle(1000);

    setInterval(async () => {
        const time = Date.now();
        const result = await switcher.isItOn(SWITCHER_KEY, [checkNumeric('1')]);
        console.log(`- ${Date.now() - time} ms - ${JSON.stringify(result)}`);
    }, 1000);
};

// Requires remote API
const _testSnapshotUpdate = async () => {
    setupSwitcher(false);
    await sleep(2000);
    
    switcher = Switcher.factory();
    console.log('checkSnapshot:', await Switcher.checkSnapshot());

    Switcher.unloadSnapshot();
};

const _testAsyncCall = async () => {
    setupSwitcher(true);
    switcher = Switcher.factory();

    console.log('Sync:', await switcher.isItOn(SWITCHER_KEY));

    switcher.isItOn(SWITCHER_KEY)
        .then(res => console.log('Promise result:', res))
        .catch(error => console.log(error));

    Switcher.unloadSnapshot();
};

const _testBypasser = async () => {
    setupSwitcher(true);
    switcher = Switcher.factory();

    let result = await switcher.isItOn(SWITCHER_KEY);
    console.log(result);

    Switcher.assume(SWITCHER_KEY).true();
    result = await switcher.isItOn(SWITCHER_KEY);
    console.log(result);

    Switcher.forget(SWITCHER_KEY);
    result = await switcher.isItOn(SWITCHER_KEY);
    console.log(result);

    Switcher.unloadSnapshot();
};

// Requires remote API
const _testWatchSnapshot = async () => {
    Switcher.buildContext({ url, apiKey, domain, component, environment }, { snapshotLocation, local: true, logger: true });
    await Switcher.loadSnapshot(false, true)
        .then(() => console.log('Snapshot loaded'))
        .catch(() => console.log('Failed to load Snapshot'));

    const switcher = Switcher.factory();

    Switcher.watchSnapshot(
        async () => console.log('In-memory snapshot updated', await switcher.isItOn(SWITCHER_KEY)), 
        (err) => console.log(err));
};

// Requires remote API
const _testSnapshotAutoUpdate = async () => {
    Switcher.buildContext({ url, apiKey, domain, component, environment }, 
        { local: true, logger: true });

    await Switcher.loadSnapshot(false, true);
    const switcher = Switcher.factory();

    Switcher.scheduleSnapshotAutoUpdate(3, 
        (updated) => console.log('In-memory snapshot updated', updated), 
        (err) => console.log(err));

    setInterval(async () => {
        const time = Date.now();
        await switcher.isItOn(SWITCHER_KEY, [checkValue('user_1')]);
        console.clear();
        console.log(Switcher.getLogger(SWITCHER_KEY), `executed in ${Date.now() - time}ms`);
    }, 2000);
};

_testLocal();