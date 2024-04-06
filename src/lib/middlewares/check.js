import { StrategiesType } from '../snapshot.js';

export function checkValue(input) {
    return [StrategiesType.VALUE, input];
}

export function checkNumeric(input) {
    return [StrategiesType.NUMERIC, input];
}

export function checkNetwork(input) {
    return [StrategiesType.NETWORK, input];
}

export function checkDate(input) {
    return [StrategiesType.DATE, input];
}

export function checkTime(input) {
    return [StrategiesType.TIME, input];
}

export function checkRegex(input) {
    return [StrategiesType.REGEX, input];
}

export function checkPayload(input) {
    return [StrategiesType.PAYLOAD, input];
}