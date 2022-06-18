const { StrategiesType } = require('../snapshot');

function checkValue(input) {
    return [StrategiesType.VALUE, input];
}

function checkNumeric(input) {
    return [StrategiesType.NUMERIC, input];
}

function checkNetwork(input) {
    return [StrategiesType.NETWORK, input];
}

function checkDate(input) {
    return [StrategiesType.DATE, input];
}

function checkTime(input) {
    return [StrategiesType.TIME, input];
}

function checkRegex(input) {
    return [StrategiesType.REGEX, input];
}

function checkPayload(input) {
    return [StrategiesType.PAYLOAD, input];
}

module.exports = {
    checkValue,
    checkNumeric,
    checkNetwork,
    checkDate,
    checkTime,
    checkRegex,
    checkPayload
};