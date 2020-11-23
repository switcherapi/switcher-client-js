'use strict';

class ExecutionLogger {
    static logger = new Array();

    static add(key, reasponse) {
        const replace = this.getByKey(key);
        if (replace.length)
            ExecutionLogger.logger.splice(replace, 1);
        ExecutionLogger.logger.push({ key, reasponse });
    }

    static getByKey(key) {
        return ExecutionLogger.logger.filter(value => value.key === key);
    }
}

module.exports = ExecutionLogger;