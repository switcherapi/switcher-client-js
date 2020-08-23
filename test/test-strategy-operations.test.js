"use strict"

const assert = require('chai').assert

const {
    processOperation,
    StrategiesType,
    OperationsType
} = require('../src/utils/index');

describe('Processing strategy: NETWORK', () => {

    const mock_values1 = [
        '10.0.0.0/30'
    ]

    const mock_values2 = [
        '10.0.0.0/30', '192.168.0.0/30'
    ]

    const mock_values3 = [
        '192.168.56.56',
        '192.168.56.57',
        '192.168.56.58'
    ]

    it('Should agree when input range EXIST', async () => {
        const result = await processOperation(
            StrategiesType.NETWORK, OperationsType.EXIST, '10.0.0.3', mock_values1);
        assert.isTrue(result);
    })

    it('Should NOT agree when input range DOES NOT EXIST', async () => {
        const result = await processOperation(
            StrategiesType.NETWORK, OperationsType.EXIST, '10.0.0.4', mock_values1);
        assert.isFalse(result);
    })

    it('Should agree when input DOES NOT EXIST', async () => {
        const result = await processOperation(
            StrategiesType.NETWORK, OperationsType.NOT_EXIST, '10.0.0.4', mock_values1);
        assert.isTrue(result);
    })

    it('Should NOT agree when input EXIST but assumed that it DOES NOT EXIST', async () => {
        const result = await processOperation(
            StrategiesType.NETWORK, OperationsType.NOT_EXIST, '10.0.0.3', mock_values1);
        assert.isFalse(result);
    })

    it('Should agree when input IP EXIST', async () => {
        const result = await processOperation(
            StrategiesType.NETWORK, OperationsType.EXIST, '192.168.56.58', mock_values3);
        assert.isTrue(result);
    })

    it('Should agree when input IP DOES NOT EXIST', async () => {
        const result = await processOperation(
            StrategiesType.NETWORK, OperationsType.NOT_EXIST, '192.168.56.50', mock_values3);
        assert.isTrue(result);
    })

    it('Should agree when input range EXIST for multiple ranges', async () => {
        const result = await processOperation(
            StrategiesType.NETWORK, OperationsType.EXIST, '192.168.0.3', mock_values2);
        assert.isTrue(result);
    })

    it('Should NOT agree when input range DOES NOT EXIST for multiple ranges', async () => {
        const result = await processOperation(
            StrategiesType.NETWORK, OperationsType.NOT_EXIST, '127.0.0.0', mock_values2);
        assert.isTrue(result);
    })

})

describe('Processing strategy: VALUE', () => {
    const mock_values1 = [
        'USER_1'
    ]

    const mock_values2 = [
        'USER_1', 'USER_2'
    ]

    it('Should agree when input EXIST', () => {
        const result = processOperation(
            StrategiesType.VALUE, OperationsType.EXIST, 'USER_1', mock_values1);
        assert.isTrue(result);
    })

    it('Should NOT agree when input DOES NOT EXIST', () => {
        const result = processOperation(
            StrategiesType.VALUE, OperationsType.EXIST, 'USER_123', mock_values1);
        assert.isFalse(result);
    })

    it('Should agree when input DOES NOT EXIST', () => {
        const result = processOperation(
            StrategiesType.VALUE, OperationsType.NOT_EXIST, 'USER_123', mock_values1);
        assert.isTrue(result);
    })

    it('Should agree when input is EQUAL', () => {
        const result = processOperation(
            StrategiesType.VALUE, OperationsType.EQUAL, 'USER_1', mock_values1);
        assert.isTrue(result);
    })

    it('Should NOT agree when input is NOT EQUAL', () => {
        const result = processOperation(
            StrategiesType.VALUE, OperationsType.EQUAL, 'USER_2', mock_values1);
        assert.isFalse(result);
    })

    it('Should agree when input is NOT EQUAL', () => {
        const result = processOperation(
            StrategiesType.VALUE, OperationsType.NOT_EQUAL, 'USER_123', mock_values2);
        assert.isTrue(result);
    })

    it('Should NOT agree when input is NOT EQUAL', () => {
        const result = processOperation(
            StrategiesType.VALUE, OperationsType.NOT_EQUAL, 'USER_2', mock_values2);
        assert.isFalse(result);
    })
})

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

    it('Should agree when input EXIST in values', () => {
        const result = processOperation(
            StrategiesType.NUMERIC, OperationsType.EXIST, '3', mock_values2);
        assert.isTrue(result);
    })

    it('Should NOT agree when input exist but test as DOES NOT EXIST ', () => {
        const result = processOperation(
            StrategiesType.NUMERIC, OperationsType.NOT_EXIST, '1', mock_values2);
        assert.isFalse(result);
    })

    it('Should agree when input DOES NOT EXIST in values', () => {
        const result = processOperation(
            StrategiesType.NUMERIC, OperationsType.NOT_EXIST, '2', mock_values2);
        assert.isTrue(result);
    })

    it('Should agree when input is EQUAL to value', () => {
        const result = processOperation(
            StrategiesType.NUMERIC, OperationsType.EQUAL, '1', mock_values1);
        assert.isTrue(result);
    })

    it('Should NOT agree when input is not equal but test as EQUAL', () => {
        const result = processOperation(
            StrategiesType.NUMERIC, OperationsType.EQUAL, '2', mock_values1);
            assert.isFalse(result);
    })

    it('Should agree when input is NOT EQUAL to value', () => {
        const result = processOperation(
            StrategiesType.NUMERIC, OperationsType.NOT_EQUAL, '2', mock_values1);
        assert.isTrue(result);
    })

    it('Should agree when input is GREATER than value', () => {
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
    })

    it('Should NOT agree when input is lower but tested as GREATER than value', () => {
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
    })

    it('Should agree when input is LOWER than value', () => {
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
    })

    it('Should agree when input is BETWEEN values', () => {
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
    })
})

describe('Processing strategy: TIME', () => {
    const mock_values1 = [
        '08:00'
    ]

    const mock_values2 = [
        '08:00', '10:00'
    ]

    it('Should agree when input is LOWER', () => {
        const result = processOperation(
            StrategiesType.TIME, OperationsType.LOWER, '06:00', mock_values1);
        assert.isTrue(result);
    })

    it('Should agree when input is LOWER or SAME', () => {
        const result = processOperation(
            StrategiesType.TIME, OperationsType.LOWER, '08:00', mock_values1);
        assert.isTrue(result);
    })

    it('Should NOT agree when input is NOT LOWER', () => {
        const result = processOperation(
            StrategiesType.TIME, OperationsType.LOWER, '10:00', mock_values1);
        assert.isFalse(result);
    })

    it('Should agree when input is GREATER', () => {
        const result = processOperation(
            StrategiesType.TIME, OperationsType.GREATER, '10:00', mock_values1);
        assert.isTrue(result);
    })

    it('Should agree when input is GREATER or SAME', () => {
        const result = processOperation(
            StrategiesType.TIME, OperationsType.GREATER, '08:00', mock_values1);
        assert.isTrue(result);
    })

    it('Should NOT agree when input is NOT GREATER', () => {
        const result = processOperation(
            StrategiesType.TIME, OperationsType.GREATER, '06:00', mock_values1);
        assert.isFalse(result);
    })

    it('Should agree when input is in BETWEEN', () => {
        const result = processOperation(
            StrategiesType.TIME, OperationsType.BETWEEN, '09:00', mock_values2);
        assert.isTrue(result);
    })

    it('Should NOT agree when input is NOT in BETWEEN', () => {
        const result = processOperation(
            StrategiesType.TIME, OperationsType.BETWEEN, '07:00', mock_values2);
        assert.isFalse(result);
    })

})

describe('Processing strategy: DATE', () => {
    const mock_values1 = [
        '2019-12-01'
    ]

    const mock_values2 = [
        '2019-12-01', '2019-12-05'
    ]

    const mock_values3 = [
        '2019-12-01T08:30'
    ]

    it('Should agree when input is LOWER', () => {
        const result = processOperation(
            StrategiesType.DATE, OperationsType.LOWER, '2019-11-26', mock_values1);
        assert.isTrue(result);
    })

    it('Should agree when input is LOWER or SAME', () => {
        const result = processOperation(
            StrategiesType.DATE, OperationsType.LOWER, '2019-12-01', mock_values1);
        assert.isTrue(result);
    })

    it('Should NOT agree when input is NOT LOWER', () => {
        const result = processOperation(
            StrategiesType.DATE, OperationsType.LOWER, '2019-12-02', mock_values1);
        assert.isFalse(result);
    })

    it('Should agree when input is GREATER', () => {
        const result = processOperation(
            StrategiesType.DATE, OperationsType.GREATER, '2019-12-02', mock_values1);
        assert.isTrue(result);
    })

    it('Should agree when input is GREATER or SAME', () => {
        const result = processOperation(
            StrategiesType.DATE, OperationsType.GREATER, '2019-12-01', mock_values1);
        assert.isTrue(result);
    })

    it('Should NOT agree when input is NOT GREATER', () => {
        const result = processOperation(
            StrategiesType.DATE, OperationsType.GREATER, '2019-11-10', mock_values1);
        assert.isFalse(result);
    })

    it('Should agree when input is in BETWEEN', () => {
        const result = processOperation(
            StrategiesType.DATE, OperationsType.BETWEEN, '2019-12-03', mock_values2);
        assert.isTrue(result);
    })

    it('Should NOT agree when input is NOT in BETWEEN', () => {
        const result = processOperation(
            StrategiesType.DATE, OperationsType.BETWEEN, '2019-12-12', mock_values2);
        assert.isFalse(result);
    })

    it('Should agree when input is LOWER including time', () => {
        const result = processOperation(
            StrategiesType.DATE, OperationsType.LOWER, '2019-12-01T07:00', mock_values3);
        assert.isTrue(result);
    })

    it('Should NOT agree when input is NOT LOWER including time', () => {
        const result = processOperation(
            StrategiesType.DATE, OperationsType.LOWER, '2019-12-01T07:00', mock_values1);
        assert.isFalse(result);
    })

    it('Should agree when input is GREATER including time', () => {
        const result = processOperation(
            StrategiesType.DATE, OperationsType.GREATER, '2019-12-01T08:40', mock_values3);
        assert.isTrue(result);
    })

})

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

    it('UNIT_STRATEGY_SUITE - Should agree when expect to exist using EXIST operation', () => {
        let result = processOperation(
            StrategiesType.REGEX, OperationsType.EXIST, 'USER_1', mock_values1);
        assert.isTrue(result);

        result = processOperation(
            StrategiesType.REGEX, OperationsType.EXIST, 'user-01', mock_values2);
        assert.isTrue(result);
    })

    it('UNIT_STRATEGY_SUITE - Should NOT agree when expect to exist using EXIST operation', () => {
        let result = processOperation(
            StrategiesType.REGEX, OperationsType.EXIST, 'USER_123', mock_values1);
        assert.isFalse(result);

        //mock_values3 does not require exact match
        result = processOperation(
            StrategiesType.REGEX, OperationsType.EXIST, 'USER_123', mock_values3);
        assert.isTrue(result);
    })

    it('UNIT_STRATEGY_SUITE - Should agree when expect to not exist using NOT_EXIST operation', () => {
        let result = processOperation(
            StrategiesType.REGEX, OperationsType.NOT_EXIST, 'USER_123', mock_values1);
        assert.isTrue(result);

        result = processOperation(
            StrategiesType.REGEX, OperationsType.NOT_EXIST, 'user-123', mock_values2);
        assert.isTrue(result);
    })

    it('UNIT_STRATEGY_SUITE - Should NOT agree when expect to not exist using NOT_EXIST operation', () => {
        const result = processOperation(
            StrategiesType.REGEX, OperationsType.NOT_EXIST, 'USER_12', mock_values1);
        assert.isFalse(result);
    })

    it('UNIT_STRATEGY_SUITE - Should agree when expect to be equal using EQUAL operation', () => {
        const result = processOperation(
            StrategiesType.REGEX, OperationsType.EQUAL, 'USER_11', mock_values3);
        assert.isTrue(result);
    })

    it('UNIT_STRATEGY_SUITE - Should NOT agree when expect to be equal using EQUAL operation', () => {
        const result = processOperation(
            StrategiesType.REGEX, OperationsType.EQUAL, 'user-11', mock_values3);
        assert.isFalse(result);
    })

    it('UNIT_STRATEGY_SUITE - Should agree when expect to not be equal using NOT_EQUAL operation', () => {
        const result = processOperation(
            StrategiesType.REGEX, OperationsType.NOT_EQUAL, 'USER_123', mock_values3);
        assert.isTrue(result);
    })

    it('UNIT_STRATEGY_SUITE - Should NOT agree when expect to not be equal using NOT_EQUAL operation', () => {
        const result = processOperation(
            StrategiesType.REGEX, OperationsType.NOT_EQUAL, 'USER_1', mock_values3);
        assert.isFalse(result);
    })
})