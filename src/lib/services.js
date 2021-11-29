const fetch = require('node-fetch');
const DateMoment = require('./utils/datemoment');
const {
    ApiConnectionError,
    AuthError,
    CheckSwitcherError,
    CriteriaError,
    SnapshotServiceError
} = require('./exceptions');

const getConnectivityError = (code) => `Connection has been refused - ${code}`;

const getHeader = (token) => {
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
};

exports.getEntry = (input) => {
    if (!input) {
        return undefined;
    }
    
    if (input.flat().length % 2 !== 0) {
        throw new Error(`Invalid input format for '${input}'`);
    }

    let entry = [];
    for (const inputValues of input) {
        entry.push({
            strategy: inputValues[0],
            input: inputValues[1]
        });
    }

    return entry;
};

exports.checkAPIHealth = async (url, options) => {
    try {
        const response = await fetch(`${url}/check`, { method: 'get' });
        if (response.status != 200)
            throw new ApiConnectionError('API is offline');
    } catch (e) {
        if (options && 'silentMode' in options) {
            if (options.silentMode) {
                const expirationTime = new DateMoment(new Date())
                    .add(options.retryTime, options.retryDurationIn).getDate();

                return {
                    data: {
                        token: 'SILENT',
                        exp: expirationTime.getTime() / 1000
                    }
                };
            }
        }
    }
};

exports.checkCriteria = async ({ url, token }, key, input, showReason = false) => {
    try {
        const entry = this.getEntry(input);
        const response = await fetch(`${url}/criteria?showReason=${showReason}&key=${key}`, {
            method: 'post',
            body: JSON.stringify({ entry }),
            headers: getHeader(token)
        });

        return response.json();
    } catch (e) {
        throw new CriteriaError(e.errno ? getConnectivityError(e.errno) : e.message);
    }
};

exports.auth = async ({ url, apiKey, domain, component, environment }) => {
    try {
        const response = await fetch(`${url}/criteria/auth`, {
            method: 'post',
            body: JSON.stringify({
                domain,
                component,
                environment
            }),
            headers: {
                'switcher-api-key': apiKey,
                'Content-Type': 'application/json'
            }
        });

        return response.json();
    } catch (e) {
        throw new AuthError(e.errno ? getConnectivityError(e.errno) : e.message);
    }
};

exports.checkSwitchers = async (url, token, switcherKeys) => {
    try {
        const response = await fetch(`${url}/criteria/switchers_check`, {
            method: 'post',
            body: JSON.stringify({ switchers: switcherKeys }),
            headers: getHeader(token)
        });

        const json = await response.json();
        if (response.status != 200)
            throw new CriteriaError(json.errors[0].msg);

        if (json.not_found.length)
            throw new CheckSwitcherError(json.not_found);
    } catch (e) {
        throw new CriteriaError(e.errno ? getConnectivityError(e.errno) : e.message);
    }
};

exports.checkSnapshotVersion = async (url, token, version) => {
    try {
        const response = await fetch(`${url}/criteria/snapshot_check/${version}`, {
            method: 'get',
            headers: getHeader(token)
        });

        return response.json();
    } catch (e) {
        throw new SnapshotServiceError(e.errno ? getConnectivityError(e.errno) : e.message);
    }
};

exports.resolveSnapshot = async (url, token, domain, environment, component) => {
    var data = { 
        query: `
            query domain {
                domain(name: "${domain}", environment: "${environment}", _component: "${component}") {
                    name version activated
                    group { name activated
                        config { key activated
                            strategies { strategy activated operation values }
                            components
                        }
                    }
                }
            }`
        };

    try {
        const response = await fetch(`${url}/graphql`, {
            method: 'post',
            body: JSON.stringify(data),
            headers: getHeader(token)
        });
        
        return JSON.stringify(await response.json(), null, 4);
    } catch (e) {
        throw new SnapshotServiceError(e.errno ? getConnectivityError(e.errno) : e.message);
    }
};