export function typedEntries<T extends object>(object: T): [string, T[keyof T]][] {
    return Object.entries(object);
}
