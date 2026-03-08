import { getDiscordToSteam } from "./getDiscordToSteam";
import { getSteamToDiscord } from "./getSteamToDiscord";
import { getSteamUserInfo } from "./getSteamUserInfo";

export const lookupRoutes = [getSteamToDiscord, getDiscordToSteam, getSteamUserInfo];
