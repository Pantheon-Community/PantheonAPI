import type { Brand } from "@/shared/types/Util";

export function castNumber<T extends string>(x: string): Brand<number, T> {
    return Number(x) as Brand<number, T>;
}
