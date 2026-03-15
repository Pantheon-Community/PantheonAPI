import type { AnyEndpoint } from "@/types/Express/Endpoint";
import { deleteMeSession } from "./deleteMeSession";
import { deleteMeSteamUsersPrimary } from "./deleteMeSteamUsersPrimary";
import { getMe } from "./getMe";
import { getMeRoles } from "./getMeRoles";
import { getMeSessions } from "./getMeSessions";
import { getMeSteamUsers } from "./getMeSteamUsers";
import { putMeSteamUsersPrimary } from "./putMeSteamUsersPrimary";

export const userRoutes: AnyEndpoint[] = [
    getMe,
    getMeSteamUsers,
    getMeSessions,
    putMeSteamUsersPrimary,
    deleteMeSteamUsersPrimary,
    deleteMeSession,
    getMeRoles,
];
