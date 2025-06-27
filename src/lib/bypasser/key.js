import { SwitcherResult } from '../result.js';
import Criteria from './criteria.js';

/**
 * Key record used to store key response when bypassing criteria execution
 */
export default class Key {
    #key;
    #result;
    #reason;
    #metadata;
    #criteria;

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
     * Conditionally set result based on strategy
     */
    when(strategy, input) {
        this.#criteria = new Criteria(strategy, input);
        return this.#criteria;
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
    getResponse(input) {
        let result = this.#result;
        if (this.#criteria && input) {
            result = this.#getResultBasedOnCriteria(this.#criteria, input);
        }

        return SwitcherResult.create(result, this.#reason, this.#metadata);
    }

    #getResultBasedOnCriteria(criteria, input) {
        for (const [strategyWhen, inputWhen] of criteria.getWhen()) {
            const entry = input.filter((e) => e[0] === strategyWhen);
            if (entry.length && !inputWhen.includes(entry[0][1])) {
                this.#reason = `Forced to ${!this.#result} when: [${inputWhen}] - input: ${entry[0][1]}`;
                return !this.#result;
            }
        }

        return this.#result;
    }
}