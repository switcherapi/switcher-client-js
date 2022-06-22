function payloadReader(payload) {
    let payloadRead = payload + '' === payload || payload || 0;
    if (Array.isArray(payloadRead))
        return payloadRead.flatMap(p => payloadReader(p));

    return Object.keys(payloadRead)
        .flatMap(field => [field, ...payloadReader(payload[field])
        .map(nestedField => `${field}.${nestedField}`)])
        .filter(field => isNaN(Number(field)))
        .reduce((acc, curr) => {
            if (!acc.includes(curr))
                acc.push(curr);
            return acc;
        }, []);
}

function parseJSON(str) {
    try {
        return JSON.parse(str);
    } catch (e) {
        return undefined;
    }
}

module.exports = {
    payloadReader,
    parseJSON
};