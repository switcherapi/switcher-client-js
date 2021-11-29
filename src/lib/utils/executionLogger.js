'use strict';

var logger = new Array();

class ExecutionLogger {

    /**
     * Add new execution result
     * 
     * @param key
     * @param response
     */
    static add(key, response) {
        let keyIndex = undefined;
        logger.forEach((value, index) => 
            value.key === key ? keyIndex = index : undefined);

        if (keyIndex != undefined)
            logger.splice(keyIndex, 1);
        logger.push({ key, response });
    }

     /**
     * Retrieve results given a switcher key
     * 
     * @param key 
     */
    static getByKey(key, last = false) {
        const result = logger.filter(value => value.key === key);
        if (last)
            return result[result.length - 1];
        return result;
    }
}

module.exports = ExecutionLogger;