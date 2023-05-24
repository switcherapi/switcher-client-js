class SnapshotAutoUpdater {
    static _worker = undefined;

    static schedule(interval, checkSnapshot) {
        if (this._worker)
            this.terminate();
            
        this._worker = setInterval(() => checkSnapshot(), interval);
    }

    static terminate() {
        clearInterval(this._worker);
    }
}

module.exports = SnapshotAutoUpdater;