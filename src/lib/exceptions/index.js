export class ClientError extends Error {
  constructor(message) {
    super(`Something went wrong: ${message}`);
    this.name = this.constructor.name;
  }
}

export class RemoteError extends ClientError {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class CheckSwitcherError extends ClientError {
  constructor(notFound) {
    super(`[${notFound}] not found`);
    this.name = this.constructor.name;
  }
}
