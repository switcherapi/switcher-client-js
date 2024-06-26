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
        
        logger.push({ key, input, response });
    }

     /**
     * Retrieve a specific result given a key and an input
     * 
     * @param key Switcher key
     * @param input Switcher input
     */
    static getExecution(key, input) {
        const result = logger.filter(
            value => value.key === key && 
            JSON.stringify(value.input) === JSON.stringify(input));

        return result[0];
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
    
}