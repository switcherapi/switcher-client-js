export class GlobalAuth {
  static #url;
  static #token;
  static #exp;

  static init(url) {
    this.#url = url;
    this.#token = '';
    this.#exp = 0;
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
