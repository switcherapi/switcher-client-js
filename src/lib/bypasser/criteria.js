import { StrategiesType } from '../snapshot.js';

/**
 * Criteria defines a set of conditions (when) that are used to evaluate the bypasser strategies
 */
export default class Criteria {
    #when;

    constructor(strategy, input) {
        this.#when = new Map();
        this.#when.set(strategy, Array.isArray(input) ? input : [input]);
    }

    /**
     * Add a new strategy/input to the criteria
     */
    and(strategy, input) {
        if (Object.values(StrategiesType).filter((s) => s === strategy).length) {
            this.#when.set(strategy, Array.isArray(input) ? input : [input]);
        }

        return this;
    }

    getWhen() {
        return this.#when;
    }
}
