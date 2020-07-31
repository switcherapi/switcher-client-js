const Switcher = require('../../src/index');

let switcher;

function setupSwitcher(offline) {
    const apiKey = '$2b$08$e6EUI0358sk5QBAZlxrBF.Eg5jwhLSRfoKLvCAcbctCnKMoqcM5Fi'
    const domain = 'My Domain'
    const component = 'CustomerAPI'
    const environment = 'default'
    const url = 'http://localhost:3000'

    switcher = new Switcher(url, apiKey, domain, component, environment, {
        offline, logger: true
    });
}

// Requires online API
const testSimpleAPICall = async () => {
    setupSwitcher(false);

    await switcher.isItOn('FEATURE01', null, true);
    await switcher.isItOn('FEATURE02', null, true);
    console.log(Switcher.getLogger('FEATURE01'));

    switcher.unloadSnapshot();
}

// Requires online API
const testSnapshotUpdate = async () => {
    setupSwitcher(false);

    let result = await switcher.isItOn('FEATURE2020');
    console.log(result);
    
    await switcher.checkSnapshot();
    await new Promise(resolve => setTimeout(resolve, 1000));

    result = await switcher.isItOn('FEATURE2020');
    console.log(result);

    switcher.unloadSnapshot();
}

const testAsyncCall = async () => {
    setupSwitcher(true);

    let result = await switcher.isItOn('FEATURE2020');
    console.log(result);

    switcher.isItOnPromise('FEATURE2020')
        .then(result => console.log('Promise result:', result))
        .catch(error => console.log(error));

    Switcher.assume('FEATURE2020').false();
    result = await switcher.isItOn('FEATURE2020');
    console.log('Value changed:', result);

    switcher.unloadSnapshot();
}

const testBypasser = async () => {
    setupSwitcher(true);

    let result = await switcher.isItOn('FEATURE2020');
    console.log(result);

    Switcher.assume('FEATURE2020').false();
    result = await switcher.isItOn('FEATURE2020');
    console.log(result);

    Switcher.forget('FEATURE2020');
    result = await switcher.isItOn('FEATURE2020');
    console.log(result);

    switcher.unloadSnapshot();
}

testSimpleAPICall();