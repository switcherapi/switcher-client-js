'use strict';

var logger = new Array();

class ExecutionLogger {

    /**
     * Add new execution result
     * 
     * @param key
     * @param input
     * @param response
     */
    static add(key, input, response) {
        let keyIndex = undefined;
        logger.forEach((value, index) => 
            value.key === key && 
            JSON.stringify(value.input) === JSON.stringify(input) ? 
            keyIndex = index : undefined);

        if (keyIndex != undefined)
            logger.splice(keyIndex, 1);

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
    
}

module.exports = ExecutionLogger;