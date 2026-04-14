import type { AnyEndpoint } from "@/types/Express/Endpoint";
import { postLogin } from "./auth/postLogin";
import { postLogout } from "./auth/postLogout";
import { postRefresh } from "./auth/postRefresh";
import { deletePendingTransactions } from "./economy/deletePendingTransactions";
import { postEarnings } from "./economy/earnings/postEarnings";
import { getPendingTransactions } from "./economy/getPendingTransactions";
import { getRewards } from "./economy/rewards/getRewards";
import { deleteReward } from "./economy/rewards/id/deleteReward";
import { patchReward } from "./economy/rewards/id/patchReward";
import { postRewards } from "./economy/rewards/postRewards";
import { getDiscordToSteam } from "./lookups/getDiscordToSteam";
import { getSteamDirect } from "./lookups/getSteamDirect";
import { getSteamToDiscord } from "./lookups/getSteamToDiscord";
import { getIp } from "./miscellaneous/getIp";
import { getPluginTokens } from "./plugins/getPluginTokens";
import { deletePluginToken } from "./plugins/id/deletePluginToken";
import { patchPluginToken } from "./plugins/id/patchPluginToken";
import { postPluginTokens } from "./plugins/postPluginTokens";
import { postPluginTokensCheck } from "./plugins/postPluginTokensCheck";
import { getRoles } from "./roles/getRoles";
import { deleteRole } from "./roles/id/deleteRole";
import { patchRole } from "./roles/id/patchRole";
import { postRoles } from "./roles/postRoles";
import { deleteUserRole } from "./users/id/deleteUserRole";
import { putUserRole } from "./users/id/putUserRole";
import { deleteMeSession } from "./users/me/deleteMeSession";
import { deleteMeSteamUsersPrimary } from "./users/me/deleteMeSteamUsersPrimary";
import { getMe } from "./users/me/getMe";
import { getMeCompletedTransactions } from "./users/me/getMeCompletedTransactions";
import { getMePendingTransactions } from "./users/me/getMePendingTransactions";
import { getMeRoles } from "./users/me/getMeRoles";
import { getMeSessions } from "./users/me/getMeSessions";
import { getMeSteamUsers } from "./users/me/getMeSteamUsers";
import { postMePendingTransactions } from "./users/me/postMePendingTransactions";
import { putMeSteamUsersPrimary } from "./users/me/putMeSteamUsersPrimary";

export const allRoutes: AnyEndpoint[] = [
    // auth
    postLogin,
    postLogout,
    postRefresh,
    // economy/earnings
    postEarnings,
    // economy/rewards/id
    deleteReward,
    patchReward,
    // economy/rewards
    getRewards,
    postRewards,
    // economy/pending-transactions
    deletePendingTransactions,
    getPendingTransactions,
    // lookups
    getDiscordToSteam,
    getSteamDirect,
    getSteamToDiscord,
    // miscellaneous
    getIp,
    // plugins/id
    deletePluginToken,
    patchPluginToken,
    // plugins
    getPluginTokens,
    postPluginTokens,
    postPluginTokensCheck,
    // roles/id
    deleteRole,
    patchRole,
    // roles
    getRoles,
    postRoles,
    // users/id
    deleteUserRole,
    putUserRole,
    // users/me
    deleteMeSession,
    deleteMeSteamUsersPrimary,
    getMe,
    getMeCompletedTransactions,
    getMePendingTransactions,
    getMeRoles,
    getMeSessions,
    getMeSteamUsers,
    postMePendingTransactions,
    putMeSteamUsersPrimary,
];
