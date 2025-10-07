import fs from 'node:fs';
import { Agent } from 'node:https';

import { CheckSwitcherError, ClientError, RemoteError } from './exceptions/index.js';
import FetchFacade from './utils/fetchFacade.js';
import * as util from './utils/index.js';
import { GlobalAuth } from './globals/globalAuth.js';

let httpClient;

const getHeader = (token) => {
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
};

export function setCerts(certPath) {
    if (!fs.existsSync(certPath)) {
        throw new RemoteError(`Invalid certificate path '${certPath}'`);
    }
    
    httpClient = new Agent({
        ca: fs.readFileSync(certPath)
    });
}

export function removeAgent() {
    httpClient = undefined;
}

export function getEntry(input) {
    if (!input) {
        return undefined;
    }

    const entry = [];
    for (const inputValues of input) {
        entry.push({
            strategy: inputValues[0],
            input: inputValues[1]
        });
    }

    return entry;
}

export async function auth(context) {
    try {
        const response = await FetchFacade.fetch(`${context.url}/criteria/auth`, {
            method: 'post',
            body: JSON.stringify({
                domain: context.domain,
                component: context.component,
                environment: context.environment
            }),
            headers: {
                'switcher-api-key': util.get(context.apiKey, ''),
                'Content-Type': 'application/json'
            },
            agent: httpClient
        });

        if (response.status == 200) {
            return response.json();
        }
      
        throw new RemoteError(`[auth] failed with status ${response.status}`);
    } catch (e) {
        throw errorHandler(e);
    }
}

export async function checkAPIHealth(url) {
    try {
        const response = await FetchFacade.fetch(`${url}/check`, { method: 'get', agent: httpClient });
        return response.status == 200;
    } catch {
        return false;
    }
}

export async function checkCriteria(key, input, showDetail = false) {
    try {
        const entry = getEntry(input);
        const response = await FetchFacade.fetch(`${GlobalAuth.url}/criteria?showReason=${showDetail}&key=${key}`, {
            method: 'post',
            body: JSON.stringify({ entry }),
            headers: getHeader(GlobalAuth.token),
            agent: httpClient
        });

        if (response.status == 200) {
            return response.json();
        }
        
        throw new RemoteError(`[checkCriteria] failed with status ${response.status}`);
    } catch (e) {
        throw errorHandler(e);
    }
}

export async function checkSwitchers(switcherKeys) {
    try {
        const response = await FetchFacade.fetch(`${GlobalAuth.url}/criteria/switchers_check`, {
            method: 'post',
            body: JSON.stringify({ switchers: switcherKeys }),
            headers: getHeader(GlobalAuth.token),
            agent: httpClient
        });

        if (response.status != 200) {
            throw new RemoteError(`[checkSwitchers] failed with status ${response.status}`);
        }
        
        const json = response.json();
        if (json.not_found.length) {
            throw new CheckSwitcherError(json.not_found);
        }
    } catch (e) {
        throw errorHandler(e);
    }
}

export async function checkSnapshotVersion(version) {
    try {
        const response = await FetchFacade.fetch(`${GlobalAuth.url}/criteria/snapshot_check/${version}`, {
            method: 'get',
            headers: getHeader(GlobalAuth.token),
            agent: httpClient
        });

        if (response.status == 200) {
            return response.json();
        }
    
        throw new RemoteError(`[checkSnapshotVersion] failed with status ${response.status}`);
    } catch (e) {
        throw errorHandler(e);
    }
}

export async function resolveSnapshot(domain, environment, component) {
    const data = { 
        query: `
            query domain {
                domain(name: "${domain}", environment: "${environment}", _component: "${component}") {
                    name version activated
                    group { name activated
                        config { key activated
                            strategies { strategy activated operation values }
                            relay { type activated }
                            components
                        }
                    }
                }
            }`
        };

    try {
        const response = await FetchFacade.fetch(`${GlobalAuth.url}/graphql`, {
            method: 'post',
            body: JSON.stringify(data),
            headers: getHeader(GlobalAuth.token),
            agent: httpClient
        });
        
        if (response.status == 200) {
            return JSON.stringify(response.json().data, null, 4);
        }
    
        throw new RemoteError(`[resolveSnapshot] failed with status ${response.status}`);
    } catch (e) {
        throw errorHandler(e);
    }
}

function errorHandler(e) {
    if (!(e instanceof ClientError)) {
        throw new RemoteError(e.errno ? `Connection has been refused - ${e.errno}` : e.message);
    }

    throw e;
}