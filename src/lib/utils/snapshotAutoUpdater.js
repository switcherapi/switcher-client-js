export default class SnapshotAutoUpdater {
    static _worker = undefined;

    static schedule(interval, checkSnapshot, callback) {
        if (this._worker) {
            this.terminate();
        }
            
        this._worker = setInterval(async () => {
            try {
                const updated = await checkSnapshot();
                if (callback) {
                    callback(updated);
                }
            } catch (err) {
                if (callback) {
                    this.terminate();
                    callback(null, err);
                }
            }
        }, interval * 1000);
    }

    static terminate() {
        clearInterval(this._worker);
    }
}