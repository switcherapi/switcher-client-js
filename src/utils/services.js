const request = require('request-promise');
const moment = require('moment');

exports.getEntry = (input) => {
    if (!input) {
        return undefined
    }

    if (input.length % 2 !== 0) {
        throw new Error(`Invalid input format for '${input}'`)
    }

    let entry = [];

    for (var i = 0; i < input.length; i += 2) {
        entry.push({
            strategy: input[i],
            input: input[i + 1]
        })
    }

    return entry
}

exports.checkCriteria = async (url, token, key, input) => {
    try {
        const entry = this.getEntry(input)
        const options = {
            url: `${url}/criteria`,
            qs: {
                key
            },
            headers: {
                'Authorization': `Bearer ${token}`
            },
            json: true
        }

        if (entry) {
            options.body = {
                entry
            }
        }

        const response = await request.post(options);
        return response.result;
    } catch (e) {
        let error
        if (e.error) {
            error = JSON.stringify(e.error)
        } else {
            error = e.message
        }
        throw new CriteriaError(error)
    }
}

exports.auth = async (url, apiKey, domain, component, environment, options) => {
    try {
        const postOptions = {
            url: `${url}/criteria/auth`,
            headers: {
                'switcher-api-key': apiKey
            },
            json: true,
            body: {
                domain,
                component,
                environment
            }
        }

        return await request.post(postOptions);
    } catch (e) {
        if (e.error.code === 'ECONNREFUSED' && options && 'silentMode' in options) {
            if (options.silentMode) {
                const expirationTime = moment().add(options.retryTime, options.retryDurationIn);
                return {
                    token: 'SILENT',
                    exp: expirationTime.toDate().getTime() / 1000
                }
            }
        }

        let error
        if (e.error) {
            error = JSON.stringify(e.error)
        } else {
            error = e.message
        }

        throw new AuthError(error)
    }
}

class AuthError extends Error {
    constructor(message) {
        super(`Something went wrong: ${message}`)
        this.name = this.constructor.name
        Error.captureStackTrace(this, this.constructor)
    }
}

class CriteriaError extends Error {
    constructor(message) {
        super(`Something went wrong: ${message}`)
        this.name = this.constructor.name
        Error.captureStackTrace(this, this.constructor)
    }
}