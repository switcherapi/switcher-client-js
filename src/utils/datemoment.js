class DateMoment {
    constructor(date, time) {
        this.date = new Date(date);
        this.setTime(time);
    }

    setTime(time) {
        if (time) {
            const timeArr = time.split(':');
            this.date.setHours(Number.parseInt(timeArr[0]));
            this.date.setMinutes(Number.parseInt(timeArr[1]));
        }
    }

    getDate() {
        return this.date;
    }

    isSameOrBefore(date, time) {
        return this.date.getTime() <= 
            new DateMoment(date, time || undefined).getDate().getTime();
    }

    isSameOrAfter(date, time) {
        return this.date.getTime() >= 
            new DateMoment(date, time || undefined).getDate().getTime();
    }

    isBetween(dateA, dateB, timeA, timeB) {
        return this.isSameOrAfter(dateA, timeA || undefined) && 
            this.isSameOrBefore(dateB, timeB || undefined);
    }

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