export class GlobalAuth {
  static #token;
  static #exp;
  static #url;

  static init(url) {
    this.#url = url;
    this.#token = undefined;
    this.#exp = undefined;
  }

  static get token() {
    return this.#token;
  }

  static set token(value) {
    this.#token = value;
  }

  static get exp() {
    return this.#exp;
  }

  static set exp(value) {
    this.#exp = value;
  }

  static get url() {
    return this.#url;
  }
}
