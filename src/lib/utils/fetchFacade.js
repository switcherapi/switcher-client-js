import https from 'node:https';
import http from 'node:http';

export default class FetchFacade {
    static async fetch(url, init) {
        return new Promise((resolve, reject) => {
            const lib = url.startsWith('https') ? https : http;
            const request = lib.request(url, init, (response) => {
                let body = '';
                response.on('data', (chunk) => body += chunk);
                response.on('end', () => FetchFacade.#handleResponse(response, body, resolve));
            });
            request.on('error', reject);
            if (init.body) {
                request.write(init.body);
            }
            request.end();
        });
    }

    static #handleResponse(response, body, resolve) {
        resolve({ status: response.statusCode, json: () => JSON.parse(body) });
    }
}