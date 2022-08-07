const assert = require('chai').assert;

const {
    processOperation,
    StrategiesType,
    OperationsType
} = require('../src/lib/snapshot');

describe('Processing strategy: TIME', () => {
    const mock_values1 = [
        '08:00'
    ];

    const mock_values2 = [
        '08:00', '10:00'
    ];

    it('should agree when input is LOWER', () => {
        const result = processOperation(
            StrategiesType.TIME, OperationsType.LOWER, '06:00', mock_values1);
        assert.isTrue(result);
    });

    it('should agree when input is LOWER or SAME', () => {
        const result = processOperation(
            StrategiesType.TIME, OperationsType.LOWER, '08:00', mock_values1);
        assert.isTrue(result);
    });

    it('should NOT agree when input is NOT LOWER', () => {
        const result = processOperation(
            StrategiesType.TIME, OperationsType.LOWER, '10:00', mock_values1);
        assert.isFalse(result);
    });

    it('should agree when input is GREATER', () => {
        const result = processOperation(
            StrategiesType.TIME, OperationsType.GREATER, '10:00', mock_values1);
        assert.isTrue(result);
    });

    it('should agree when input is GREATER or SAME', () => {
        const result = processOperation(
            StrategiesType.TIME, OperationsType.GREATER, '08:00', mock_values1);
        assert.isTrue(result);
    });

    it('should NOT agree when input is NOT GREATER', () => {
        const result = processOperation(
            StrategiesType.TIME, OperationsType.GREATER, '06:00', mock_values1);
        assert.isFalse(result);
    });

    it('should agree when input is in BETWEEN', () => {
        const result = processOperation(
            StrategiesType.TIME, OperationsType.BETWEEN, '09:00', mock_values2);
        assert.isTrue(result);
    });

    it('should NOT agree when input is NOT in BETWEEN', () => {
        const result = processOperation(
            StrategiesType.TIME, OperationsType.BETWEEN, '07:00', mock_values2);
        assert.isFalse(result);
    });

});