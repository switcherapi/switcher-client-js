const Switcher = require('../../src/index')

let switcher

function setupSwitcher() {
    const apiKey = '$2b$08$7U/KJBVgG.FQtYEKKnbLe.o6p7vBrfHFRgMipZTaokSmVFiduXq/y'
    // const apiKey = '$2b$08$m.8yx5ekyqWnAGgZjvG/AOTaMO3l1riBO/r4fHQ4EHqM87TdvHU9S'
    const domain = 'My Domain'
    const component = 'Android'
    const environment = 'default'
    const url = 'http://localhost:3000'

    switcher = new Switcher(url, apiKey, domain, component, environment, {
        offline: true
    })
}

// Requires online API
const testSnapshotUpdate = async () => {
    setupSwitcher()

    let result = await switcher.isItOn('FEATURE2020')
    console.log(result)
    
    await switcher.checkSnapshot()
    await new Promise(resolve => setTimeout(resolve, 1000))

    result = await switcher.isItOn('FEATURE2020')
    console.log(result)

    switcher.unloadSnapshot()
}

const testAsyncCall = async () => {
    setupSwitcher();

    let result = await switcher.isItOn('FEATURE2020');
    console.log(result)

    switcher.isItOnPromise('FEATURE2020')
        .then(result => console.log('Promise result:', result))
        .catch(error => console.log(error))

    switcher.assume('FEATURE2020').false()
    result = await switcher.isItOn('FEATURE2020')
    console.log('Value changed:', result)

    switcher.unloadSnapshot()
}

testAsyncCall()