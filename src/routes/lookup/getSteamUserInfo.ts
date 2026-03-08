import { SecondaryRequestError } from "@/errors/SecondaryRequestError";
import type { SteamId64 } from "@/shared/types/Common";
import type { SteamUserInfo } from "@/shared/types/SteamUserInfo";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";

interface PathParams {
    id: SteamId64;
}

function getXmlTagContents(source: string, tagName: string): string | null {
    const openingTag = `<${tagName}>`;
    const closingTag = `</${tagName}>`;

    let startIndex = source.indexOf(openingTag);

    if (startIndex === -1) {
        return null;
    }

    startIndex += openingTag.length;

    const endIndex = source.indexOf(closingTag, startIndex);

    if (endIndex === -1) {
        return null;
    }

    let text = source.slice(startIndex, endIndex);

    if (text.startsWith("<![CDATA[") && text.endsWith("]]>")) {
        text = text.slice(9, -3);
    }

    return text.trim() || null;
}

export const getSteamUserInfo: Endpoint<void, SteamUserInfo, PathParams> = {
    method: "get",
    path: "/lookup/steam-users/:id",
    auth: AuthScope.None,
    async handleRequest({ req, res, timer }) {
        try {
            let response: Response;

            {
                using _ = timer.create(fetch);

                response = await fetch(
                    `https://steamcommunity.com/profiles/${req.params.id}/?xml=1`,
                );
            }

            const data = await response.text();

            const memberSince = getXmlTagContents(data, "memberSince");

            timer
                .addTo(res)
                .status(200)
                .json({
                    avatarFull: getXmlTagContents(data, "avatarFull"),
                    location: getXmlTagContents(data, "location"),
                    memberSince: memberSince !== null ? new Date(memberSince).toISOString() : null,
                });
        } catch (error) {
            throw new SecondaryRequestError(
                {
                    title: "Steam Fetch Failure",
                    description: "Failed to fetch profile data from the Steam API.",
                },
                error,
            );
        }
    },
};
