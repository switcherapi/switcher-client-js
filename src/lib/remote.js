import fs from 'node:fs';
import { Agent } from 'node:https';

import { AuthError, CheckSwitcherError, CriteriaError, SnapshotServiceError } from './exceptions/index.js';
import FetchFacade from './utils/fetchFacade.js';
import * as util from './utils/index.js';
import { GlobalAuth } from './globals/globalAuth.js';

let httpClient;

const getConnectivityError = (code) => `Connection has been refused - ${code}`;

const getHeader = (token) => {
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
};

export function setCerts(certPath) {
    if (!fs.existsSync(certPath)) {
        throw new Error(`Invalid certificate path '${certPath}'`);
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

    let entry = [];
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
      
        throw new Error(`[auth] failed with status ${response.status}`);
    } catch (e) {
        throw new AuthError(e.errno ? getConnectivityError(e.errno) : e.message);
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
      
        throw new Error(`[checkCriteria] failed with status ${response.status}`);
    } catch (e) {
        throw new CriteriaError(e.errno ? getConnectivityError(e.errno) : e.message);
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
            throw new Error(`[checkSwitchers] failed with status ${response.status}`);
        }
        
        const json = response.json();
        if (json.not_found.length) {
            throw new CheckSwitcherError(json.not_found);
        }
    } catch (e) {
        throw new CriteriaError(e.errno ? getConnectivityError(e.errno) : e.message);
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
    
        throw new Error(`[checkSnapshotVersion] failed with status ${response.status}`);
    } catch (e) {
        throw new SnapshotServiceError(e.errno ? getConnectivityError(e.errno) : e.message);
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
            return JSON.stringify(response.json(), null, 4);
        }
    
        throw new Error(`[resolveSnapshot] failed with status ${response.status}`);
    } catch (e) {
        throw new SnapshotServiceError(e.errno ? getConnectivityError(e.errno) : e.message);
    }
}