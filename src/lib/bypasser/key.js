/**
 * Type definition for Switcher Keys which are used to mock results
 */
export default class Key {
    
    constructor(key) {
        this.key = key;
        this.value = undefined;
    }

    /**
     * Force result to true
     */
    true() {
        this.value = true;
    }

    /**
     * Force result to false
     */
    false() {
        this.value = false;
    }

    /**
     * Return selected switcher name
     */
    getKey() {
        return this.key;
    }

    /**
     * Return current value
     */
    getValue() {
        return this.value;
    }
}