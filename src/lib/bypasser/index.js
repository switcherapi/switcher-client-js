import Key from './key.js';
const bypassedKeys = new Array();

export default class Bypasser {

    /**
     * Force a switcher value to return a given value by calling one of both methods - true() false()
     * 
     * @param key 
     */
    static assume(key) {
        Bypasser.forget(key);

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
        const keyIndex = bypassedKeys.indexOf(this.searchBypassed(key));
        if (keyIndex > -1) {
            bypassedKeys.splice(keyIndex, 1);
        }
    }

    /**
     * Search for key registered via 'assume'
     * 
     * @param key 
    */
    static searchBypassed(key) {
        for (const bypassed of bypassedKeys) {
            if (bypassed.getKey() === key) {
                return bypassed;
            }
        }
    }
}