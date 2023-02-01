const assert = require('chai').assert;
const TimedMatch = require('../src/lib/utils/timed-match');

const okRE = ['[a-z]'];
const okInput = 'a';
const nokRE = ['^(([a-z])+.)+[A-Z]([a-z])+$'];
const nokInput = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

const COLD_TIME = 500;
const WARM_TIME = 50;
const TIMEOUT = 1000;

const getTimer = (timer) => (timer - Date.now()) * -1;

describe('Timed Match', () => {
    beforeEach(() => {
        TimedMatch.clearBlackList();
        TimedMatch.setMaxBlackListed(50);
        TimedMatch.setMaxTimeLimit(1000)
    });

    it('should return true', async function () {
        const result = await TimedMatch.tryMatch(okRE, okInput);
        assert.isTrue(result);
    });

    it('should return false and abort processing', async function () {
        this.timeout(3100);
        const result = await TimedMatch.tryMatch(nokRE, nokInput);
        assert.isFalse(result);
    });

    it('runs stress tests', async function () {
        this.timeout(4000);
        let timer;

        timer = Date.now();
        await TimedMatch.tryMatch(okRE, okInput);
        assert.isBelow(getTimer(timer), COLD_TIME);

        timer = Date.now();
        await TimedMatch.tryMatch(nokRE, nokInput);
        assert.isAbove(getTimer(timer), TIMEOUT);

        timer = Date.now();
        await TimedMatch.tryMatch(okRE, okInput);
        assert.isBelow(getTimer(timer), COLD_TIME);

        for (let index = 0; index < 10; index++) {
            timer = Date.now();
            await TimedMatch.tryMatch(okRE, okInput);
            assert.isBelow(getTimer(timer), WARM_TIME);
        }
    });

    it('should rotate black list', async function () {
        this.timeout(10000);
        let timer;

        TimedMatch.setMaxBlackListed(1);

        timer = Date.now();
        await TimedMatch.tryMatch(nokRE, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
        assert.isAbove(getTimer(timer), TIMEOUT);

        // black listed
        timer = Date.now();
        await TimedMatch.tryMatch(nokRE, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
        assert.isBelow(getTimer(timer), WARM_TIME);

        timer = Date.now();
        await TimedMatch.tryMatch(nokRE, 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
        assert.isAbove(getTimer(timer), TIMEOUT);

        // black listed
        timer = Date.now();
        await TimedMatch.tryMatch(nokRE, 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb');
        assert.isBelow(getTimer(timer), WARM_TIME);
    });

    it('should reduce worker timer', async function () {
        this.timeout(1000);
        TimedMatch.setMaxTimeLimit(500);

        let timer = Date.now();
        await TimedMatch.tryMatch(nokRE, nokInput);
        timer = getTimer(timer);
        assert.isAbove(timer, 500);
        assert.isBelow(timer, TIMEOUT);
    });
});