declare class Key {
  constructor(key: string);

  key: string;
  valaue: boolean;

  true(): void;
  false(): void;
  getKey(): string;
  getValue(): boolean;
}

export = Key;