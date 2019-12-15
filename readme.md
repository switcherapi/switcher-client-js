# Install  
`npm install switcher-client`

# About  
Module for working with Switcher-API.

# Example  

```js
const { Switcher, Validate } = require("switcher-client");

const switcher = new Switcher(url, token);
switcher.prepare('KEY', [Validate.VALUE, 'USER_1', Validate.NETWORK, '10.0.0.3'])
//or
switcher.prepare('KEY')
//then
switcher.isItOn()

//or
switcher.isItOn('KEY', [Validate.VALUE, 'USER_1', Validate.NETWORK, '10.0.0.3'])
//or
switcher.isItOn('KEY')