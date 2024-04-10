/**
 * Type definition for Switcher Keys which are used to mock results
 */
export default class Key {
    
    constructor(key) {
        this._key = key;
        this._result = undefined;
        this._reason = undefined;
        this._metadata = undefined;
    }

    /**
     * Force result to true
     */
    true() {
        this._result = true;
        this._reason = 'Forced to true';
        return this;
    }

    /**
     * Force result to false
     */
    false() {
        this._result = false;
        this._reason = 'Forced to false';
        return this;
    }

    /**
     * Define metadata for the response
     */
    withMetadata(metadata) {
        this._metadata = metadata;
        return this;
    }

    /**
     * Return selected switcher name
     */
    getKey() {
        return this._key;
    }

    /**
     * Return key response
     */
    getResponse() {
        return {
            key: this._key,
            result: this._result,
            reason: this._reason,
            metadata: this._metadata
        };
    }
}