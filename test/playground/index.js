/* eslint-disable no-unused-vars */
/* eslint-disable no-console */

const { checkNumeric } = require('../../src');
const { Switcher, checkValue, checkNetwork } = require('../../src/index');

const SWITCHER_KEY = 'FEATURE2020';
let switcher;

function setupSwitcher(offline) {
    const apiKey = '$2b$08$DYcg9NUcJouQkTtB6XxqeOQJ3DCprslij6Te.8aTF1Ds7y2sAvTjm';
    const domain = 'My Domain';
    const component = 'CustomerAPI';
    const environment = 'default';
    const url = 'http://localhost:3000';

    Switcher.buildContext({ url, apiKey, domain, component, environment }, { offline, logger: true });
    Switcher.loadSnapshot();
}

// Requires online API
const testSimpleAPICall = async () => {
    setupSwitcher(false);
    
    await Switcher.checkSwitchers([SWITCHER_KEY]);

    const switcher = Switcher.factory();
    await switcher.isItOn(SWITCHER_KEY, [checkNumeric('1')], true);

    console.log(Switcher.getLogger(SWITCHER_KEY));
    Switcher.unloadSnapshot();
};

// Requires online API
const testThrottledAPICall = async () => {
    setupSwitcher(false);
    
    await Switcher.checkSwitchers([SWITCHER_KEY]);

    const switcher = Switcher.factory();
    switcher.throttle(1000);

    for (let index = 0; index < 10; index++)
        console.log(`Call #${index} - ${await switcher.isItOn(SWITCHER_KEY, [checkNumeric('1')])}}`);

    Switcher.unloadSnapshot();
};

// Requires online API
const testSnapshotUpdate = async () => {
    setupSwitcher(false);

    const switcher = Switcher.factory();
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
    const switcher = Switcher.factory();

    let result = await switcher.isItOn(SWITCHER_KEY);
    console.log(result);

    switcher.isItOn(SWITCHER_KEY)
        .then(result => console.log('Promise result:', result))
        .catch(error => console.log(error));

    Switcher.assume(SWITCHER_KEY).false();
    result = await switcher.isItOn(SWITCHER_KEY);
    console.log('Value changed:', result);

    Switcher.unloadSnapshot();
};

const testBypasser = async () => {
    setupSwitcher(true);
    const switcher = Switcher.factory();

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
    const apiKey = '$2b$08$DYcg9NUcJouQkTtB6XxqeOQJ3DCprslij6Te.8aTF1Ds7y2sAvTjm';
    const domain = 'My Domain';
    const component = 'CustomerAPI';
    const environment = 'generated';
    const url = 'http://localhost:3000';

    Switcher.buildContext({ url, apiKey, domain, component, environment });
    await Switcher.loadSnapshot();

    const switcher = Switcher.factory();
    let result = await switcher.isItOn(SWITCHER_KEY);
    console.log(result);

    Switcher.unloadSnapshot();
};

testSimpleAPICall();