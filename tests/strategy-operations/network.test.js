import { assert } from 'chai';

import { processOperation, StrategiesType, OperationsType } from '../../src/lib/snapshot.js';

describe('Processing strategy: NETWORK', () => {

    const mock_values1 = [
        '10.0.0.0/30'
    ];

    const mock_values2 = [
        '10.0.0.0/30', '192.168.0.0/30'
    ];

    const mock_values3 = [
        '192.168.56.56',
        '192.168.56.57',
        '192.168.56.58'
    ];

    const givenStrategyConfig = (operation, values) => ({
        strategy: StrategiesType.NETWORK,
        operation: operation,
        values: values,
        activated: true,
    });

    it('should agree when input range EXIST', () => {
        const strategyConfig = givenStrategyConfig(OperationsType.EXIST, mock_values1);
        const result = processOperation(strategyConfig, '10.0.0.3');
        assert.isTrue(result);
    });

    it('should agree when input range EXIST - Irregular CIDR', async function () {
        const strategyConfig = givenStrategyConfig(OperationsType.EXIST,  ['10.0.0.3/24']);
        const result = processOperation(strategyConfig, '10.0.0.3');
        assert.isTrue(result);
    });

    it('should NOT agree when input range DOES NOT EXIST', () => {
        const strategyConfig = givenStrategyConfig(OperationsType.EXIST, mock_values1);
        const result = processOperation(strategyConfig, '10.0.0.4');
        assert.isFalse(result);
    });

    it('should agree when input DOES NOT EXIST', () => {
        const strategyConfig = givenStrategyConfig(OperationsType.NOT_EXIST, mock_values1);
        const result = processOperation(strategyConfig, '10.0.0.4');
        assert.isTrue(result);
    });

    it('should NOT agree when input EXIST but assumed that it DOES NOT EXIST', () => {
        const strategyConfig = givenStrategyConfig(OperationsType.NOT_EXIST, mock_values1);
        const result = processOperation(strategyConfig, '10.0.0.3');
        assert.isFalse(result);
    });

    it('should agree when input IP EXIST', () => {
        const strategyConfig = givenStrategyConfig(OperationsType.EXIST, mock_values3);
        const result = processOperation(strategyConfig, '192.168.56.58');
        assert.isTrue(result);
    });

    it('should agree when input IP DOES NOT EXIST', () => {
        const strategyConfig = givenStrategyConfig(OperationsType.NOT_EXIST, mock_values3);
        const result = processOperation(strategyConfig, '192.168.56.50');
        assert.isTrue(result);
    });

    it('should agree when input range EXIST for multiple ranges', () => {
        const strategyConfig = givenStrategyConfig(OperationsType.EXIST, mock_values2);
        const result = processOperation(strategyConfig, '192.168.0.3');
        assert.isTrue(result);
    });

    it('should NOT agree when input range DOES NOT EXIST for multiple ranges', () => {
        const strategyConfig = givenStrategyConfig(OperationsType.NOT_EXIST, mock_values2);
        const result = processOperation(strategyConfig, '127.0.0.0');
        assert.isTrue(result);
    });

});