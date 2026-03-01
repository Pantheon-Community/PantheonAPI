import { config } from "@/global/config";

const version = config.commitHash ? config.commitHash.slice(0, 7) : "unversioned";

export const discordUserAgent = `PantheonAPI (https://pantheoncommunity.org, ${version})` as const;
