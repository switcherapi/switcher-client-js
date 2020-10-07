const axios = require('axios');
const DateMoment = require('./datemoment');

exports.getEntry = (input) => {
    if (!input) {
        return undefined;
    }

    if (input.length % 2 !== 0) {
        throw new Error(`Invalid input format for '${input}'`);
    }

    let entry = [];

    for (var i = 0; i < input.length; i += 2) {
        entry.push({
            strategy: input[i],
            input: input[i + 1]
        });
    }

    return entry;
}

exports.checkCriteria = async (url, token, key, input, showReason = false) => {
    try {
        const entry = this.getEntry(input);
        return await axios.post(`${url}/criteria?showReason=${showReason}&key=${key}`, { entry }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
    } catch (e) {
        throw new CriteriaError(e.errno ? e.errno : e.message);
    }
}

exports.auth = async (url, apiKey, domain, component, environment, options) => {
    try {
        return await axios.post(`${url}/criteria/auth`, {
            domain,
            component,
            environment
        }, {
            headers: {
                'switcher-api-key': apiKey,
                'Content-Type': 'application/json'
            }
        });
    } catch (e) {
        if (e.errno === 'ECONNREFUSED' && options && 'silentMode' in options) {
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

        throw new AuthError(e.errno ? e.errno : e.message);
    }
}

exports.checkSnapshotVersion = async (url, token, version) => {
    try {
        const response = await axios.get(`${url}/criteria/snapshot_check/${version}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })
        return response.data;
    } catch (e) {
        throw new SnapshotServiceError(e.errno ? e.errno : e.message);
    }
}

exports.resolveSnapshot = async (url, token, domain, environment) => {
    var data = { 
        query: `
            query domain {
                domain(name: "${domain}", environment: "${environment}") {
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
        const response = await axios.post(`${url}/graphql`, data, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        return JSON.stringify(response.data, null, 4);
    } catch (e) {
        throw new SnapshotServiceError(e.errno ? e.errno : e.message);
    }
}

class AuthError extends Error {
    constructor(message) {
        super(`Something went wrong: ${message}`);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

class CriteriaError extends Error {
    constructor(message) {
        super(`Something went wrong: ${message}`);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

class SnapshotServiceError extends Error {
    constructor(message) {
        super(`Something went wrong: ${message}`);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}