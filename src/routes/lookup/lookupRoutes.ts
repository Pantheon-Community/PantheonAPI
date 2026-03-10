import type { AnyEndpoint } from "@/types/Express/Endpoint";
import { getDiscordToSteam } from "./getDiscordToSteam";
import { getSteamToDiscord } from "./getSteamToDiscord";

export const lookupRoutes: AnyEndpoint[] = [getSteamToDiscord, getDiscordToSteam];
