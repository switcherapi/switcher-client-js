'use strict';

class Key {
    constructor(key) {
        this.key = key;
        this.value = undefined;
    }

    true() {
        this.value = true;
    }

    false() {
        this.value = false;
    }

    getKey() {
        return this.key;
    }

    getValue() {
        return this.value;
    }
}

module.exports = Key;