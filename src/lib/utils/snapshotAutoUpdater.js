export default class SnapshotAutoUpdater {
    static _worker = undefined;

    static schedule(interval, checkSnapshot, success, reject) {
        if (this._worker) {
            this.terminate();
        }
            
        this._worker = setInterval(async () => {
            try {
                const updated = await checkSnapshot();
                success(updated);
            } catch (err) {
                this.terminate();
                reject(err);
            }
        }, interval * 1000);
    }

    static terminate() {
        clearInterval(this._worker);
    }
}