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
import { getAdminPublicEventCatalog } from "./public-events/admin/catalog/getAdminPublicEventCatalog";
import { patchAdminPublicEventCatalog } from "./public-events/admin/catalog/id/patchAdminPublicEventCatalog";
import { postAdminPublicEventCatalog } from "./public-events/admin/catalog/postAdminPublicEventCatalog";
import { getAdminPublicEventOrders } from "./public-events/admin/orders/getAdminPublicEventOrders";
import { postAdminPublicEventReconcile } from "./public-events/admin/orders/id/postAdminPublicEventReconcile";
import { getAdminPublicEventServers } from "./public-events/admin/servers/getAdminPublicEventServers";
import { patchAdminPublicEventServer } from "./public-events/admin/servers/id/patchAdminPublicEventServer";
import { getPublicEventCatalog } from "./public-events/getPublicEventCatalog";
import { getPublicEventQueue } from "./public-events/getPublicEventQueue";
import { getPublicEventServers } from "./public-events/getPublicEventServers";
import { postPublicEventHeartbeat } from "./public-events/servers/id/postPublicEventHeartbeat";
import { postPublicEventRound } from "./public-events/servers/id/postPublicEventRound";
import { postPublicEventStart } from "./public-events/servers/id/orders/id/postPublicEventStart";
import { postPublicEventResult } from "./public-events/servers/id/orders/id/postPublicEventResult";
import { getRoles } from "./roles/getRoles";
import { deleteRole } from "./roles/id/deleteRole";
import { patchRole } from "./roles/id/patchRole";
import { postRoles } from "./roles/postRoles";
import { deleteUserRole } from "./users/id/deleteUserRole";
import { patchUserBalance } from "./users/id/patchUserBalance";
import { postUserPayoutSpecial } from "./users/id/postUserPayoutSpecials";
import { putUserBalance } from "./users/id/putUserBalance";
import { putUserRole } from "./users/id/putUserRole";
import { deleteMePendingTransaction } from "./users/me/deleteMePendingTransaction";
import { deleteMeSession } from "./users/me/deleteMeSession";
import { deleteMeSteamUsersPrimary } from "./users/me/deleteMeSteamUsersPrimary";
import { getMe } from "./users/me/getMe";
import { getMeCompletedTransactions } from "./users/me/getMeCompletedTransactions";
import { getMePendingTransactions } from "./users/me/getMePendingTransactions";
import { getMeRoles } from "./users/me/getMeRoles";
import { getMeSessions } from "./users/me/getMeSessions";
import { getMeSteamUsers } from "./users/me/getMeSteamUsers";
import { postMePendingTransactions } from "./users/me/postMePendingTransactions";
import { postMePublicEvents } from "./users/me/postMePublicEvents";
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
    // public-events (public)
    getPublicEventCatalog,
    getPublicEventServers,
    getPublicEventQueue,
    // public-events/admin/catalog/id
    patchAdminPublicEventCatalog,
    // public-events/admin/catalog
    getAdminPublicEventCatalog,
    postAdminPublicEventCatalog,
    // public-events/admin/orders/id
    postAdminPublicEventReconcile,
    // public-events/admin/orders
    getAdminPublicEventOrders,
    // public-events/admin/servers/id
    patchAdminPublicEventServer,
    // public-events/admin/servers
    getAdminPublicEventServers,
    // public-events/servers/:serverId/orders/:orderId
    postPublicEventStart,
    postPublicEventResult,
    // public-events/servers/:serverId
    postPublicEventHeartbeat,
    postPublicEventRound,
    // roles/id
    deleteRole,
    patchRole,
    // roles
    getRoles,
    postRoles,
    // users/id
    deleteUserRole,
    putUserRole,
    // users/id/balance
    putUserBalance,
    patchUserBalance,
    // users/id/special-rewards/:id
    postUserPayoutSpecial,
    // users/me
    deleteMePendingTransaction,
    deleteMeSession,
    deleteMeSteamUsersPrimary,
    getMe,
    getMeCompletedTransactions,
    getMePendingTransactions,
    getMeRoles,
    getMeSessions,
    getMeSteamUsers,
    postMePendingTransactions,
    postMePublicEvents,
    putMeSteamUsersPrimary,
];
