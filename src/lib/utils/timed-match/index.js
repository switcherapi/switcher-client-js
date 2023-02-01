const cp = require('child_process');

class TimedMatch {

    static #worker = TimedMatch.#createChildProcess();
    static #blacklisted = [];
    static #maxBlackListed = 50;
    static #maxTimeLimit = 3000;

    static async tryMatch(values, input) {
        let result = false;
        let timer, resolveListener;

        if (TimedMatch.#isBlackListed({ values, input }))
            return false;
    
        const matchPromise = new Promise((resolve) => {
            resolveListener = resolve;
            TimedMatch.#worker.on('message', resolveListener);
            TimedMatch.#worker.send({ values, input });
        });
    
        const matchTimer = new Promise((resolve) => {
            timer = setTimeout(() => {
                TimedMatch.#resetWorker({ values, input });
                resolve(false);
            }, TimedMatch.#maxTimeLimit);
        });
    
        await Promise.any([matchPromise, matchTimer]).then((value) => {
            TimedMatch.#worker.off('message', resolveListener);
            clearTimeout(timer);
            result = value;
        });
    
        return result;
    }

    static clearBlackList() {
        TimedMatch.#blacklisted = [];
    }

    static setMaxBlackListed(value) {
        TimedMatch.#maxBlackListed = value;
    }

    static setMaxTimeLimit(value) {
        TimedMatch.#maxTimeLimit = value;
    }

    static #isBlackListed({ values, input }) {
        const bls = TimedMatch.#blacklisted.filter(bl => bl.input == input && bl.res == values);
        return bls.length;
    }
    
    static #resetWorker({ values, input }) {
        TimedMatch.#worker.kill();
        TimedMatch.#worker = TimedMatch.#createChildProcess();

        if (TimedMatch.#blacklisted.length == TimedMatch.#maxBlackListed)
            TimedMatch.#blacklisted.splice(0, 1);

        TimedMatch.#blacklisted.push({
            res: values,
            input
        });
    }
    
    static #createChildProcess() {
        const match_proc = cp.fork(`${__dirname}/match-proc.js`, {
            stdio: 'ignore'
        });
        
        match_proc.unref();
        match_proc.channel.unref();
        return match_proc;
    }
}

module.exports = TimedMatch;