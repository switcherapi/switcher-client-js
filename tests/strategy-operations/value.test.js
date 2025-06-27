import { assert } from 'chai';

import { processOperation, StrategiesType, OperationsType } from '../../src/lib/snapshot.js';

describe('Processing strategy: VALUE', () => {
    const mock_values1 = [
        'USER_1'
    ];

    const mock_values2 = [
        'USER_1', 'USER_2'
    ];

    const givenStrategyConfig = (operation, values) => ({
        strategy: StrategiesType.VALUE,
        operation: operation,
        values: values,
        activated: true,
    });

    it('should agree when input EXIST', async () => {
        const strategyConfig = givenStrategyConfig(OperationsType.EXIST, mock_values1);
        const result = await processOperation(strategyConfig, 'USER_1');
        assert.isTrue(result);
    });

    it('should NOT agree when input DOES NOT EXIST', async () => {
        const strategyConfig = givenStrategyConfig(OperationsType.EXIST, mock_values1);
        const result = await processOperation(strategyConfig, 'USER_123');
        assert.isFalse(result);
    });

    it('should agree when input DOES NOT EXIST', async () => {
        const strategyConfig = givenStrategyConfig(OperationsType.NOT_EXIST, mock_values1);
        const result = await processOperation(strategyConfig, 'USER_123');
        assert.isTrue(result);
    });

    it('should agree when input is EQUAL', async () => {
        const strategyConfig = givenStrategyConfig(OperationsType.EQUAL, mock_values1);
        const result = await processOperation(strategyConfig, 'USER_1');
        assert.isTrue(result);
    });

    it('should NOT agree when input is NOT EQUAL', async () => {
        const strategyConfig = givenStrategyConfig(OperationsType.EQUAL, mock_values1);
        const result = await processOperation(strategyConfig, 'USER_2');
        assert.isFalse(result);
    });

    it('should agree when input is NOT EQUAL', async () => {
        const strategyConfig = givenStrategyConfig(OperationsType.NOT_EQUAL, mock_values2);
        const result = await processOperation(strategyConfig, 'USER_123');
        assert.isTrue(result);
    });

    it('should NOT agree when input is NOT EQUAL', async () => {
        const strategyConfig = givenStrategyConfig(OperationsType.NOT_EQUAL, mock_values2);
        const result = await processOperation(strategyConfig, 'USER_2');
        assert.isFalse(result);
    });
});