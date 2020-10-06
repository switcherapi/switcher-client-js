'use strict';

const Key = require('./key');

class Bypasser {
    static bypassedKeys = new Array();

    static assume(key) {
        const existentKey = this.searchBypassed(key, Bypasser.bypassedKeys);
        if (existentKey) {
            return existentKey;
        }

        const keyBypassed = new Key(key);
        Bypasser.bypassedKeys.push(keyBypassed);
        return keyBypassed;
    }

    static forget(key) {
        Bypasser.bypassedKeys.splice(
            Bypasser.bypassedKeys.indexOf(this.searchBypassed(key, Bypasser.bypassedKeys)), 1);
    }

    static searchBypassed(key) {
        let existentKey;
        Bypasser.bypassedKeys.forEach(async bk => {
            if (bk.getKey() === key) {
                return existentKey = bk;
            }
        });
        return existentKey;
    }
}

module.exports = Bypasser;