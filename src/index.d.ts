declare class Switcher {

  constructor(
    url: string, 
    apiKey: string, 
    domain: string, 
    component: string, 
    environment: string, 
    options?: SwitcherOptions);

  url: string;
  token: string;
  apiKey: string;
  domain: string;
  environment: string;
  key: string;
  input: string[];
  exp: number;
  bypassedKeys: Key;
  snapshot?: string;
  
  validate(): void;
  prepare(key: string, input?: string[]): void;
  isItOn(key?: string, input?: string[]): boolean;
  isItOnPromise(key?: string, input?: string[]): Promise<boolean>;
  assume(key: string): Key;
  forget(key: string): void;
  loadSnapshot(): void;
  unloadSnapshot(): void;
}

declare interface SwitcherOptions {
  offline: boolean;
  snapshotLocation: string;
  silentMode: boolean;
  retryAfter: string;
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