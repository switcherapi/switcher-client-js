import { assert } from 'chai';

import { processOperation, StrategiesType, OperationsType } from '../../src/lib/snapshot.js';
import { payloadReader } from '../../src/lib/utils/payloadReader.js';

describe('Processing strategy: PAYLOAD', () => {

    const fixture_1 = JSON.stringify({
        id: '1',
        login: 'petruki'
    });

    const fixture_values2 = JSON.stringify({
        product: 'product-1',
        order: {
            qty: 1,
            deliver: {
                expect: '2019-12-10',
                tracking: [
                    {
                        date: '2019-12-09',
                        status: 'sent'
                    },
                    {
                        date: '2019-12-10',
                        status: 'delivered',
                        comments: 'comments'
                    }
                ]
            }
        }
    });

    const fixture_values3 = JSON.stringify({
        description: 'Allowed IP address',
        strategy: 'NETWORK_VALIDATION',
        values: ['10.0.0.3/24'],
        operation: 'EXIST',
        env: 'default'
    });

    const givenStrategyConfig = (operation, values) => ({
        strategy: StrategiesType.PAYLOAD,
        operation: operation,
        values: values,
        activated: true,
    });

    it('should read keys from payload #1', () => {
        const keys = payloadReader(JSON.parse(fixture_values2));
        assert.deepEqual(keys, [                
            'product',
            'order',
            'order.qty',
            'order.deliver',
            'order.deliver.expect',        
            'order.deliver.tracking',      
            'order.deliver.tracking.date', 
            'order.deliver.tracking.status',
            'order.deliver.tracking.comments'
        ]);
    });

    it('should read keys from payload #2', () => {
        const keys = payloadReader(JSON.parse(fixture_values3));
        assert.deepEqual(keys, [                
            'description',
            'strategy',
            'values',
            'operation',
            'env'
        ]);
    });

    it('should read keys from payload with array values', () => {
        const keys = payloadReader({
            order: {
                items: ['item_1', 'item_2']
            }
        });
        assert.deepEqual(keys, [                
            'order',
            'order.items'
        ]);
    });

    it('should return TRUE when payload has field', () => {
        const strategyConfig = givenStrategyConfig(OperationsType.HAS_ONE, ['login']);
        assert.isTrue(processOperation(strategyConfig, fixture_1));
    });

    it('should return FALSE when payload does not have field', () => {
        const strategyConfig = givenStrategyConfig(OperationsType.HAS_ONE, ['user']);
        assert.isFalse(processOperation(strategyConfig, fixture_1));
    });

    it('should return TRUE when payload has nested field', () => {
        const strategyConfig = givenStrategyConfig(OperationsType.HAS_ONE, [
            'order.qty', 'order.total'
        ]);

        assert.isTrue(processOperation(strategyConfig, fixture_values2));
    });

    it('should return TRUE when payload has nested field with arrays', () => {
        const strategyConfig = givenStrategyConfig(OperationsType.HAS_ONE, [
            'order.deliver.tracking.status'
        ]);

        assert.isTrue(processOperation(strategyConfig, fixture_values2));
    });

    it('should return TRUE when payload has all', () => {
        const strategyConfig = givenStrategyConfig(OperationsType.HAS_ALL, [
            'product',
            'order',
            'order.qty',
            'order.deliver',
            'order.deliver.expect',        
            'order.deliver.tracking',      
            'order.deliver.tracking.date', 
            'order.deliver.tracking.status'
        ]);

        assert.isTrue(processOperation(strategyConfig, fixture_values2));
    });

    it('should return FALSE when payload does not have all', () => {
        const strategyConfig = givenStrategyConfig(OperationsType.HAS_ALL, [
            'product',
            'order',
            'order.NOT_EXIST_KEY',
        ]);

        assert.isFalse(processOperation(strategyConfig, fixture_values2));
    });

    it('should return FALSE when payload is not a JSON string', () => {
        const strategyConfig = givenStrategyConfig(OperationsType.HAS_ALL, []);
        assert.isFalse(processOperation(strategyConfig, 'NOT_JSON'));
    });
});