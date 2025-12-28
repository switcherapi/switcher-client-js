import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';

import IPCIDR from './utils/ipcidr.js';
import DateMoment from './utils/datemoment.js';
import TimedMatch from './utils/timed-match/index.js';
import { resolveSnapshot, checkSnapshotVersion } from './remote.js';
import { CheckSwitcherError } from './exceptions/index.js';
import { parseJSON, payloadReader } from './utils/payloadReader.js';

const loadDomain = (snapshotLocation, environment) => {
    try {
        let dataBuffer;
        const snapshotFile = `${snapshotLocation}/${environment}.json`;
        if (existsSync(snapshotFile)) {
            dataBuffer = readFileSync(snapshotFile);
        } else {
            dataBuffer = JSON.stringify({ domain: { version: 0 } }, null, 4);

            if (snapshotLocation.length) {
                mkdirSync(snapshotLocation, { recursive: true });
                writeFileSync(snapshotFile, dataBuffer);
            }
        }

        const dataJSON = dataBuffer.toString();
        return JSON.parse(dataJSON);
    } catch {
        throw new Error(`Something went wrong: It was not possible to load the file at ${snapshotLocation}`);
    }
};

const validateSnapshot = async (context, snapshotVersion) => {
    const { status } = await checkSnapshotVersion(snapshotVersion);
    
    if (!status) {
        const snapshot = await resolveSnapshot(context.domain, context.environment, context.component);
        return snapshot;
    }
    return undefined;
};

const checkSwitchersLocal = (snapshot, switcherKeys) => {
    const { group } = snapshot.domain;
    let notFound = [], found = false;
    
    for (const switcher of switcherKeys) {
        for (const g of group || []) {
            found = false;
            const { config } = g;

            if (config.some(c => c.key === switcher)) {
                found = true;
                break;
            }
        }

        if (!found) {
            notFound.push(switcher);
        }
    }

    if (notFound.length) {
        throw new CheckSwitcherError(notFound);
    }
};

const StrategiesType = Object.freeze({
    NETWORK: 'NETWORK_VALIDATION',
    VALUE: 'VALUE_VALIDATION',
    NUMERIC: 'NUMERIC_VALIDATION',
    TIME: 'TIME_VALIDATION',
    DATE: 'DATE_VALIDATION',
    REGEX: 'REGEX_VALIDATION',
    PAYLOAD: 'PAYLOAD_VALIDATION'
});

const OperationsType = Object.freeze({
    EQUAL: 'EQUAL',
    NOT_EQUAL: 'NOT_EQUAL',
    EXIST: 'EXIST',
    NOT_EXIST: 'NOT_EXIST',
    GREATER: 'GREATER',
    LOWER: 'LOWER',
    BETWEEN: 'BETWEEN',
    HAS_ONE: 'HAS_ONE',
    HAS_ALL: 'HAS_ALL'
});

const processOperation = (strategyConfig, input) => {
    const { strategy, operation, values } = strategyConfig;

    switch(strategy) {
        case StrategiesType.NETWORK:
            return processNETWORK(operation, input, values);
        case StrategiesType.VALUE:
            return processVALUE(operation, input, values);
        case StrategiesType.NUMERIC:
            return processNUMERIC(operation, input, values);
        case StrategiesType.TIME:
            return processTIME(operation, input, values);
        case StrategiesType.DATE:
            return processDATE(operation, input, values);
        case StrategiesType.REGEX:
            return processREGEX(operation, input, values);
        case StrategiesType.PAYLOAD:
            return processPAYLOAD(operation, input, values);
    }
};

function processNETWORK(operation, input, values) {
    const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}(\/(\d|[1-2]\d|3[0-2]))$/;
    switch(operation) {
        case OperationsType.EXIST:
            return processNETWORK_Exist(input, values, cidrRegex);
        case OperationsType.NOT_EXIST:
            return processNETWORK_NotExist(input, values, cidrRegex);
    }
    return false;
}

function processNETWORK_Exist(input, values, cidrRegex) {
    for (const value of values) {
        if (value.match(cidrRegex)) {
            const cidr = new IPCIDR(value);
            if (cidr.isIp4InCidr(input)) {
                return true;
            }
        } else {
            return values.includes(input);
        }
    }
    return false;
}

function processNETWORK_NotExist(input, values, cidrRegex) {
    const result = values.filter((element) => {
        if (element.match(cidrRegex)) {
            const cidr = new IPCIDR(element);
            if (cidr.isIp4InCidr(input)) {
                return true;
            }
        } else {
            return values.includes(input);
        }
    });
    return result.length === 0;
}

function processVALUE(operation, input, values) {
    switch(operation) {
        case OperationsType.EXIST:
            return values.includes(input);
        case OperationsType.NOT_EXIST:
            return !values.includes(input);
        case OperationsType.EQUAL:
            return input === values[0];
        case OperationsType.NOT_EQUAL: {
            const result = values.filter(element => element === input);
            return result.length === 0;
        }
    }
}

function processNUMERIC(operation, input, values) {
    const inputStr = String(input);
    switch(operation) {
        case OperationsType.EXIST:
            return values.includes(inputStr);
        case OperationsType.NOT_EXIST:
            return !values.includes(inputStr);
        case OperationsType.EQUAL:
            return inputStr === values[0];
        case OperationsType.NOT_EQUAL:
            return values.filter(element => element === inputStr).length === 0;
        case OperationsType.LOWER:
            return inputStr < values[0];
        case OperationsType.GREATER:
            return inputStr > values[0];
        case OperationsType.BETWEEN:
            return inputStr >= values[0] && inputStr <= values[1];
    }
}

function processTIME(operation, input, values) {
    const dateMoment = new DateMoment(new Date(), input);

    switch(operation) {
        case OperationsType.LOWER:
            return dateMoment.isSameOrBefore(dateMoment.getDate(), values[0]);
        case OperationsType.GREATER:
            return dateMoment.isSameOrAfter(dateMoment.getDate(), values[0]);
        case OperationsType.BETWEEN:
            return dateMoment.isBetween(dateMoment.getDate(), dateMoment.getDate(), values[0], values[1]);
    }
}

function processDATE(operation, input, values) {
    const dateMoment = new DateMoment(input);

    switch(operation) {
        case OperationsType.LOWER:
            return dateMoment.isSameOrBefore(values[0]);
        case OperationsType.GREATER:
            return dateMoment.isSameOrAfter(values[0]);
        case OperationsType.BETWEEN:
            return dateMoment.isBetween(values[0], values[1]);
    }
}

function processREGEX(operation, input, values) {
    switch(operation) {
        case OperationsType.EXIST:
            return TimedMatch.tryMatch(values, input);
        case OperationsType.NOT_EXIST:
            return !processREGEX(OperationsType.EXIST, input, values);
        case OperationsType.EQUAL:
            return TimedMatch.tryMatch([String.raw`\b${values[0]}\b`], input);
        case OperationsType.NOT_EQUAL:
            return !TimedMatch.tryMatch([String.raw`\b${values[0]}\b`], input);
    }
}

function processPAYLOAD(operation, input, values) {
    const inputJson = parseJSON(input);
    if (!inputJson) {
        return false;
    }

    const keys = payloadReader(inputJson);
    switch(operation) {
        case OperationsType.HAS_ONE:
            return keys.some(key => values.includes(key));
        case OperationsType.HAS_ALL:
            return values.every(element => keys.includes(element));
    }
}

export {
    loadDomain,
    validateSnapshot,
    processOperation,
    checkSwitchersLocal,
    StrategiesType,
    OperationsType
};