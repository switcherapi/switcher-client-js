'use strict';

var logger = new Array();

class ExecutionLogger {

    /**
     * Add new execution result
     * 
     * @param key
     * @param response
     */
    static add(key, reasponse) {
        let keyIndex = undefined;
        logger.forEach((value, index) => 
            value.key === key ? keyIndex = index : undefined);

        if (keyIndex != undefined)
            logger.splice(keyIndex, 1);
        logger.push({ key, reasponse });
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