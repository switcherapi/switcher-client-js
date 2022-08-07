const assert = require('chai').assert;

const {
    processOperation,
    StrategiesType,
    OperationsType
} = require('../src/lib/snapshot');

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

    it('should agree when input EXIST in values - String type', () => {
        const result = processOperation(
            StrategiesType.NUMERIC, OperationsType.EXIST, '3', mock_values2);
        assert.isTrue(result);
    });

    it('should agree when input EXIST in values - Number type', () => {
        const result = processOperation(
            StrategiesType.NUMERIC, OperationsType.EXIST, 3, mock_values2);
        assert.isTrue(result);
    });

    it('should NOT agree when input exist but test as DOES NOT EXIST ', () => {
        const result = processOperation(
            StrategiesType.NUMERIC, OperationsType.NOT_EXIST, '1', mock_values2);
        assert.isFalse(result);
    });

    it('should agree when input DOES NOT EXIST in values', () => {
        const result = processOperation(
            StrategiesType.NUMERIC, OperationsType.NOT_EXIST, '2', mock_values2);
        assert.isTrue(result);
    });

    it('should agree when input is EQUAL to value', () => {
        const result = processOperation(
            StrategiesType.NUMERIC, OperationsType.EQUAL, '1', mock_values1);
        assert.isTrue(result);
    });

    it('should NOT agree when input is not equal but test as EQUAL', () => {
        const result = processOperation(
            StrategiesType.NUMERIC, OperationsType.EQUAL, '2', mock_values1);
            assert.isFalse(result);
    });

    it('should agree when input is NOT EQUAL to value', () => {
        const result = processOperation(
            StrategiesType.NUMERIC, OperationsType.NOT_EQUAL, '2', mock_values1);
        assert.isTrue(result);
    });

    it('should agree when input is GREATER than value', () => {
        let result = processOperation(
            StrategiesType.NUMERIC, OperationsType.GREATER, '2', mock_values1);
        assert.isTrue(result);

        // test decimal
        result = processOperation(
            StrategiesType.NUMERIC, OperationsType.GREATER, '1.01', mock_values1);
        assert.isTrue(result);

        result = processOperation(
            StrategiesType.NUMERIC, OperationsType.GREATER, '1.55', mock_values3);
        assert.isTrue(result);
    });

    it('should NOT agree when input is lower but tested as GREATER than value', () => {
        let result = processOperation(
            StrategiesType.NUMERIC, OperationsType.GREATER, '0', mock_values1);
        assert.isFalse(result);

        // test decimal
        result = processOperation(
            StrategiesType.NUMERIC, OperationsType.GREATER, '0.99', mock_values1);
        assert.isFalse(result);

        result = processOperation(
            StrategiesType.NUMERIC, OperationsType.GREATER, '1.49', mock_values3);
        assert.isFalse(result);
    });

    it('should agree when input is LOWER than value', () => {
        let result = processOperation(
            StrategiesType.NUMERIC, OperationsType.LOWER, '0', mock_values1);
        assert.isTrue(result);

        // test decimal
        result = processOperation(
            StrategiesType.NUMERIC, OperationsType.LOWER, '0.99', mock_values1);
        assert.isTrue(result);

        result = processOperation(
            StrategiesType.NUMERIC, OperationsType.LOWER, '1.49', mock_values3);
        assert.isTrue(result);
    });

    it('should agree when input is BETWEEN values', () => {
        let result = processOperation(
            StrategiesType.NUMERIC, OperationsType.BETWEEN, '1', mock_values2);
        assert.isTrue(result);

        // test decimal
        result = processOperation(
            StrategiesType.NUMERIC, OperationsType.BETWEEN, '2.99', mock_values2);
        assert.isTrue(result);

        result = processOperation(
            StrategiesType.NUMERIC, OperationsType.BETWEEN, '1.001', mock_values2);
        assert.isTrue(result);
    });
});