import type { AnyEndpoint } from "@/types/Express/Endpoint";
import { postLogin } from "./postLogin";
import { postLogout } from "./postLogout";
import { postRefresh } from "./postRefresh";

export const authRoutes: AnyEndpoint[] = [postLogin, postLogout, postRefresh];
