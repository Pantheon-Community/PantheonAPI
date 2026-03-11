import type { Ip } from "@/shared/types/Common";
import { RequestMethod } from "@/shared/types/RequestMethod";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { getAnalytics } from "@/utils/getAnalytics";

export const getIp: Endpoint<void, Ip | null> = {
    method: RequestMethod.Get,
    path: "/ip",
    auth: AuthScope.None,
    handleRequest({ req }) {
        return getAnalytics(req).ip;
    },
};
