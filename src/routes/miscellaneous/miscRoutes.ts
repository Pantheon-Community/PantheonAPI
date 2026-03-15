import type { AnyEndpoint } from "@/types/Express/Endpoint";
import { getIp } from "./getIp";
import { getRoles } from "./getRoles";

export const miscRoutes: AnyEndpoint[] = [getIp, getRoles];
