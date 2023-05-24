***

<div align="center">
<b>Switcher Client SDK</b><br>
A JavaScript SDK for Switcher API
</div>

<div align="center">

[![Master CI](https://github.com/switcherapi/switcher-client-master/actions/workflows/master.yml/badge.svg)](https://github.com/switcherapi/switcher-client-master/actions/workflows/master.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=switcherapi_switcher-client-master&metric=alert_status)](https://sonarcloud.io/dashboard?id=switcherapi_switcher-client-master)
[![npm version](https://badge.fury.io/js/switcher-client.svg)](https://badge.fury.io/js/switcher-client)
[![install size](https://packagephobia.com/badge?p=switcher-client)](https://packagephobia.com/result?p=switcher-client)
[![Known Vulnerabilities](https://snyk.io/test/github/switcherapi/switcher-client-master/badge.svg?targetFile=package.json)](https://snyk.io/test/github/switcherapi/switcher-client-master?targetFile=package.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Slack: Switcher-HQ](https://img.shields.io/badge/slack-@switcher/hq-blue.svg?logo=slack)](https://switcher-hq.slack.com/)

</div>

***

![Switcher API: JavaScript Client: Cloud-based Feature Flag API](https://github.com/switcherapi/switcherapi-assets/blob/master/logo/switcherapi_js_client.png)

# About  
JavaScript SDK for working with Switcher-API.
https://github.com/switcherapi/switcher-api

- Flexible and robust functions that will keep your code clean and maintainable.
- Able to work offline using a snapshot file downloaded from your remote Switcher-API Domain.
- Silent mode is a hybrid configuration that automatically enables a contingent sub-process in case of any connectivity issue.
- Built-in mock implementation for clear and easy implementation of automated testing.
- Easy to setup. Switcher Context is responsible to manage all the complexity between your application and API.

# Usage

## Install  
`npm install switcher-client`

## Module initialization
The context properties stores all information regarding connectivity.

```js
const { Switcher } = require('switcher-client');

const apiKey = '[API_KEY]';
const environment = 'default';
const domain = 'My Domain';
const component = 'MyApp';
const url = 'https://switcherapi.com/api';
```

- **apiKey**: Switcher-API key generated to your component.
- **environment**: (optional) Environment name. Production environment is named as 'default'.
- **domain**: Domain name.
- **component**: Application name.
- **url**: (optional) Swither-API endpoint.

## Options
You can also activate features such as offline and silent mode:

```js
const offline = true;
const logger = true;
const snapshotLocation = './snapshot/';
const snapshotAutoUpdateInterval = 3000;
const silentMode = true;
const retryAfter = '5m';

Switcher.buildContext({ url, apiKey, domain, component, environment }, {
    offline, logger, snapshotLocation, snapshotAutoUpdateInterval, silentMode, retryAfter
});

let switcher = Switcher.factory();
```

- **offline**: If activated, the client will only fetch the configuration inside your snapshot file. The default value is 'false'
- **logger**: If activated, it is possible to retrieve the last results from a given Switcher key using Switcher.getLogger('KEY')
- **snapshotLocation**: Location of snapshot files. The default value is './snapshot/'
- **snapshotAutoUpdateInterval**: Enable Snapshot Auto Update given an interval in ms (default: 0 disabled).
- **silentMode**: If activated, all connectivity issues will be ignored and the client will automatically fetch the configuration into your snapshot file
- **retryAfter**: Time given to the module to re-establish connectivity with the API - e.g. 5s (s: seconds - m: minutes - h: hours)
- **regexMaxBlackList**: Number of entries cached when REGEX Strategy fails to perform (reDOS safe) - default: 50
- **regexMaxTimeLimit**: Time limit (ms) used by REGEX workers (reDOS safe) - default - 3000ms

## Executing
There are a few different ways to call the API using the JavaScript module.
Here are some examples:

1. **No parameters**
Invoking the API can be done by instantiating the switcher and calling *isItOn* passing its key as a parameter.

```js
const switcher = Switcher.factory();
await switcher.isItOn('FEATURE01');
```

2. **Promise**
Most functions were implemented using async operations. Here it is a differnet way to execute the criteria:

```js
switcher.isItOn('KEY')
    .then(result => console.log('Result:', result))
    .catch(error => console.log(error));
```

3. **Strategy validation - preparing input**
Loading information into the switcher can be made by using *prepare*, in case you want to include input from a different place of your code. Otherwise, it is also possible to include everything in the same call.

```js
const { checkValue, checkNetwork } = require('switcher-client');

switcher.prepare('FEATURE01', [checkValue('USER_1')];
switcher.isItOn();
```

4. **Strategy validation - all-in-one execution**
All-in-one method is fast and include everything you need to execute a complex call to the API.

```js
await switcher.isItOn('FEATURE01', [
    checkValue('User 1'),
    checkNetwork('192.168.0.1')
]);
```

5. **Throttle**
Throttling is useful when placing Feature Flags at critical code blocks require zero-latency without having to switch to offline.
API calls will happen asynchronously and the result returned is based on the last API response.

```js
const switcher = Switcher.factory();
await switcher
    .throttle(1000)
    .isItOn('FEATURE01');
```

## Built-in mock feature
You can also bypass your switcher configuration by invoking 'Switcher.assume'. This is perfect for your test code where you want to test both scenarios when the switcher is true and false.

```js
Switcher.assume('FEATURE01').true();
switcher.isItOn('FEATURE01'); // true

Switcher.forget('FEATURE01');
switcher.isItOn('FEATURE01'); // Now, it's going to return the result retrieved from the API or the Snaopshot file
```

**Enabling Test Mode**
You may want to enable this feature while using Switcher Client with automated testing.
It prevents the Switcher Client from locking snapshot files even after the test execution.

To enable this feature, it is recommended to place the following on your test setup files:
```js
Switcher.setTestEnabled();
```

**Smoke Test**
Validate Switcher Keys on your testing pipelines before deploying a change.
Switcher Keys may not be configured correctly and can cause your code to have undesired results.

This feature will validate using the context provided to check if everything is up and running.
In case something is missing, this operation will throw an exception pointing out which Switcher Keys are not configured.
```js
Switcher.checkSwitchers(['FEATURE01', 'FEATURE02'])
```

## Loading Snapshot from the API
This step is optional if you want to load a copy of the configuration that can be used to eliminate latency when offline mode is activated.<br>
Activate watchSnapshot optionally passing true in the arguments.<br>
Auto load Snapshot from API passing true as second argument.

```js
Switcher.loadSnapshot();
```

## Watch for Snapshot file changes
Activate and monitor snapshot changes using this feature. Optionally, you can implement any action based on the callback response.

```js
Switcher.watchSnapshot(
    () =>  console.log('In-memory snapshot updated'), 
    (err) => console.log(err));
```

## Snapshot version check
For convenience, an implementation of a domain version checker is available if you have external processes that manage snapshot files.

```js
Switcher.checkSnapshot();
```