import { SwitcherResult } from '../result.js';

const logger = new Array();

export default class ExecutionLogger {

    static callbackError;

    /**
     * Add new execution result
     * 
     * @param key
     * @param input
     * @param response
     */
    static add(response, key, input) {
        for (let index = 0; index < logger.length; index++) {
            const log = logger[index];
            if (log.key === key && JSON.stringify(log.input) === JSON.stringify(input)) {
                logger.splice(index, 1);
                break;
            }
        }
        
        logger.push({
        key,
        input,
        response: SwitcherResult.create(response.result, response.reason, {
            ...response.metadata,
            cached: true,
        }),
        });
    }

     /**
     * Retrieve a specific result given a key and an input
     * 
     * @param key Switcher key
     * @param input Switcher input
     */
    static getExecution(key, input) {
        for (const log of logger) {
            if (this.#hasExecution(log, key, input)) {
                return log;
            }
        }

        return new ExecutionLogger();
    }

     /**
     * Retrieve results given a switcher key
     * 
     * @param key 
     */
    static getByKey(key) {
        return logger.filter(value => value.key === key);
    }

    /**
     * Clear all results
     */
    static clearLogger() {
        logger.splice(0, logger.length);
    }

    /**
     * Clear results by switcher key
     */
    static clearByKey(key) {
        for (let index = logger.length - 1; index >= 0; index--) {
            if (logger[index].key === key) {
                logger.splice(index, 1);
            }
        }
    }

    /**
     * Subscribe to error notifications
     */
    static subscribeNotifyError(callbackError) {
        ExecutionLogger.callbackError = callbackError;
    }

    /**
     * Push error notification
     */
    static notifyError(error) {
        if (ExecutionLogger.callbackError) {
            ExecutionLogger.callbackError(error);
        }
    }

    static #hasExecution(log, key, input) {
        return log.key === key && this.#checkStrategyInputs(log.input, input);
    }

    static #checkStrategyInputs(loggerInputs, inputs) {
        for (const [strategy, input] of loggerInputs || []) {
        const found = inputs?.find((i) => i[0] === strategy && i[1] === input);
        if (!found) {
            return false;
        }
        }

        return true;
    }
    
}