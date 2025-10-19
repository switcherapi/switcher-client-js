import { assert } from 'chai';

import { processOperation, StrategiesType, OperationsType } from '../../src/lib/snapshot.js';

describe('Processing strategy: TIME', () => {
    const mock_values1 = [
        '08:00'
    ];

    const mock_values2 = [
        '08:00', '10:00'
    ];

    const givenStrategyConfig = (operation, values) => ({
        strategy: StrategiesType.TIME,
        operation: operation,
        values: values,
        activated: true,
    });

    it('should agree when input is LOWER', () => {
        const strategyConfig = givenStrategyConfig(OperationsType.LOWER, mock_values1);
        const result = processOperation(strategyConfig, '06:00');
        assert.isTrue(result);
    });

    it('should agree when input is LOWER or SAME', () => {
        const strategyConfig = givenStrategyConfig(OperationsType.LOWER, mock_values1);
        const result = processOperation(strategyConfig, '08:00');
        assert.isTrue(result);
    });

    it('should NOT agree when input is NOT LOWER', () => {
        const strategyConfig = givenStrategyConfig(OperationsType.LOWER, mock_values1);
        const result = processOperation(strategyConfig, '10:00');
        assert.isFalse(result);
    });

    it('should agree when input is GREATER', () => {
        const strategyConfig = givenStrategyConfig(OperationsType.GREATER, mock_values1);
        const result = processOperation(strategyConfig, '10:00');
        assert.isTrue(result);
    });

    it('should agree when input is GREATER or SAME', () => {
        const strategyConfig = givenStrategyConfig(OperationsType.GREATER, mock_values1);
        const result = processOperation(strategyConfig, '08:00');
        assert.isTrue(result);
    });

    it('should NOT agree when input is NOT GREATER', () => {
        const strategyConfig = givenStrategyConfig(OperationsType.GREATER, mock_values1);
        const result = processOperation(strategyConfig, '06:00');
        assert.isFalse(result);
    });

    it('should agree when input is in BETWEEN', () => {
        const strategyConfig = givenStrategyConfig(OperationsType.BETWEEN, mock_values2);
        const result = processOperation(strategyConfig, '09:00');
        assert.isTrue(result);
    });

    it('should NOT agree when input is NOT in BETWEEN', () => {
        const strategyConfig = givenStrategyConfig(OperationsType.BETWEEN, mock_values2);
        const result = processOperation(strategyConfig, '07:00');
        assert.isFalse(result);
    });

});