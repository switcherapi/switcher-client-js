const Key = require('./key');
const bypassedKeys = new Array();

class Bypasser {

    /**
     * Force a switcher value to return a given value by calling one of both methods - true() false()
     * 
     * @param key 
     */
    static assume(key) {
        const existentKey = this.searchBypassed(key);
        if (existentKey) {
            return existentKey;
        }

        const keyBypassed = new Key(key);
        bypassedKeys.push(keyBypassed);
        return keyBypassed;
    }

    /**
     * Remove forced value from a switcher
     * 
     * @param key 
     */
    static forget(key) {
        bypassedKeys.splice(
            bypassedKeys.indexOf(this.searchBypassed(key)), 1);
    }

    /**
     * Search for key registered via 'assume'
     * 
     * @param key 
    */
    static searchBypassed(key) {
        for (const bypassed of bypassedKeys) {
            if (bypassed.key === key) {
                return bypassed;
            }
        }
    }
}

module.exports = Bypasser;