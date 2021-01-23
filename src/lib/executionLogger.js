'use strict';

var logger = new Array();

class ExecutionLogger {

    static add(key, reasponse) {
        const replace = this.getByKey(key);
        if (replace.length)
            logger.splice(replace, 1);
        logger.push({ key, reasponse });
    }

    static getByKey(key) {
        return logger.filter(value => value.key === key);
    }
}

module.exports = ExecutionLogger;