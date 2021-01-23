'use strict';

const Key = require('./key');
var bypassedKeys = new Array();

class Bypasser {

    static assume(key) {
        const existentKey = this.searchBypassed(key, bypassedKeys);
        if (existentKey) {
            return existentKey;
        }

        const keyBypassed = new Key(key);
        bypassedKeys.push(keyBypassed);
        return keyBypassed;
    }

    static forget(key) {
        bypassedKeys.splice(
            bypassedKeys.indexOf(this.searchBypassed(key, bypassedKeys)), 1);
    }

    static searchBypassed(key) {
        let existentKey;
        bypassedKeys.forEach(async bk => {
            if (bk.getKey() === key) {
                return existentKey = bk;
            }
        });
        return existentKey;
    }
}

module.exports = Bypasser;