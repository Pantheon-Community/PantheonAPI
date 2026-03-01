import { Color } from "@/types/Color";

/** Wraps a string inside the given colour. */
export function colorize(string: string, color: Color): string {
	return `${color}${string}${Color.Reset}`;
}
