const assert = require('chai').assert;

const TimedMatch = require('../../src/lib/utils/timed-match');
const {
    processOperation,
    StrategiesType,
    OperationsType
} = require('../../src/lib/snapshot');

const mock_values1 = [
    '\\bUSER_[0-9]{1,2}\\b'
];

const mock_values2 = [
    '\\bUSER_[0-9]{1,2}\\b', '\\buser-[0-9]{1,2}\\b'
];

const mock_values3 = [
    'USER_[0-9]{1,2}'
];

describe('Processing strategy: [REGEX Safe] ', function() {
    this.beforeAll(async function() {
        TimedMatch.initializeWorker();
    });

    this.afterAll(function() {
        TimedMatch.terminateWorker();
    });

    it('should agree when expect to exist using EXIST operation', async () => {
        let result = await processOperation(
            StrategiesType.REGEX, OperationsType.EXIST, 'USER_1', mock_values1);
        assert.isTrue(result);

        result = await processOperation(
            StrategiesType.REGEX, OperationsType.EXIST, 'user-01', mock_values2);
        assert.isTrue(result);
    });

    it('should NOT agree when expect to exist using EXIST operation', async () => {
        let result = await processOperation(
            StrategiesType.REGEX, OperationsType.EXIST, 'USER_123', mock_values1);
        assert.isFalse(result);

        //mock_values3 does not require exact match
        result = await processOperation(
            StrategiesType.REGEX, OperationsType.EXIST, 'USER_123', mock_values3);
        assert.isTrue(result);
    });

    it('should agree when expect to not exist using NOT_EXIST operation', async () => {
        let result = await processOperation(
            StrategiesType.REGEX, OperationsType.NOT_EXIST, 'USER_123', mock_values1);
        assert.isTrue(result);

        result = await processOperation(
            StrategiesType.REGEX, OperationsType.NOT_EXIST, 'user-123', mock_values2);
        assert.isTrue(result);
    });

    it('should NOT agree when expect to not exist using NOT_EXIST operation', async () => {
        const result = await processOperation(
            StrategiesType.REGEX, OperationsType.NOT_EXIST, 'USER_12', mock_values1);
        assert.isFalse(result);
    });

    it('should agree when expect to be equal using EQUAL operation', async () => {
        const result = await processOperation(
            StrategiesType.REGEX, OperationsType.EQUAL, 'USER_11', mock_values3);
        assert.isTrue(result);
    });

    it('should NOT agree when expect to be equal using EQUAL operation', async () => {
        const result = await processOperation(
            StrategiesType.REGEX, OperationsType.EQUAL, 'user-11', mock_values3);
        assert.isFalse(result);
    });

    it('should agree when expect to not be equal using NOT_EQUAL operation', async () => {
        const result = await processOperation(
            StrategiesType.REGEX, OperationsType.NOT_EQUAL, 'USER_123', mock_values3);
        assert.isTrue(result);
    });

    it('should NOT agree when expect to not be equal using NOT_EQUAL operation', async () => {
        const result = await processOperation(
            StrategiesType.REGEX, OperationsType.NOT_EQUAL, 'USER_1', mock_values3);
        assert.isFalse(result);
    });

    it('should NOT agree when match cannot finish (reDoS attempt)', async function () {
        this.timeout(3100);

        const result = await processOperation(
            StrategiesType.REGEX, OperationsType.EQUAL, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', ['^(([a-z])+.)+[A-Z]([a-z])+$']);
        assert.isFalse(result);
    });
});

describe('Strategy [REGEX] tests:', function() {
    this.afterAll(function() {
        TimedMatch.terminateWorker();
    });
  
    it('should agree when expect to exist using EXIST operation', async function () {
      const result = await processOperation(StrategiesType.REGEX, OperationsType.EXIST, 'USER_1', mock_values1);
      assert.isTrue(result);
    });
});