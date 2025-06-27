import { assert } from 'chai';

import TimedMatch from '../../src/lib/utils/timed-match/index.js';
import { processOperation, StrategiesType, OperationsType } from '../../src/lib/snapshot.js';

const mock_values1 = [
    '\\bUSER_[0-9]{1,2}\\b'
];

const mock_values2 = [
    '\\bUSER_[0-9]{1,2}\\b', '\\buser-[0-9]{1,2}\\b'
];

const mock_values3 = [
    'USER_[0-9]{1,2}'
];

const givenStrategyConfig = (operation, values) => ({
  strategy: StrategiesType.REGEX,
  operation: operation,
  values: values,
  activated: true,
});

describe('Processing strategy: [REGEX Safe] ', function() {
    this.beforeAll(function() {
        TimedMatch.initializeWorker();
    });

    this.afterAll(function() {
        TimedMatch.terminateWorker();
    });

    it('should agree when expect to exist using EXIST operation', async () => {
        let strategyConfig = givenStrategyConfig(OperationsType.EXIST, mock_values1);
        let result = await processOperation(strategyConfig, 'USER_1');
        assert.isTrue(result);

        strategyConfig = givenStrategyConfig(OperationsType.EXIST, mock_values2);
        result = await processOperation(strategyConfig, 'user-01');
        assert.isTrue(result);
    });

    it('should NOT agree when expect to exist using EXIST operation', async () => {
        let strategyConfig = givenStrategyConfig(OperationsType.EXIST, mock_values1);
        let result = await processOperation(strategyConfig, 'USER_123');
        assert.isFalse(result);

        //mock_values3 does not require exact match
        strategyConfig = givenStrategyConfig(OperationsType.EXIST, mock_values3);
        result = await processOperation(strategyConfig, 'USER_123');
        assert.isTrue(result);
    });

    it('should agree when expect to not exist using NOT_EXIST operation', async () => {
        let strategyConfig = givenStrategyConfig(OperationsType.NOT_EXIST, mock_values1);
        let result = await processOperation(strategyConfig, 'USER_123');
        assert.isTrue(result);

        strategyConfig = givenStrategyConfig(OperationsType.NOT_EXIST, mock_values2);
        result = await processOperation(strategyConfig, 'user-123');
        assert.isTrue(result);
    });

    it('should NOT agree when expect to not exist using NOT_EXIST operation', async () => {
        const strategyConfig = givenStrategyConfig(OperationsType.NOT_EXIST, mock_values1);
        const result = await processOperation(strategyConfig, 'USER_12');
        assert.isFalse(result);
    });

    it('should agree when expect to be equal using EQUAL operation', async () => {
        const strategyConfig = givenStrategyConfig(OperationsType.EQUAL, mock_values3);
        const result = await processOperation(strategyConfig, 'USER_11');
        assert.isTrue(result);
    });

    it('should NOT agree when expect to be equal using EQUAL operation', async () => {
        const strategyConfig = givenStrategyConfig(OperationsType.EQUAL, mock_values3);
        const result = await processOperation(strategyConfig, 'user-11');
        assert.isFalse(result);
    });

    it('should agree when expect to not be equal using NOT_EQUAL operation', async () => {
        const strategyConfig = givenStrategyConfig(OperationsType.NOT_EQUAL, mock_values3);
        const result = await processOperation(strategyConfig, 'USER_123');
        assert.isTrue(result);
    });

    it('should NOT agree when expect to not be equal using NOT_EQUAL operation', async () => {
        const strategyConfig = givenStrategyConfig(OperationsType.NOT_EQUAL, mock_values3);
        const result = await processOperation(strategyConfig, 'USER_1');
        assert.isFalse(result);
    });

    it('should NOT agree when match cannot finish (reDoS attempt)', async function () {
        this.timeout(3100);
        
        const strategyConfig = givenStrategyConfig(OperationsType.EQUAL, ['^(([a-z])+.)+[A-Z]([a-z])+$']);
        const result = await processOperation(strategyConfig, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
        assert.isFalse(result);
    });
});

describe('Strategy [REGEX] tests:', function() {
    this.afterAll(function() {
        TimedMatch.terminateWorker();
    });
  
    it('should agree when expect to exist using EXIST operation', async function () {
        const strategyConfig = givenStrategyConfig(OperationsType.EXIST, mock_values1);
        const result = await processOperation(strategyConfig, 'USER_1');
        assert.isTrue(result);
    });
});