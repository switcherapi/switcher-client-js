const { resolveSnapshot, checkSnapshotVersion } = require('./services');
const fs = require('fs');

async function validateSnapshot(url, token, domain, environment, snapshotLocation, snapshotVersion) {
    const { status } = await checkSnapshotVersion(url, token, snapshotVersion)

    if (!status) {
        const snapshot = await resolveSnapshot(url, token, domain, environment)
        
        fs.writeFileSync(`${snapshotLocation}${environment}.json`, snapshot)
        return true
    }
    return false
}

module.exports = validateSnapshot;