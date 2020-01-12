[![Build Status](https://travis-ci.com/petruki/switcher-client-master.svg?branch=master)](https://travis-ci.com/petruki/switcher-client-master)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=switcher-client-master&metric=alert_status)](https://sonarcloud.io/dashboard?id=switcher-client-master)
[![Coverage Status](https://coveralls.io/repos/github/petruki/switcher-client-master/badge.svg?branch=master)](https://coveralls.io/github/petruki/switcher-client-master?branch=master)
[![npm version](https://badge.fury.io/js/switcher-client.svg)](https://badge.fury.io/js/switcher-client)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

![Switcher API: JavaScript Client: Cloud-based Feature Flag API](https://github.com/petruki/switcherapi-assets/blob/master/logo/switcherapi_js_client.png)

# Install  
`npm install switcher-client`

# About  
Module for working with Switcher-API.
https://github.com/petruki/switcher-api

Switcher Client is a friendly lib to interact with the Switcher API by:
- Simplifying validations throughout your remote Switcher configuration.
- Able to work offline using a snapshot claimed from your remote Switcher-API.
- Able to run in silent mode that will prevent your application to not be 100% dependent on the online API.
- Being flexible in order to remove the complexity of multi-staging (add as many environments as you want).
- Being friendly by making possible to manipulate switchers without changing your online switchers. (useful for automated tests).
- Being secure by using OAuth 2 flow. Requests are made using tokens that will validate your domain, component, environment and API key.
Tokens have an expiration time and are not stored. The Switcher Client is responsible to renew it using your settings.

# Example
1) Configure your client
```js
const Switcher = require("switcher-client");

const apiKey = 'API Key';
const environment = 'default';
const domain = 'Your Domain Name';
const component = 'Android';
const url = 'http://localhost:3000/criteria';
```
- **apiKey**: Obtained after creating your domain using the Switcher-API project.
- **environment**: You can run multiple environments. Production environment is 'default' which is created automatically after creating the domain.
- **domain**: This is your business name identification.
- **component**: This is the name of the application that will be using this API.
- **url**: Endpoint of your Swither-API.

2) Options - you can also activate features such as offline and silent mode
```js
const offline = true;
const snapshotLocation = './snapshot/default.json';
const silentMode = true;
const retryAfter = '5m';
```
- **offline**: If activated, the client will only fetch the configuration inside your snapshot file. The default value is 'false'.
- **snapshotLocation**: Location of your snapshot. The default value is './snapshot/default.json'.
- **silentMode**: If activated, all connections errors will be ignored and the client will automatically fetch the configuration into your snapshot.
- **retryAfter** : Set the duration you want the client to try to reach the online API again. (see moment documentation for time signature). The default value is 5m.

3) Create the client
```js
const switcher = new Switcher(url, apiKey, domain, component, environment)
//or - using silent mode
const switcher = new Switcher(url, apiKey, domain, component, environment, { silentMode: true })
//or - using offline mode
const switcher = new Switcher(url, apiKey, domain, component, environment, { offline: true })
```

## Invoking switchers
**Scenario 1**

You want to setup the input of your switch before using it and call 'isItOn' some elsewhere.
```js
switcher.prepare('MY_KEY', [Switcher.StrategiesType.VALUE, 'USER_1')
switcher.isItOn()
```

**Scenario 2**

You want to call isItOn without preparing, as simple as this:
```js
switcher.isItOn('KEY')
```

**Scenario 3**

Using promise is another way to call the API if you want:
```js
switcher.isItOnPromise('KEY')
    .then(result => console.log('Promise result:', result))
    .catch(error => console.log(error));
```

## Bypassing switchers
You can also bypass your switcher configuration by invoking 'assume'. This is perfect for your test code where you want to test both scenarios when the switcher is true and false.
```js
switcher.assume('KEY').true()
switcher.isItOn('KEY') // it is going to be true
```

Invoke forget to remove any switch assumption, like this:
```js
switcher.forget('KEY')
```