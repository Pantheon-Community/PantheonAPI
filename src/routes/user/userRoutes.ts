import type { AnyEndpoint } from "@/types/Express/Endpoint";
import { deleteMeSteamUsersPrimary } from "./deleteMeSteamUsersPrimary";
import { getMe } from "./getMe";
import { getMeSessions } from "./getMeSessions";
import { getMeSteamUsers } from "./getMeSteamUsers";
import { putMeSteamUsersPrimary } from "./putMeSteamUsersPrimary";

export const userRoutes: AnyEndpoint[] = [
    getMe,
    getMeSteamUsers,
    getMeSessions,
    putMeSteamUsersPrimary,
    deleteMeSteamUsersPrimary,
];
