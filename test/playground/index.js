/* eslint-disable no-unused-vars */
/* eslint-disable no-console */

const { checkNumeric } = require('../../src');
const { Switcher, checkValue, checkNetwork } = require('../../src/index');

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
    
    await Switcher.checkSwitchers(['FEATURE2020']);

    const switcher = Switcher.factory();
    await switcher.isItOn('FEATURE2020', [checkNumeric('1')], true);

    console.log(Switcher.getLogger('FEATURE2020'));
    Switcher.unloadSnapshot();
};

// Requires online API
const testSnapshotUpdate = async () => {
    setupSwitcher(false);

    const switcher = Switcher.factory();
    let result = await switcher.isItOn('FEATURE2020');
    console.log(result);
    
    await Switcher.checkSnapshot();
    await new Promise(resolve => setTimeout(resolve, 1000));

    result = await switcher.isItOn('FEATURE2020');
    console.log(result);

    Switcher.unloadSnapshot();
};

const testAsyncCall = async () => {
    setupSwitcher(true);
    const switcher = Switcher.factory();

    let result = await switcher.isItOn('FEATURE2020');
    console.log(result);

    switcher.isItOn('FEATURE2020')
        .then(result => console.log('Promise result:', result))
        .catch(error => console.log(error));

    Switcher.assume('FEATURE2020').false();
    result = await switcher.isItOn('FEATURE2020');
    console.log('Value changed:', result);

    Switcher.unloadSnapshot();
};

const testBypasser = async () => {
    setupSwitcher(true);
    const switcher = Switcher.factory();

    let result = await switcher.isItOn('FEATURE2020');
    console.log(result);

    Switcher.assume('FEATURE2020').false();
    result = await switcher.isItOn('FEATURE2020');
    console.log(result);

    Switcher.forget('FEATURE2020');
    result = await switcher.isItOn('FEATURE2020');
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
    let result = await switcher.isItOn('FEATURE2020');
    console.log(result);

    Switcher.unloadSnapshot();
};

testSimpleAPICall();