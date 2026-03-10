import { config } from "@/global/config";

const version = config.commitHash || "unversioned";

export const discordUserAgent = `PantheonAPI (https://pantheoncommunity.org, ${version})` as const;
