const assert = require('chai').assert;

const {
    processOperation,
    StrategiesType,
    OperationsType
} = require('../src/lib/snapshot');

describe('Processing strategy: VALUE', () => {
    const mock_values1 = [
        'USER_1'
    ];

    const mock_values2 = [
        'USER_1', 'USER_2'
    ];

    it('should agree when input EXIST', async () => {
        const result = await processOperation(
            StrategiesType.VALUE, OperationsType.EXIST, 'USER_1', mock_values1);
        assert.isTrue(result);
    });

    it('should NOT agree when input DOES NOT EXIST', async () => {
        const result = await processOperation(
            StrategiesType.VALUE, OperationsType.EXIST, 'USER_123', mock_values1);
        assert.isFalse(result);
    });

    it('should agree when input DOES NOT EXIST', async () => {
        const result = await processOperation(
            StrategiesType.VALUE, OperationsType.NOT_EXIST, 'USER_123', mock_values1);
        assert.isTrue(result);
    });

    it('should agree when input is EQUAL', async () => {
        const result = await processOperation(
            StrategiesType.VALUE, OperationsType.EQUAL, 'USER_1', mock_values1);
        assert.isTrue(result);
    });

    it('should NOT agree when input is NOT EQUAL', async () => {
        const result = await processOperation(
            StrategiesType.VALUE, OperationsType.EQUAL, 'USER_2', mock_values1);
        assert.isFalse(result);
    });

    it('should agree when input is NOT EQUAL', async () => {
        const result = await processOperation(
            StrategiesType.VALUE, OperationsType.NOT_EQUAL, 'USER_123', mock_values2);
        assert.isTrue(result);
    });

    it('should NOT agree when input is NOT EQUAL', async () => {
        const result = await processOperation(
            StrategiesType.VALUE, OperationsType.NOT_EQUAL, 'USER_2', mock_values2);
        assert.isFalse(result);
    });
});