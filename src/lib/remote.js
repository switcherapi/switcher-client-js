import fs from 'node:fs';
import { Agent } from 'node:https';

import { AuthError, CheckSwitcherError, CriteriaError, SnapshotServiceError } from './exceptions/index.js';
import FetchFacade from './utils/fetchFacade.js';

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
    
    if (input.flat().length % 2 !== 0) {
        throw new Error(`Invalid input format for '${input}'`);
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

export async function checkAPIHealth(url) {
    try {
        const response = await FetchFacade.fetch(`${url}/check`, { method: 'get', agent: httpClient });
        return response.status == 200;
    } catch (e) {
        return false;
    }
}

export async function checkCriteria({ url, token }, key, input, showDetail = false) {
    try {
        const entry = getEntry(input);
        const response = await FetchFacade.fetch(`${url}/criteria?showReason=${showDetail}&key=${key}`, {
            method: 'post',
            body: JSON.stringify({ entry }),
            headers: getHeader(token),
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

export async function auth({ url, apiKey, domain, component, environment }) {
    try {
        const response = await FetchFacade.fetch(`${url}/criteria/auth`, {
            method: 'post',
            body: JSON.stringify({
                domain,
                component,
                environment
            }),
            headers: {
                'switcher-api-key': apiKey,
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

export async function checkSwitchers(url, token, switcherKeys) {
    try {
        const response = await FetchFacade.fetch(`${url}/criteria/switchers_check`, {
            method: 'post',
            body: JSON.stringify({ switchers: switcherKeys }),
            headers: getHeader(token),
            agent: httpClient
        });

        if (response.status != 200) {
            throw new Error(`[checkSwitchers] failed with status ${response.status}`);
        }
        
        const json = response.json();
        if (json.not_found.length)
            throw new CheckSwitcherError(json.not_found);
    } catch (e) {
        throw new CriteriaError(e.errno ? getConnectivityError(e.errno) : e.message);
    }
}

export async function checkSnapshotVersion(url, token, version) {
    try {
        const response = await FetchFacade.fetch(`${url}/criteria/snapshot_check/${version}`, {
            method: 'get',
            headers: getHeader(token),
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

export async function resolveSnapshot(url, token, domain, environment, component) {
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
        const response = await FetchFacade.fetch(`${url}/graphql`, {
            method: 'post',
            body: JSON.stringify(data),
            headers: getHeader(token),
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