/** Makes optional keys  nullable. */
export type WithNull<T> = { [K in keyof T]: undefined extends T[K] ? T[K] | null : T[K] };
