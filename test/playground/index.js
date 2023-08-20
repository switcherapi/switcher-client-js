/* eslint-disable no-unused-vars */
/* eslint-disable no-console */

const { checkNumeric } = require('../../src');
const { Switcher, checkValue, checkNetwork } = require('../../src/index');

const SWITCHER_KEY = 'MY_SWITCHER';
const apiKey = 'JDJiJDA4JEFweTZjSTR2bE9pUjNJOUYvRy9raC4vRS80Q2tzUnk1d3o1aXFmS2o5eWJmVW11cjR0ODNT';
const domain = 'Playground';
const component = 'switcher-playground';
const environment = 'default';
const url = 'https://switcherapi.com/api';

let switcher;

/**
 * Playground environment for showcasing the API
 */
async function setupSwitcher(offline) {
    Switcher.buildContext({ url, apiKey, domain, component, environment }, { offline, logger: true });
    await Switcher.loadSnapshot(false, true)
        .then(() => console.log('Snapshot loaded'))
        .catch(() => console.log('Failed to load Snapshot'));
}

// Requires online API
const testSimpleAPICall = async (offline) => {
    await setupSwitcher(offline);
    
    await Switcher.checkSwitchers([SWITCHER_KEY])
        .then(() => console.log('Switcher checked'))
        .catch(error => console.log(error));

    switcher = Switcher.factory();
    while(1 == '1') {
        const time = Date.now();
        const result = await switcher.isItOn(SWITCHER_KEY);
        console.log(`- ${Date.now() - time} ms - ${result}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
};

// Requires online API
const testThrottledAPICall = async () => {
    setupSwitcher(false);
    
    await Switcher.checkSwitchers([SWITCHER_KEY]);

    switcher = Switcher.factory();
    switcher.throttle(1000);

    for (let index = 0; index < 10; index++)
        console.log(`Call #${index} - ${await switcher.isItOn(SWITCHER_KEY, [checkNumeric('1')])}}`);

    Switcher.unloadSnapshot();
};

// Requires online API
const testSnapshotUpdate = async () => {
    setupSwitcher(false);

    switcher = Switcher.factory();
    let result = await switcher.isItOn(SWITCHER_KEY);
    console.log(result);
    
    await Switcher.checkSnapshot();
    await new Promise(resolve => setTimeout(resolve, 1000));

    result = await switcher.isItOn(SWITCHER_KEY);
    console.log(result);

    Switcher.unloadSnapshot();
};

const testAsyncCall = async () => {
    setupSwitcher(true);
    switcher = Switcher.factory();

    let result = await switcher.isItOn(SWITCHER_KEY);
    console.log(result);

    switcher.isItOn(SWITCHER_KEY)
        .then(res => console.log('Promise result:', res))
        .catch(error => console.log(error));

    Switcher.assume(SWITCHER_KEY).false();
    result = await switcher.isItOn(SWITCHER_KEY);
    console.log('Value changed:', result);

    Switcher.unloadSnapshot();
};

const testBypasser = async () => {
    setupSwitcher(true);
    switcher = Switcher.factory();

    let result = await switcher.isItOn(SWITCHER_KEY);
    console.log(result);

    Switcher.assume(SWITCHER_KEY).false();
    result = await switcher.isItOn(SWITCHER_KEY);
    console.log(result);

    Switcher.forget(SWITCHER_KEY);
    result = await switcher.isItOn(SWITCHER_KEY);
    console.log(result);

    Switcher.unloadSnapshot();
};

// Requires online API
const testSnapshotAutoload = async () => {
    Switcher.buildContext({ url, apiKey, domain, component, environment: 'generated' });
    await Switcher.loadSnapshot();

    switcher = Switcher.factory();
    let result = await switcher.isItOn(SWITCHER_KEY);
    console.log(result);

    Switcher.unloadSnapshot();
};

// Requires online API
const testWatchSnapshot = () => {
    setupSwitcher(true);
    switcher = Switcher.factory();

    Switcher.watchSnapshot(
        () =>  console.log('In-memory snapshot updated'), 
        (err) => console.log(err));
};

// Requires online API
const testSnapshotAutoUpdate = async () => {
    Switcher.buildContext({ url, apiKey, domain, component, environment }, 
        { offline: true, logger: true });

    await Switcher.loadSnapshot();
    switcher = Switcher.factory();

    Switcher.scheduleSnapshotAutoUpdate(3, (updated, err) => {
        if (updated != undefined) {
            console.log('Snapshot updated', updated);
        } else {
            console.log(err);
        }
    });

    setInterval(async () => {
        const time = Date.now();
        await switcher.isItOn(SWITCHER_KEY, [checkValue('user_1')]);
        console.clear();
        console.log(Switcher.getLogger(SWITCHER_KEY), `executed in ${Date.now() - time}ms`);
    }, 2000);
};

testSimpleAPICall(true);