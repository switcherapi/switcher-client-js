import { GlobalAuth } from './globals/globalAuth.js';
import { auth, checkAPIHealth } from './remote.js';
import DateMoment from './utils/datemoment.js';
import * as util from './utils/index.js';

/**
 * Auth handles the authentication and API connectivity.
 */
export class Auth {
  static #context;
  static #retryOptions;

  static init(context) {
    this.#context = context;
    GlobalAuth.init(context.url);
  }

  static setRetryOptions(silentMode) {
    this.#retryOptions = {
      retryTime: Number.parseInt(silentMode.slice(0, -1)),
      retryDurationIn: silentMode.slice(-1),
    };
  }

  static async auth() {
    const response = await auth(this.#context);
    GlobalAuth.token = response.token;
    GlobalAuth.exp = response.exp;
  }

  static checkHealth() {
    if (GlobalAuth.token !== 'SILENT') {
      return;
    }

    if (this.isTokenExpired()) {
      this.updateSilentToken();
      checkAPIHealth(util.get(GlobalAuth.url, ''))
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

    GlobalAuth.token = 'SILENT';
    GlobalAuth.exp = Math.round(expirationTime.getTime() / 1000);
  }

  static isTokenExpired() {
    return !GlobalAuth.exp || Date.now() > (GlobalAuth.exp * 1000);
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
}
