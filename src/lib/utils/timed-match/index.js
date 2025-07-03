import path from 'node:path';
import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';

import tryMatch from '../timed-match/match.js';
import { DEFAULT_REGEX_MAX_BLACKLISTED, DEFAULT_REGEX_MAX_TIME_LIMIT } from '../../constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * This class will run a match operation using a child process.
 *
 * Workers should be killed given a specified (3000 ms default) time limit.
 *
 * Blacklist caching is available to prevent sequence of matching failures and resource usage.
 */
export default class TimedMatch {
    static #worker = undefined;
    static #workerActive = false;
    static #blacklisted = [];
    static #maxBlackListed = DEFAULT_REGEX_MAX_BLACKLISTED;
    static #maxTimeLimit = DEFAULT_REGEX_MAX_TIME_LIMIT;

    /**
     * Initialize Worker process for working with Regex process operators
     */
    static initializeWorker() {
        this.#worker = this.#createChildProcess();
        this.#workerActive = true;
    }

    /**
     * Gracefully terminate worker
     */
    static terminateWorker() {
        this.#worker?.terminate();
        this.#workerActive = false;
    }

    /**
     * Executes regex matching operation with timeout protection.
     *
     * If a worker is initialized and active, the operation runs in a separate worker thread
     * with timeout protection to prevent runaway regex operations. Uses SharedArrayBuffer
     * for synchronous communication between main thread and worker.
     *
     * If no worker is available, falls back to direct execution on the main thread.
     *
     * Failed operations (timeouts, errors) are automatically added to a blacklist to
     * prevent repeated attempts with the same problematic patterns.
     * 
     * @param {*} values array of regular expression to be evaluated
     * @param {*} input to be matched
     * @returns match result
     */
    static tryMatch(values, input) {
        if (this.#worker && this.#workerActive) {
            return this.#safeMatch(values, input);
        }

        return tryMatch(values, input);
    }
    
    /**
     * Run match using Node.js Worker Threads API.
     * 
     * @param {*} values array of regular expression to be evaluated
     * @param {*} input to be matched
     * @returns match result
     */
    static #safeMatch(values, input) {
        if (this.#isBlackListed(values, input)) {
            return false;
        }

        // Create a SharedArrayBuffer for communication
        const sharedBuffer = new SharedArrayBuffer(4);
        const int32Array = new Int32Array(sharedBuffer);
        
        // Send parameters to worker using postMessage (Worker Threads API)
        this.#worker.postMessage({ values, input, sharedBuffer });
        
        // Wait for worker to complete or timeout
        const result = Atomics.wait(int32Array, 0, 0, this.#maxTimeLimit);
        
        if (result === 'timed-out') {
            this.#resetWorker(values, input);
            return false;
        }
        
        // Get the actual result from the shared buffer
        return Atomics.load(int32Array, 0) === 1;
    }

    static #isBlackListed(values, input) {
        const bls = this.#blacklisted.filter(bl =>
            // input can contain same segment that could fail matching operation 
            (bl.input.includes(input) || input.includes(bl.input)) && 
            // regex order should not affect 
            bl.res.filter(value => values.includes(value)).length);
        return bls.length;
    }
    
    /**
     * Called when match worker fails to finish in time by;
     * - Killing worker
     * - Restarting new worker
     * - Caching entry to the blacklist
     * 
     * @param {*} param0 list of regex and input 
     */
    static #resetWorker(values, input) {
        this.#worker.terminate();
        this.#worker = this.#createChildProcess();

        if (this.#blacklisted.length == this.#maxBlackListed) {
            this.#blacklisted.splice(0, 1);
        }

        this.#blacklisted.push({
            res: values,
            input
        });
    }
    
    static #createChildProcess() {
        const match_proc = new Worker(`${__dirname}/match-proc.js`);
        
        match_proc.unref();
        return match_proc;
    }
    
    /**
     * Clear entries from failed matching operations
     */
    static clearBlackList() {
        this.#blacklisted = [];
    }

    static setMaxBlackListed(value) {
        this.#maxBlackListed = value;
    }

    static setMaxTimeLimit(value) {
        this.#maxTimeLimit = value;
    }
}