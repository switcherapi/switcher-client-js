class ApiConnectionError extends Error {
    constructor(message) {
        super(`Something went wrong: ${message}`);
        this.name = this.constructor.name;
    }
}

class AuthError extends Error {
    constructor(message) {
        super(`Something went wrong: ${message}`);
        this.name = this.constructor.name;
    }
}

class CriteriaError extends Error {
    constructor(message) {
        super(`Something went wrong: ${message}`);
        this.name = this.constructor.name;
    }
}

class CheckSwitcherError extends Error {
    constructor(notFound) {
        super(`Something went wrong: [${notFound}] not found`);
        this.name = this.constructor.name;
    }
}

class SnapshotServiceError extends Error {
    constructor(message) {
        super(`Something went wrong: ${message}`);
        this.name = this.constructor.name;
    }
}

module.exports = {
    ApiConnectionError,
    AuthError,
    CriteriaError,
    CheckSwitcherError,
    SnapshotServiceError
};