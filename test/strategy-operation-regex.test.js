const assert = require('chai').assert;

const {
    processOperation,
    StrategiesType,
    OperationsType
} = require('../src/lib/snapshot');

describe('Processing strategy: REGEX', () => {
    const mock_values1 = [
        '\\bUSER_[0-9]{1,2}\\b'
    ];

    const mock_values2 = [
        '\\bUSER_[0-9]{1,2}\\b', '\\buser-[0-9]{1,2}\\b'
    ];

    const mock_values3 = [
        'USER_[0-9]{1,2}'
    ];

    it('should agree when expect to exist using EXIST operation', () => {
        let result = processOperation(
            StrategiesType.REGEX, OperationsType.EXIST, 'USER_1', mock_values1);
        assert.isTrue(result);

        result = processOperation(
            StrategiesType.REGEX, OperationsType.EXIST, 'user-01', mock_values2);
        assert.isTrue(result);
    });

    it('should NOT agree when expect to exist using EXIST operation', () => {
        let result = processOperation(
            StrategiesType.REGEX, OperationsType.EXIST, 'USER_123', mock_values1);
        assert.isFalse(result);

        //mock_values3 does not require exact match
        result = processOperation(
            StrategiesType.REGEX, OperationsType.EXIST, 'USER_123', mock_values3);
        assert.isTrue(result);
    });

    it('should agree when expect to not exist using NOT_EXIST operation', () => {
        let result = processOperation(
            StrategiesType.REGEX, OperationsType.NOT_EXIST, 'USER_123', mock_values1);
        assert.isTrue(result);

        result = processOperation(
            StrategiesType.REGEX, OperationsType.NOT_EXIST, 'user-123', mock_values2);
        assert.isTrue(result);
    });

    it('should NOT agree when expect to not exist using NOT_EXIST operation', () => {
        const result = processOperation(
            StrategiesType.REGEX, OperationsType.NOT_EXIST, 'USER_12', mock_values1);
        assert.isFalse(result);
    });

    it('should agree when expect to be equal using EQUAL operation', () => {
        const result = processOperation(
            StrategiesType.REGEX, OperationsType.EQUAL, 'USER_11', mock_values3);
        assert.isTrue(result);
    });

    it('should NOT agree when expect to be equal using EQUAL operation', () => {
        const result = processOperation(
            StrategiesType.REGEX, OperationsType.EQUAL, 'user-11', mock_values3);
        assert.isFalse(result);
    });

    it('should agree when expect to not be equal using NOT_EQUAL operation', () => {
        const result = processOperation(
            StrategiesType.REGEX, OperationsType.NOT_EQUAL, 'USER_123', mock_values3);
        assert.isTrue(result);
    });

    it('should NOT agree when expect to not be equal using NOT_EQUAL operation', () => {
        const result = processOperation(
            StrategiesType.REGEX, OperationsType.NOT_EQUAL, 'USER_1', mock_values3);
        assert.isFalse(result);
    });
});