const Switcher = require('../../src/index')

let switcher = new Switcher();

function setupSwitcher() {
    const apiKey = '$2b$08$m.8yx5ekyqWnAGgZjvG/AOTaMO3l1riBO/r4fHQ4EHqM87TdvHU9S';
    const domain = 'My Domain';
    const component = 'Android';
    const environment = 'default';
    const url = 'http://localhost:3000'

    switcher = new Switcher(url, apiKey, domain, component, environment, {
        offline: false
    })
}

const main = async () => {
    setupSwitcher();

    let result = await switcher.isItOn('FEATURE2020');
    console.log(result);

    switcher.isItOnPromise('FEATURE2020')
        .then(result => console.log('Promise result:', result))
        .catch(error => console.log(error));

    switcher.assume('FEATURE2020').false();
    result = await switcher.isItOn('FEATURE2020');
    console.log('Value changed:', result);
}

main()