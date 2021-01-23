'use strict';

var logger = new Array();

class ExecutionLogger {

    static add(key, reasponse) {
        let keyIndex = undefined;
        logger.map((value, index) => value.key === key ? keyIndex = index : undefined);

        if (keyIndex != undefined)
            logger.splice(keyIndex, 1);
        logger.push({ key, reasponse });
    }

    static getByKey(key) {
        return logger.filter(value => value.key === key);
    }
}

module.exports = ExecutionLogger;