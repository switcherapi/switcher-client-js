import { GlobalAuth } from './globals/globalAuth.js';
import { GlobalOptions } from './globals/globalOptions.js';
import { auth, checkAPIHealth } from './remote.js';
import DateMoment from './utils/datemoment.js';
import * as util from './utils/index.js';

/**
 * Auth handles the authentication and API connectivity.
 */
export class Auth {
  static #context;
  static #retryOptions;
  static #refreshTimer;

  static init(context) {
    this.#context = context;
    GlobalAuth.init(context.url);
  }

  static #scheduleNextAuth() {
    const msUntilExpiry = (GlobalAuth.exp * 1000) - Date.now();
    const refreshAt = Math.max(msUntilExpiry - 5000, 0); // 5s before expiry

    this.#refreshTimer = setTimeout(() => {
      console.debug(`Refreshing auth token, ${Math.round(refreshAt / 1000)}s until expiry...`);
      this.#authUpdate().then(() => {
        this.#scheduleNextAuth();
      }).catch(() => {
        this.terminateAutoRefresh();
      });
    }, refreshAt);
  }

  static async #authUpdate() {
    const response = await auth(this.#context);
    GlobalAuth.token = response.token;
    GlobalAuth.exp = response.exp;
  }

  static setRetryOptions(silentMode) {
    this.#retryOptions = {
      retryTime: Number.parseInt(silentMode.slice(0, -1)),
      retryDurationIn: silentMode.slice(-1),
    };
  }

  static terminateAutoRefresh() {
    if (this.#refreshTimer) {
      clearTimeout(this.#refreshTimer);
      this.#refreshTimer = undefined;
    }
  }

  static async auth() {
    await this.#authUpdate();
    
    if (GlobalOptions.autoRefreshToken && !this.#refreshTimer) {
      this.#scheduleNextAuth();
    }
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
