import { assert } from 'chai';

import { processOperation, StrategiesType, OperationsType } from '../../src/lib/snapshot.js';

describe('Processing strategy: TIME', () => {
    const mock_values1 = [
        '08:00'
    ];

    const mock_values2 = [
        '08:00', '10:00'
    ];

    it('should agree when input is LOWER', async () => {
        const result = await processOperation(
            StrategiesType.TIME, OperationsType.LOWER, '06:00', mock_values1);
        assert.isTrue(result);
    });

    it('should agree when input is LOWER or SAME', async () => {
        const result = await processOperation(
            StrategiesType.TIME, OperationsType.LOWER, '08:00', mock_values1);
        assert.isTrue(result);
    });

    it('should NOT agree when input is NOT LOWER', async () => {
        const result = await processOperation(
            StrategiesType.TIME, OperationsType.LOWER, '10:00', mock_values1);
        assert.isFalse(result);
    });

    it('should agree when input is GREATER', async () => {
        const result = await processOperation(
            StrategiesType.TIME, OperationsType.GREATER, '10:00', mock_values1);
        assert.isTrue(result);
    });

    it('should agree when input is GREATER or SAME', async () => {
        const result = await processOperation(
            StrategiesType.TIME, OperationsType.GREATER, '08:00', mock_values1);
        assert.isTrue(result);
    });

    it('should NOT agree when input is NOT GREATER', async () => {
        const result = await processOperation(
            StrategiesType.TIME, OperationsType.GREATER, '06:00', mock_values1);
        assert.isFalse(result);
    });

    it('should agree when input is in BETWEEN', async () => {
        const result = await processOperation(
            StrategiesType.TIME, OperationsType.BETWEEN, '09:00', mock_values2);
        assert.isTrue(result);
    });

    it('should NOT agree when input is NOT in BETWEEN', async () => {
        const result = await processOperation(
            StrategiesType.TIME, OperationsType.BETWEEN, '07:00', mock_values2);
        assert.isFalse(result);
    });

});