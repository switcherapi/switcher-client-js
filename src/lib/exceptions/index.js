export class AuthError extends Error {
    constructor(message) {
        super(`Something went wrong: ${message}`);
        this.name = this.constructor.name;
    }
}

export class CriteriaError extends Error {
    constructor(message) {
        super(`Something went wrong: ${message}`);
        this.name = this.constructor.name;
    }
}

export class CheckSwitcherError extends Error {
    constructor(notFound) {
        super(`Something went wrong: [${notFound}] not found`);
        this.name = this.constructor.name;
    }
}

export class SnapshotServiceError extends Error {
    constructor(message) {
        super(`Something went wrong: ${message}`);
        this.name = this.constructor.name;
    }
}

export class SnapshotNotFoundError extends Error {
    constructor(message) {
      super(`Something went wrong: ${message}`);
      this.name = this.constructor.name;
    }
}