export class GlobalOptions {
  static #options;

  static init(options) {
    this.#options = {
      ...options,
    };
  }

  static updateOptions(options) {
    this.#options = {
      ...this.#options,
      ...options,
    };
  }

  static get local() {
    return this.#options.local;
  }

  static get logger() {
    return this.#options.logger;
  }

  static get snapshotLocation() {
    return this.#options.snapshotLocation;
  }

  static get snapshotAutoUpdateInterval() {
    return this.#options.snapshotAutoUpdateInterval;
  }

  static get silentMode() {
    return this.#options.silentMode;
  }
}
