export class GlobalSnapshot {
  static #snapshotStore;

  static init(snapshot) {
    this.#snapshotStore = snapshot;
  }

  static clear() {
    this.#snapshotStore = undefined;
  }

  static get snapshot() {
    return this.#snapshotStore;
  }
}
