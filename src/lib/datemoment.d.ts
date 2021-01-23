declare class DateMoment {
  
  constructor(date: Date, time: string);
  
  date: Date;
  time: string;

  /**
   * Updates current date with the given time. 
   * Use hh:mm format
   */
  setTime(time: string): void

  /**
   * Current date configured
   */
  getDate(): Date

  /**
   * It verifies if the configured date is before the given date/time
   */
  isSameOrBefore(date: Date, time: string): boolean

  /**
   * It verifies if the configured date is after the given date/time
   */
  isSameOrAfter(date: Date, time: string): boolean

  /**
   * It verifies if the configured date is in between the given date/time (A/B)
   */
  isBetween(dateA: Date, dateB: Date, timeA: string, timeB: string): boolean

  /**
   * Add time to the configured date based on the unit
   */
  add(amount: string | number, unit: string): DateMoment
}

export = DateMoment;