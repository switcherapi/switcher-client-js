import { auth, checkAPIHealth } from './remote.js';
import DateMoment from './utils/datemoment.js';
import * as util from './utils/index.js';

/**
 * Auth handles the authentication and API connectivity.
 */
export class Auth {
  static #context;
  static #retryOptions;
  static #token;
  static #exp;

  static init(context) {
    this.#context = context;
    this.#token = undefined;
    this.#exp = undefined;
  }

  static setRetryOptions(silentMode) {
    this.#retryOptions = {
      retryTime: parseInt(silentMode.slice(0, -1)),
      retryDurationIn: silentMode.slice(-1),
    };
  }

  static async auth() {
    const response = await auth(this.#context);
    this.#token = response.token;
    this.#exp = response.exp;
  }

  static checkHealth() {
    if (this.#token !== 'SILENT') {
      return;
    }

    if (this.isTokenExpired()) {
      this.updateSilentToken();
      checkAPIHealth(util.get(this.getURL(), ''))
        .then((isAlive) => {
          if (isAlive) {
            this.auth();
          }
        });
    }
  }

  static updateSilentToken() {
    const expirationTime = new DateMoment(new Date())
      .add(this.#retryOptions.retryTime, this.#retryOptions.retryDurationIn).getDate();

    this.#token = 'SILENT';
    this.#exp = Math.round(expirationTime.getTime() / 1000);
  }

  static isTokenExpired() {
    return !this.#exp || Date.now() > (this.#exp * 1000);
  }

  static isValid() {
    const errors = [];

    if (!this.#context.url) {
      errors.push('URL is required');
    }

    if (!this.#context.component) {
      errors.push('Component is required');
    }

    if (!this.#context.apiKey) {
      errors.push('API Key is required');
    }

    if (errors.length) {
      throw new Error(`Something went wrong: ${errors.join(', ')}`);
    }

    return true;
  }

  static getToken() {
    return this.#token;
  }

  static getURL() {
    return this.#context.url;
  }
}
