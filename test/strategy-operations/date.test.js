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

    it('should agree when input is LOWER', async () => {
        const result = await processOperation(
            StrategiesType.DATE, OperationsType.LOWER, '2019-11-26', mock_values1);
        assert.isTrue(result);
    });

    it('should agree when input is LOWER or SAME', async () => {
        const result = await processOperation(
            StrategiesType.DATE, OperationsType.LOWER, '2019-12-01', mock_values1);
        assert.isTrue(result);
    });

    it('should NOT agree when input is NOT LOWER', async () => {
        const result = await processOperation(
            StrategiesType.DATE, OperationsType.LOWER, '2019-12-02', mock_values1);
        assert.isFalse(result);
    });

    it('should agree when input is GREATER', async () => {
        const result = await processOperation(
            StrategiesType.DATE, OperationsType.GREATER, '2019-12-02', mock_values1);
        assert.isTrue(result);
    });

    it('should agree when input is GREATER or SAME', async () => {
        const result = await processOperation(
            StrategiesType.DATE, OperationsType.GREATER, '2019-12-01', mock_values1);
        assert.isTrue(result);
    });

    it('should NOT agree when input is NOT GREATER', async () => {
        const result = await processOperation(
            StrategiesType.DATE, OperationsType.GREATER, '2019-11-10', mock_values1);
        assert.isFalse(result);
    });

    it('should agree when input is in BETWEEN', async () => {
        const result = await processOperation(
            StrategiesType.DATE, OperationsType.BETWEEN, '2019-12-03', mock_values2);
        assert.isTrue(result);
    });

    it('should NOT agree when input is NOT in BETWEEN', async () => {
        const result = await processOperation(
            StrategiesType.DATE, OperationsType.BETWEEN, '2019-12-12', mock_values2);
        assert.isFalse(result);
    });

    it('should agree when input is LOWER including time', async () => {
        const result = await processOperation(
            StrategiesType.DATE, OperationsType.LOWER, '2019-12-01T07:00', mock_values3);
        assert.isTrue(result);
    });

    it('should NOT agree when input is NOT LOWER including time', async () => {
        const result = await processOperation(
            StrategiesType.DATE, OperationsType.LOWER, '2019-12-01T07:00', mock_values1);
        assert.isFalse(result);
    });

    it('should agree when input is GREATER including time', async () => {
        const result = await processOperation(
            StrategiesType.DATE, OperationsType.GREATER, '2019-12-01T08:40', mock_values3);
        assert.isTrue(result);
    });

});