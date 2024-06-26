/**
 * Key record used to store key response when bypassing criteria execution
 */
export default class Key {

    #key;
    #result;
    #reason;
    #metadata;
    
    constructor(key) {
        this.#key = key;
        this.#result = undefined;
        this.#reason = undefined;
        this.#metadata = undefined;
    }

    /**
     * Force result to true
     */
    true() {
        this.#result = true;
        this.#reason = 'Forced to true';
        return this;
    }

    /**
     * Force result to false
     */
    false() {
        this.#result = false;
        this.#reason = 'Forced to false';
        return this;
    }

    /**
     * Define metadata for the response
     */
    withMetadata(metadata) {
        this.#metadata = metadata;
        return this;
    }

    /**
     * Return selected switcher name
     */
    getKey() {
        return this.#key;
    }

    /**
     * Return key response
     */
    getResponse() {
        return {
            key: this.#key,
            result: this.#result,
            reason: this.#reason,
            metadata: this.#metadata
        };
    }
}