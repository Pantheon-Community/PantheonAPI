import type { AnyEndpoint } from "@/types/Express/Endpoint";
import { getIp } from "./getIp";
import { getRoot } from "./getRoot";

export const miscRoutes: AnyEndpoint[] = [getIp, getRoot];
