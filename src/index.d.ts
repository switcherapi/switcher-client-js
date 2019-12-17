declare class Switcher {

  constructor(url: string, apiKey: string, domain: string, component: string, environment: string, offline?: boolean, snapshotLocation?: string);

  url: string;
  token: string;
  apiKey: string;
  domain: string;
  environment: string;
  key: string;
  input: string[];
  exp: number;
  offline: boolean;
  snapshotLocation: string;
  bypassedKeys: Key;
  
  validate(): void;
  prepare(key: string, input?: string[]): void;
  isItOn(key?: string, input?: string[]): boolean;
  assume(key: string): Key;
  forget(key: string): void;
}

declare class Key {

  constructor(key: string);

  key: string;
  valaue: boolean;

  true(): void;
  false(): void;
  getKey(): string;
  getValue(): boolean;
}

export = Switcher;