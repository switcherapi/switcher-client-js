const cp = require('child_process');

class TimedMatch {

    static _worker = this._createChildProcess();
    static _blacklisted = [];
    static _maxBlackListed = 50;
    static _maxTimeLimit = 3000;

    static async tryMatch(values, input) {
        let result = false;
        let timer, resolveListener;

        if (this._isBlackListed({ values, input }))
            return false;
    
        const matchPromise = new Promise((resolve) => {
            resolveListener = resolve;
            this._worker.on('message', resolveListener);
            this._worker.send({ values, input });
        });
    
        const matchTimer = new Promise((resolve) => {
            timer = setTimeout(() => {
                this._resetWorker({ values, input });
                resolve(false);
            }, this._maxTimeLimit);
        });
    
        await Promise.race([matchPromise, matchTimer]).then((value) => {
            this._worker.off('message', resolveListener);
            clearTimeout(timer);
            result = value;
        });
    
        return result;
    }

    static clearBlackList() {
        this._blacklisted = [];
    }

    static setMaxBlackListed(value) {
        this._maxBlackListed = value;
    }

    static setMaxTimeLimit(value) {
        this._maxTimeLimit = value;
    }

    static _isBlackListed({ values, input }) {
        const bls = this._blacklisted.filter(bl => bl.input == input && bl.res == values);
        return bls.length;
    }
    
    static _resetWorker({ values, input }) {
        this._worker.kill();
        this._worker = this._createChildProcess();

        if (this._blacklisted.length == this._maxBlackListed)
        this._blacklisted.splice(0, 1);

        this._blacklisted.push({
            res: values,
            input
        });
    }
    
    static _createChildProcess() {
        const match_proc = cp.fork(`${__dirname}/match-proc.js`, {
            stdio: 'ignore'
        });
        
        match_proc.unref();
        match_proc.channel.unref();
        return match_proc;
    }
}

module.exports = TimedMatch;