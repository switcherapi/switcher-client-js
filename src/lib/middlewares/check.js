import { StrategiesType } from '../snapshot.js';

/**
 * Adds VALUE_VALIDATION input for strategy validation
 */
export function checkValue(input) {
    return [StrategiesType.VALUE, input];
}

/**
 * Adds NUMERIC_VALIDATION input for strategy validation
 */
export function checkNumeric(input) {
    return [StrategiesType.NUMERIC, input];
}

/**
 * Adds NETWORK_VALIDATION input for strategy validation
 */
export function checkNetwork(input) {
    return [StrategiesType.NETWORK, input];
}

/**
 * Adds DATE_VALIDATION input for strategy validation
 */
export function checkDate(input) {
    return [StrategiesType.DATE, input];
}

/**
 * Adds TIME_VALIDATION input for strategy validation
 */
export function checkTime(input) {
    return [StrategiesType.TIME, input];
}

/**
 * Adds REGEX_VALIDATION input for strategy validation
 */
export function checkRegex(input) {
    return [StrategiesType.REGEX, input];
}

/**
 * Adds PAYLOAD_VALIDATION input for strategy validation
 */
export function checkPayload(input) {
    return [StrategiesType.PAYLOAD, input];
}