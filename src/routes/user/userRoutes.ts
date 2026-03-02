import { getMe } from "./getMe";
import { getMeSessions } from "./getMeSessions";
import { getMeSteamUsers } from "./getMeSteamUsers";

export const userRoutes = [getMe, getMeSteamUsers, getMeSessions];
