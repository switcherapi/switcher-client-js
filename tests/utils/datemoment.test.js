import { assert } from 'chai';
import DateMoment from '../../src/lib/utils/datemoment.js';

describe('Manipulate date and time', () => {

    it('should be true when the compared date is before', async () => {
        const todayMoment = new DateMoment(new Date(), '10:00');
        assert.isTrue(todayMoment.isSameOrBefore(todayMoment.getDate(), '11:00'));
    });

    it('should be false when the compared date is not before', async () => {
        const todayMoment = new DateMoment(new Date(), '10:00');
        assert.isFalse(todayMoment.isSameOrBefore(todayMoment.getDate(), '09:00'));
    });

    it('should be true when the compared date is after', async () => {
        const todayMoment = new DateMoment(new Date(), '10:00');
        assert.isTrue(todayMoment.isSameOrAfter(todayMoment.getDate(), '09:00'));
    });

    it('should be false when the compared date is not after', async () => {
        const todayMoment = new DateMoment(new Date(), '10:00');
        assert.isFalse(todayMoment.isSameOrAfter(todayMoment.getDate(), '11:00'));
    });

    it('should be true when the compared date is in between', async () => {
        const todayMoment = new DateMoment(new Date(), '10:00');
        assert.isTrue(todayMoment.isBetween(todayMoment.getDate(), todayMoment.getDate(), '09:00', '10:30'));
    });

    it('should be false when the compared date is not in between', async () => {
        const todayMoment = new DateMoment(new Date(), '10:00');
        assert.isFalse(todayMoment.isBetween(todayMoment.getDate(), todayMoment.getDate(), '10:01', '10:30'));
    });

    it('should add 1 second to date', async () => {
        const todayMoment = new DateMoment(new Date(), '10:00');
        const beforeAdding = todayMoment.getDate().getSeconds();
        const afterAdding = todayMoment.add(1, 's').getDate().getSeconds();
        const diff = afterAdding - beforeAdding;
        assert.isTrue(diff == 1);
    });

    it('should add 1 minute to date', async () => {
        const todayMoment = new DateMoment(new Date(), '10:00');
        const beforeAdding = todayMoment.getDate().getMinutes();
        const afterAdding = todayMoment.add(1, 'm').getDate().getMinutes();
        assert.isTrue((afterAdding - beforeAdding) == 1);
    });

    it('should add 1 hour to date', async () => {
        const todayMoment = new DateMoment(new Date(), '10:00');
        const beforeAdding = todayMoment.getDate().getHours();
        const afterAdding = todayMoment.add(1, 'h').getDate().getHours();
        assert.isTrue((afterAdding - beforeAdding) == 1);
    });

    it('should return error for using not compatible unit', async () => {
        const todayMoment = new DateMoment(new Date(), '10:00');
        assert.throws(() => todayMoment.add(1, 'x'), 'Unit x not compatible - try [s, m or h]');
    });

});