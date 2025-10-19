import { assert } from 'chai';

import { processOperation, StrategiesType, OperationsType } from '../../src/lib/snapshot.js';

describe('Processing strategy: DATE', () => {
    const mock_values1 = [
        '2019-12-01'
    ];

    const mock_values2 = [
        '2019-12-01', '2019-12-05'
    ];

    const mock_values3 = [
        '2019-12-01T08:30'
    ];

    const givenStrategyConfig = (operation, values) => ({
        strategy: StrategiesType.DATE,
        operation: operation,
        values: values,
        activated: true,
    });

    it('should agree when input is LOWER', () => {
        const strategyConfig = givenStrategyConfig(OperationsType.LOWER, mock_values1);
        const result = processOperation(strategyConfig, '2019-11-26');
        assert.isTrue(result);
    });

    it('should agree when input is LOWER or SAME', () => {
        const strategyConfig = givenStrategyConfig(OperationsType.LOWER, mock_values1);
        const result = processOperation(strategyConfig, '2019-12-01');
        assert.isTrue(result);
    });

    it('should NOT agree when input is NOT LOWER', () => {
        const strategyConfig = givenStrategyConfig(OperationsType.LOWER, mock_values1);
        const result = processOperation(strategyConfig, '2019-12-02');
        assert.isFalse(result);
    });

    it('should agree when input is GREATER', () => {
        const strategyConfig = givenStrategyConfig(OperationsType.GREATER, mock_values1);
        const result = processOperation(strategyConfig, '2019-12-02');
        assert.isTrue(result);
    });

    it('should agree when input is GREATER or SAME', () => {
        const strategyConfig = givenStrategyConfig(OperationsType.GREATER, mock_values1);
        const result = processOperation(strategyConfig, '2019-12-01');
        assert.isTrue(result);
    });

    it('should NOT agree when input is NOT GREATER', () => {
        const strategyConfig = givenStrategyConfig(OperationsType.GREATER, mock_values1);
        const result = processOperation(strategyConfig, '2019-11-10');
        assert.isFalse(result);
    });

    it('should agree when input is in BETWEEN', () => {
        const strategyConfig = givenStrategyConfig(OperationsType.BETWEEN, mock_values2);
        const result = processOperation(strategyConfig, '2019-12-03');
        assert.isTrue(result);
    });

    it('should NOT agree when input is NOT in BETWEEN', () => {
        const strategyConfig = givenStrategyConfig(OperationsType.BETWEEN, mock_values2);
        const result = processOperation(strategyConfig, '2019-12-12');
        assert.isFalse(result);
    });

    it('should agree when input is LOWER including time', () => {
        const strategyConfig = givenStrategyConfig(OperationsType.LOWER, mock_values3);
        const result = processOperation(strategyConfig, '2019-12-01T07:00');
        assert.isTrue(result);
    });

    it('should NOT agree when input is NOT LOWER including time', () => {
        const strategyConfig = givenStrategyConfig(OperationsType.LOWER, mock_values1);
        const result = processOperation(strategyConfig, '2019-12-01T07:00');
        assert.isFalse(result);
    });

    it('should agree when input is GREATER including time', () => {
        const strategyConfig = givenStrategyConfig(OperationsType.GREATER, mock_values3);
        const result = processOperation(strategyConfig, '2019-12-01T08:40');
        assert.isTrue(result);
    });

});