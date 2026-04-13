import { IP, type Ip } from "@/shared/types/Common";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { getFingerprint } from "@/utils/getFingerprint";

export const getIp: Endpoint<void, Ip | null> = {
    method: "get",
    path: "/ip",
    auth: AuthScope.None,
    description: "Returns IP address information, useful for debugging proxies.",
    returns: "IP address of request, may be `::` if viewing from the same network.",
    tag: "Miscellaneous",
    requestBody: null,
    responseBody: {
        schema: { ...IP.schema, nullable: true },
        validate: (input) => input === null || IP.validate(input),
    },
    pathParams: null,
    queryParams: null,
    handleRequest({ req }) {
        return getFingerprint(req).ip;
    },
};
