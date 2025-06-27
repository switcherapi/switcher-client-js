/**
 * SwitcherResult represents the result of the criteria evaluation.
 * It represents:
 *
 * - `result`: a boolean indicating if the criteria was met.
 * - `reason`: an optional string providing a reason for the result.
 * - `metadata`: an optional object containing additional metadata about the result.
 */
export class SwitcherResult {
  #result;
  #reason;
  #metadata;

  constructor(result = false, reason = undefined, metadata = undefined) {
    this.#result = result;
    this.#reason = reason;
    this.#metadata = metadata;
  }

  static create(result = false, reason = undefined, metadata = undefined) {
    return new SwitcherResult(result, reason, metadata);
  }

  static enabled(reason = 'Success', metadata = undefined) {
    return new SwitcherResult(true, reason, metadata);
  }

  static disabled(reason = undefined, metadata = undefined) {
    return new SwitcherResult(false, reason, metadata);
  }

  /**
   * Returns the object as a JSON representation
   * This method is automatically called when JSON.stringify() is used
   */
  toJSON() {
    return {
      result: this.#result,
      reason: this.#reason,
      metadata: this.#metadata,
    };
  }

  /**
   * @returns {boolean} - Returns true if the result is successful.
   */
  get result() {
    return this.#result;
  }

  /**
   * @returns {string | undefined} - Returns the reason for the result, if any.
   */
  get reason() {
    return this.#reason;
  }

  /**
   * @returns {object | undefined} - Returns additional metadata about the result, if any.
   */
  get metadata() {
    return this.#metadata;
  }
}
