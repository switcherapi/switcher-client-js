export default class DateMoment {
    constructor(date, time) {
        this._date = new Date(date);
        this.setTime(time);
    }

    /**
     * Updates current date with the given time. 
     * Use hh:mm format
     */
    setTime(time) {
        if (time) {
            const timeArr = time.split(':');
            this._date.setHours(Number.parseInt(timeArr[0]));
            this._date.setMinutes(Number.parseInt(timeArr[1]));
        }
    }

    /**
     * Current date configured
     */
    getDate() {
        return this._date;
    }

    /**
     * It verifies if the configured date is before the given date/time
     */
    isSameOrBefore(date, time) {
        return this._date.getTime() <= 
            new DateMoment(date, time || undefined).getDate().getTime();
    }

    /**
     * It verifies if the configured date is after the given date/time
     */
    isSameOrAfter(date, time) {
        return this._date.getTime() >= 
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
                this._date.setTime(this._date.getTime() + amount * 1000);
                break;
            case 'm':
                this._date.setTime(this._date.getTime() + amount * 1000 * 60);
                break;
            case 'h':
                this._date.setTime(this._date.getTime() + amount * 1000 * 60 * 60);
                break;
            default:
                throw new Error(`Unit ${unit} not compatible - try [s, m or h]`);
        }

        return this;
    }
}