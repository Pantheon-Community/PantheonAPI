import type { SteamId64 } from "@/shared/types/SteamUser";
import type { SteamUserInfo } from "@/types/SteamUserInfo";

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

export async function getSteamUserInfo(id: SteamId64): Promise<SteamUserInfo> {
    const response = await fetch(`https://steamcommunity.com/profiles/${id}/?xml=1`);

    const data = await response.text();

    const memberSince = getXmlTagContents(data, "memberSince");

    return {
        avatar: getXmlTagContents(data, "avatarFull"),
        location: getXmlTagContents(data, "location"),
        memberSince: memberSince !== null ? new Date(memberSince) : null,
    };
}
