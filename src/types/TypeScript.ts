/** biome-ignore-all lint/style/useNamingConvention: Built-in Types */

import type { IsoString } from "@/shared/Common";

declare global {
	interface Date {
		toISOString(): IsoString;
	}
}
