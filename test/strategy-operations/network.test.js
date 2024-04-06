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

    it('should agree when input range EXIST', async () => {
        const result = await processOperation(
            StrategiesType.NETWORK, OperationsType.EXIST, '10.0.0.3', mock_values1);
        assert.isTrue(result);
    });

    it('should NOT agree when input range DOES NOT EXIST', async () => {
        const result = await processOperation(
            StrategiesType.NETWORK, OperationsType.EXIST, '10.0.0.4', mock_values1);
        assert.isFalse(result);
    });

    it('should agree when input DOES NOT EXIST', async () => {
        const result = await processOperation(
            StrategiesType.NETWORK, OperationsType.NOT_EXIST, '10.0.0.4', mock_values1);
        assert.isTrue(result);
    });

    it('should NOT agree when input EXIST but assumed that it DOES NOT EXIST', async () => {
        const result = await processOperation(
            StrategiesType.NETWORK, OperationsType.NOT_EXIST, '10.0.0.3', mock_values1);
        assert.isFalse(result);
    });

    it('should agree when input IP EXIST', async () => {
        const result = await processOperation(
            StrategiesType.NETWORK, OperationsType.EXIST, '192.168.56.58', mock_values3);
        assert.isTrue(result);
    });

    it('should agree when input IP DOES NOT EXIST', async () => {
        const result = await processOperation(
            StrategiesType.NETWORK, OperationsType.NOT_EXIST, '192.168.56.50', mock_values3);
        assert.isTrue(result);
    });

    it('should agree when input range EXIST for multiple ranges', async () => {
        const result = await processOperation(
            StrategiesType.NETWORK, OperationsType.EXIST, '192.168.0.3', mock_values2);
        assert.isTrue(result);
    });

    it('should NOT agree when input range DOES NOT EXIST for multiple ranges', async () => {
        const result = await processOperation(
            StrategiesType.NETWORK, OperationsType.NOT_EXIST, '127.0.0.0', mock_values2);
        assert.isTrue(result);
    });

});