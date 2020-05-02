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

function searchBypassed(key, bypassedKeys) {
    let existentKey;
    bypassedKeys.forEach(async bk => {
        if (bk.getKey() === key) {
            return existentKey = bk;
        }
    })
    return existentKey;
}

module.exports = {
    Key,
    searchBypassed
}