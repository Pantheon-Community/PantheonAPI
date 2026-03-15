import type { AnyEndpoint } from "@/types/Express/Endpoint";
import { getRoles } from "./getRoles";
import { putRole } from "./putRole";

export const roleRoutes: AnyEndpoint[] = [getRoles, putRole];
