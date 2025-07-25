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

    it('should agree when input EXIST in values - String type', async () => {
        const strategyConfig = givenStrategyConfig(OperationsType.EXIST, mock_values2);
        const result = await processOperation(strategyConfig, '3');
        assert.isTrue(result);
    });

    it('should agree when input EXIST in values - Number type', async () => {
        const strategyConfig = givenStrategyConfig(OperationsType.EXIST, mock_values2);
        const result = await processOperation(strategyConfig, 3);
        assert.isTrue(result);
    });

    it('should NOT agree when input exist but test as DOES NOT EXIST ', async () => {
        const strategyConfig = givenStrategyConfig(OperationsType.NOT_EXIST, mock_values2);
        const result = await processOperation(strategyConfig, '1');
        assert.isFalse(result);
    });

    it('should agree when input DOES NOT EXIST in values', async () => {
        const strategyConfig = givenStrategyConfig(OperationsType.NOT_EXIST, mock_values2);
        const result = await processOperation(strategyConfig, '2');
        assert.isTrue(result);
    });

    it('should agree when input is EQUAL to value', async () => {
        const strategyConfig = givenStrategyConfig(OperationsType.EQUAL, mock_values1);
        const result = await processOperation(strategyConfig, '1');
        assert.isTrue(result);
    });

    it('should NOT agree when input is not equal but test as EQUAL', async () => {
        const strategyConfig = givenStrategyConfig(OperationsType.EQUAL, mock_values1);
        const result = await processOperation(strategyConfig, '2');
        assert.isFalse(result);
    });

    it('should agree when input is NOT EQUAL to value', async () => {
        const strategyConfig = givenStrategyConfig(OperationsType.NOT_EQUAL, mock_values1);
        const result = await processOperation(strategyConfig, '2');
        assert.isTrue(result);
    });

    it('should agree when input is GREATER than value', async () => {
        let strategyConfig = givenStrategyConfig(OperationsType.GREATER, mock_values1);
        let result = await processOperation(strategyConfig, '2');
        assert.isTrue(result);

        // test decimal
        result = await processOperation(strategyConfig, '1.01');
        assert.isTrue(result);

        strategyConfig = givenStrategyConfig(OperationsType.GREATER, mock_values3);
        result = await processOperation(strategyConfig, '1.55');
        assert.isTrue(result);
    });

    it('should NOT agree when input is lower but tested as GREATER than value', async () => {
        let strategyConfig = givenStrategyConfig(OperationsType.GREATER, mock_values1);
        let result = await processOperation(strategyConfig, '0');
        assert.isFalse(result);

        // test decimal
        result = await processOperation(strategyConfig, '0.99');
        assert.isFalse(result);

        strategyConfig = givenStrategyConfig(OperationsType.GREATER, mock_values3);
        result = await processOperation(strategyConfig, '1.49');
        assert.isFalse(result);
    });

    it('should agree when input is LOWER than value', async () => {
        let strategyConfig = givenStrategyConfig(OperationsType.LOWER, mock_values1);
        let result = await processOperation(strategyConfig, '0');
        assert.isTrue(result);

        // test decimal
        result = await processOperation(strategyConfig, '0.99');
        assert.isTrue(result);

        strategyConfig = givenStrategyConfig(OperationsType.LOWER, mock_values3);
        result = await processOperation(strategyConfig, '1.49');
        assert.isTrue(result);
    });

    it('should agree when input is BETWEEN values', async () => {
        const strategyConfig = givenStrategyConfig(OperationsType.BETWEEN, mock_values2);
        let result = await processOperation(strategyConfig, '1');
        assert.isTrue(result);

        // test decimal
        result = await processOperation(strategyConfig, '2.99');
        assert.isTrue(result);

        result = await processOperation(strategyConfig, '1.001');
        assert.isTrue(result);
    });
});