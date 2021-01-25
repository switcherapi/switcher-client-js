'use strict';

class DateMoment {
    constructor(date, time) {
        this.date = new Date(date);
        this.setTime(time);
    }

    /**
     * Updates current date with the given time. 
     * Use hh:mm format
     */
    setTime(time) {
        if (time) {
            const timeArr = time.split(':');
            this.date.setHours(Number.parseInt(timeArr[0]));
            this.date.setMinutes(Number.parseInt(timeArr[1]));
        }
    }

    /**
     * Current date configured
     */
    getDate() {
        return this.date;
    }

    /**
     * It verifies if the configured date is before the given date/time
     */
    isSameOrBefore(date, time) {
        return this.date.getTime() <= 
            new DateMoment(date, time || undefined).getDate().getTime();
    }

    /**
     * It verifies if the configured date is after the given date/time
     */
    isSameOrAfter(date, time) {
        return this.date.getTime() >= 
            new DateMoment(date, time || undefined).getDate().getTime();
    }

    /**
     * It verifies if the configured date is in between the given date/time (A/B)
     */
    isBetween(dateA, dateB, timeA, timeB) {
        return this.isSameOrAfter(dateA, timeA || undefined) && 
            this.isSameOrBefore(dateB, timeB || undefined);
    }

    /**
     * Add time to the configured date based on the unit
     * 
     * @param {*} amount 
     * @param {*} unit 
     */
    add(amount, unit) {
        switch (unit.toLowerCase()) {
            case 's':
                this.date.setTime(this.date.getTime() + amount * 1000);
                break;
            case 'm':
                this.date.setTime(this.date.getTime() + amount * 1000 * 60);
                break;
            case 'h':
                this.date.setTime(this.date.getTime() + amount * 1000 * 60 * 60);
                break;
            default:
                throw new Error(`Unit ${unit} not compatible - try [s, m or h]`);
        }

        return this;
    }
}

module.exports = DateMoment;