import { assert } from 'chai';
import TimedMatch from '../../src/lib/utils/timed-match/index.js';

const okRE = '[a-z]';
const okInput = 'a';
const nokRE = '^(([a-z])+.)+[A-Z]([a-z])+$';
const nokInput = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

const COLD_TIME = 550;
const WARM_TIME = 50;
const TIMEOUT = 1000;

const getTimer = (timer) => (timer - Date.now()) * -1;

describe('REGEX - Timed Match', () => {
    beforeEach(() => {
        TimedMatch.initializeWorker();
        TimedMatch.clearBlackList();
        TimedMatch.setMaxBlackListed(50);
        TimedMatch.setMaxTimeLimit(1000);
    });

    afterEach(() => {
        TimedMatch.terminateWorker();
    });

    it('should return true', function () {
        const result = TimedMatch.tryMatch([okRE], okInput);
        assert.isTrue(result);
    });

    it('should return false and abort processing', function () {
        this.timeout(3100);
        const result = TimedMatch.tryMatch([nokRE], nokInput);
        assert.isFalse(result);
    });

    it('runs stress tests', function () {
        this.timeout(4000);
        let timer;

        timer = Date.now();
        TimedMatch.tryMatch([okRE], okInput);
        assert.isBelow(getTimer(timer), COLD_TIME);

        timer = Date.now();
        TimedMatch.tryMatch([nokRE], nokInput);
        assert.isAbove(getTimer(timer), TIMEOUT);

        timer = Date.now();
        TimedMatch.tryMatch([okRE], okInput);
        assert.isBelow(getTimer(timer), COLD_TIME);

        for (let index = 0; index < 10; index++) {
            timer = Date.now();
            TimedMatch.tryMatch([okRE], okInput);
            assert.isBelow(getTimer(timer), WARM_TIME);
        }
    });

    it('should rotate blacklist', function () {
        this.timeout(10000);
        let timer;

        TimedMatch.setMaxBlackListed(1);

        timer = Date.now();
        TimedMatch.tryMatch([nokRE], nokInput);
        assert.isAbove(getTimer(timer), TIMEOUT);

        // blacklisted
        timer = Date.now();
        TimedMatch.tryMatch([nokRE], nokInput);
        assert.isBelow(getTimer(timer), WARM_TIME);

        timer = Date.now();
        TimedMatch.tryMatch([nokRE], 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
        assert.isAbove(getTimer(timer), TIMEOUT);

        // blacklisted
        timer = Date.now();
        TimedMatch.tryMatch([nokRE], 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
        assert.isBelow(getTimer(timer), WARM_TIME);
    });

    it('should capture blacklisted item from multiple regex options', function () {
        this.timeout(2000);
        let timer;

        TimedMatch.setMaxBlackListed(1);

        timer = Date.now();
        TimedMatch.tryMatch([nokRE, okRE], nokInput);
        assert.isAbove(getTimer(timer), TIMEOUT);

        // blacklisted (inverted regex order should still work)
        timer = Date.now();
        TimedMatch.tryMatch([okRE, nokRE], nokInput);
        assert.isBelow(getTimer(timer), WARM_TIME);
    });

    it('should capture blacklisted item from similar inputs', function () {
        this.timeout(2000);
        let timer;

        TimedMatch.setMaxBlackListed(1);

        timer = Date.now();
        TimedMatch.tryMatch([nokRE, okRE], 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
        assert.isAbove(getTimer(timer), TIMEOUT);

        // blacklisted (input slightly different but contains the same evil segment)
        timer = Date.now();
        TimedMatch.tryMatch([nokRE, okRE], 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaab');
        assert.isBelow(getTimer(timer), WARM_TIME);

        // same here
        timer = Date.now();
        TimedMatch.tryMatch([nokRE, okRE], 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
        assert.isBelow(getTimer(timer), WARM_TIME);

        // and here with inverted regex
        timer = Date.now();
        TimedMatch.tryMatch([okRE, nokRE], 'aaaaaaaaaaaaaaaaaaaaaaaaaa');
        assert.isBelow(getTimer(timer), WARM_TIME);
    });

    it('should reduce worker timer', function () {
        this.timeout(1000);
        TimedMatch.setMaxTimeLimit(500);

        let timer = Date.now();
        TimedMatch.tryMatch([nokRE], nokInput);
        timer = getTimer(timer);
        assert.isAbove(timer, 500);
        assert.isBelow(timer, TIMEOUT);
    });
});