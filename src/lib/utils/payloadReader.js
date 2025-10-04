export function payloadReader(payload) {
    let payloadRead = payload + '' === payload || payload;
    if (Array.isArray(payloadRead)) {
        return payloadRead.flatMap(p => payloadReader(p));
    }

    return Object.keys(payloadRead)
        .flatMap(field => [field, ...payloadReader(payload[field])
        .map(nestedField => `${field}.${nestedField}`)])
        .filter(field => Number.isNaN(Number(field)))
        .reduce((acc, curr) => {
            if (!acc.includes(curr)) {
                acc.push(curr);
            }
            return acc;
        }, []);
}

export function parseJSON(str) {
    try {
        return JSON.parse(str);
    } catch {
        return undefined;
    }
}