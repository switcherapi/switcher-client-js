const assert = require('chai').assert;

const {
    processOperation,
    StrategiesType,
    OperationsType
} = require('../src/lib/snapshot');

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

    it('should agree when input is LOWER', () => {
        const result = processOperation(
            StrategiesType.DATE, OperationsType.LOWER, '2019-11-26', mock_values1);
        assert.isTrue(result);
    });

    it('should agree when input is LOWER or SAME', () => {
        const result = processOperation(
            StrategiesType.DATE, OperationsType.LOWER, '2019-12-01', mock_values1);
        assert.isTrue(result);
    });

    it('should NOT agree when input is NOT LOWER', () => {
        const result = processOperation(
            StrategiesType.DATE, OperationsType.LOWER, '2019-12-02', mock_values1);
        assert.isFalse(result);
    });

    it('should agree when input is GREATER', () => {
        const result = processOperation(
            StrategiesType.DATE, OperationsType.GREATER, '2019-12-02', mock_values1);
        assert.isTrue(result);
    });

    it('should agree when input is GREATER or SAME', () => {
        const result = processOperation(
            StrategiesType.DATE, OperationsType.GREATER, '2019-12-01', mock_values1);
        assert.isTrue(result);
    });

    it('should NOT agree when input is NOT GREATER', () => {
        const result = processOperation(
            StrategiesType.DATE, OperationsType.GREATER, '2019-11-10', mock_values1);
        assert.isFalse(result);
    });

    it('should agree when input is in BETWEEN', () => {
        const result = processOperation(
            StrategiesType.DATE, OperationsType.BETWEEN, '2019-12-03', mock_values2);
        assert.isTrue(result);
    });

    it('should NOT agree when input is NOT in BETWEEN', () => {
        const result = processOperation(
            StrategiesType.DATE, OperationsType.BETWEEN, '2019-12-12', mock_values2);
        assert.isFalse(result);
    });

    it('should agree when input is LOWER including time', () => {
        const result = processOperation(
            StrategiesType.DATE, OperationsType.LOWER, '2019-12-01T07:00', mock_values3);
        assert.isTrue(result);
    });

    it('should NOT agree when input is NOT LOWER including time', () => {
        const result = processOperation(
            StrategiesType.DATE, OperationsType.LOWER, '2019-12-01T07:00', mock_values1);
        assert.isFalse(result);
    });

    it('should agree when input is GREATER including time', () => {
        const result = processOperation(
            StrategiesType.DATE, OperationsType.GREATER, '2019-12-01T08:40', mock_values3);
        assert.isTrue(result);
    });

});