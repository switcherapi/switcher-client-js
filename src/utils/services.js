const request = require('request-promise');

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
            url,
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
        throw new Error(`Something went wrong: ${error}`)
    }
}

exports.auth = async (url, apiKey, domain, component, environment) => {
    try {
        const options = {
            url: url + '/auth',
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

        return await request.post(options);
    } catch (e) {
        let error
        if (e.error) {
            error = JSON.stringify(e.error)
        } else {
            error = e.message
        }
        throw new Error(`Something went wrong: ${error}`)
    }
}