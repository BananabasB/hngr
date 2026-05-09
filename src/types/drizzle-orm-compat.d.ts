declare module 'drizzle-orm/pg-core/columns' {
  export const text: any;
  export const timestamp: any;
  export const boolean: any;
  export const integer: any;
  export const jsonb: any;
  export const uuid: any;
}

declare module 'drizzle-orm/pg-core/unique-constraint' {
  export const unique: any;
}

declare module 'drizzle-orm/pg-core/indexes' {
  export const index: any;
}
