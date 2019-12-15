# Install  
`npm install switcher-client`

# About  
Module for working with Switcher-API.
https://github.com/petruki/switcher-api

Switcher Client is a friendly lib to interact with the Switcher API by:
- Simplifying validations throughout your remote Switcher configuration.
- Able to work offline using a snapshot claimed from your remote Switcher.
- Being flexible in order to remove complexity of multi-staging (add as many environment as you want).
- Being friendly by making possible to manipulate switchers without changing your online switchers. (Useful for automated tests).
- Being secure by using OAuth 2 flow. Requests are made using tokens that will validate your domain, component, environment and API key.
    Tokens have expiration time and are not stored. The Switcher Client is responsible to renew it using your settings.

# Example  

```js
const Switcher = require("switcher-client");

const apiKey = 'API Key'; // Generated after domain creation. It can be generated as many time you want. It can't be recovered due to security reasons
const environment = 'default'; // Environment 'default' is created after domain creation. It's your production environment.
const domain = 'Your Domain Name'; // This is our business name Id. It's an unique value used as owner authentication id.
const component = 'Android'; // Name of the application that will be using this API. It's necessary to sign this name up into the API
const url = 'http://localhost:3000/criteria';

// Optional parameters
const offline = true; // It says to use your snapshot file to read all the criterias (default: false)
const snapshotLocation = './snapshot/default.json';

const switcher = new Switcher(url, apiKey, domain, component, environment, offline, snapshotLocation)

/**
 * Scenario #1:
 * You want to setup the input of your switch before using it. 
 * You can call prepare at any point of your code and use isItOn at another place afterwards.
 */
switcher.prepare('KEY', [Switcher.StrategiesType.VALUE, 'USER_1', Switcher.StrategiesType.NETWORK, '10.0.0.3'])
switcher.isItOn()

/**
 * Scenario #2:
 * You want to setup the input of your switch before using it. 
 * However, you want to change the key
 */
switcher.isItOn('NEW_KEY')

/**
 * Scenario #3:
 * You want to call isItOn without preparing, as simple as this:
 */
switcher.isItOn('KEY')

/**
 * Using Switch API Client to run automated test for both situations, when switch is On and Off.
 * 
 * Scenario #4:
 * You want make sure your code works on both situation when using switcher API.
 * You just need to setup on your test method the feature assume.
 */
switcher.assume('KEY').true()
switcher.isItOn('KEY') // Is going to be true

/**
 * Use forget to remove any forced result over your switcher 
 */
switcher.forget('KEY')