import { watchFile, unwatchFile } from 'node:fs';
import { GlobalOptions } from './globals/globalOptions.js';
import { GlobalSnapshot } from './globals/globalSnapshot.js';
import { loadDomain } from './snapshot.js';

/**
 * SnapshotWatcher is a utility class that watches for changes in the snapshot file
 * and triggers a callback when the file is modified.
 */
export class SnapshotWatcher {
  #snapshotFile;

  watchSnapshot(environment, callback = {}) {
    const { success = () => { }, reject = () => { } } = callback;
    
    this.#snapshotFile = `${GlobalOptions.snapshotLocation}/${environment}.json`;
    let lastUpdate;
    watchFile(this.#snapshotFile, (listener) => {
      try {
        if (!lastUpdate || listener.ctime > lastUpdate) {
          GlobalSnapshot.init(loadDomain(GlobalOptions.snapshotLocation, environment));
          success();
        }
      } catch (e) {
        reject(e);
      } finally {
        lastUpdate = listener.ctime;
      }
    });
  }

  stopWatching() {
    if (this.#snapshotFile) {
      unwatchFile(this.#snapshotFile);
      this.#snapshotFile = undefined;
    }
  }
}
