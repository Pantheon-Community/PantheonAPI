import { postLogin } from "./postLogin";
import { postLogout } from "./postLogout";
import { postRefresh } from "./postRefresh";

export const authRoutes = [postLogin, postLogout, postRefresh];
