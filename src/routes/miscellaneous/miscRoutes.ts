import type { AnyEndpoint } from "@/types/Express/Endpoint";
import { getIp } from "./getIp";

export const miscRoutes: AnyEndpoint[] = [getIp];
