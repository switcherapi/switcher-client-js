import { assert } from 'chai';

import { processOperation, StrategiesType, OperationsType } from '../../src/lib/snapshot.js';

describe('Processing strategy: NUMERIC', () => {
    const mock_values1 = [
        '1'
    ];

    const mock_values2 = [
        '1', '3'
    ];

    const mock_values3 = [
        '1.5'
    ];

    const givenStrategyConfig = (operation, values) => ({
        strategy: StrategiesType.NUMERIC,
        operation: operation,
        values: values,
        activated: true,
    });

    it('should agree when input EXIST in values - String type', () => {
        const strategyConfig = givenStrategyConfig(OperationsType.EXIST, mock_values2);
        const result = processOperation(strategyConfig, '3');
        assert.isTrue(result);
    });

    it('should agree when input EXIST in values - Number type', () => {
        const strategyConfig = givenStrategyConfig(OperationsType.EXIST, mock_values2);
        const result = processOperation(strategyConfig, 3);
        assert.isTrue(result);
    });

    it('should NOT agree when input exist but test as DOES NOT EXIST ', () => {
        const strategyConfig = givenStrategyConfig(OperationsType.NOT_EXIST, mock_values2);
        const result = processOperation(strategyConfig, '1');
        assert.isFalse(result);
    });

    it('should agree when input DOES NOT EXIST in values', () => {
        const strategyConfig = givenStrategyConfig(OperationsType.NOT_EXIST, mock_values2);
        const result = processOperation(strategyConfig, '2');
        assert.isTrue(result);
    });

    it('should agree when input is EQUAL to value', () => {
        const strategyConfig = givenStrategyConfig(OperationsType.EQUAL, mock_values1);
        const result = processOperation(strategyConfig, '1');
        assert.isTrue(result);
    });

    it('should NOT agree when input is not equal but test as EQUAL', () => {
        const strategyConfig = givenStrategyConfig(OperationsType.EQUAL, mock_values1);
        const result = processOperation(strategyConfig, '2');
        assert.isFalse(result);
    });

    it('should agree when input is NOT EQUAL to value', () => {
        const strategyConfig = givenStrategyConfig(OperationsType.NOT_EQUAL, mock_values1);
        const result = processOperation(strategyConfig, '2');
        assert.isTrue(result);
    });

    it('should agree when input is GREATER than value', () => {
        let strategyConfig = givenStrategyConfig(OperationsType.GREATER, mock_values1);
        let result = processOperation(strategyConfig, '2');
        assert.isTrue(result);

        // test decimal
        result = processOperation(strategyConfig, '1.01');
        assert.isTrue(result);

        strategyConfig = givenStrategyConfig(OperationsType.GREATER, mock_values3);
        result = processOperation(strategyConfig, '1.55');
        assert.isTrue(result);
    });

    it('should NOT agree when input is lower but tested as GREATER than value', () => {
        let strategyConfig = givenStrategyConfig(OperationsType.GREATER, mock_values1);
        let result = processOperation(strategyConfig, '0');
        assert.isFalse(result);

        // test decimal
        result = processOperation(strategyConfig, '0.99');
        assert.isFalse(result);

        strategyConfig = givenStrategyConfig(OperationsType.GREATER, mock_values3);
        result = processOperation(strategyConfig, '1.49');
        assert.isFalse(result);
    });

    it('should agree when input is LOWER than value', () => {
        let strategyConfig = givenStrategyConfig(OperationsType.LOWER, mock_values1);
        let result = processOperation(strategyConfig, '0');
        assert.isTrue(result);

        // test decimal
        result = processOperation(strategyConfig, '0.99');
        assert.isTrue(result);

        strategyConfig = givenStrategyConfig(OperationsType.LOWER, mock_values3);
        result = processOperation(strategyConfig, '1.49');
        assert.isTrue(result);
    });

    it('should agree when input is BETWEEN values', () => {
        const strategyConfig = givenStrategyConfig(OperationsType.BETWEEN, mock_values2);
        let result = processOperation(strategyConfig, '1');
        assert.isTrue(result);

        // test decimal
        result = processOperation(strategyConfig, '2.99');
        assert.isTrue(result);

        result = processOperation(strategyConfig, '1.001');
        assert.isTrue(result);
    });
});