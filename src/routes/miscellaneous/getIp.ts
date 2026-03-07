import type { Ip } from "@/shared/types/Common";
import { AuthScope } from "@/types/Express/AuthScope";
import type { Endpoint } from "@/types/Express/Endpoint";
import { getAnalytics } from "@/utils/getAnalytics";

export const getIp: Endpoint<void, Ip | null> = {
    method: "get",
    path: "/ip",
    auth: AuthScope.None,
    handleRequest({ req, res }) {
        res.status(200).send(getAnalytics(req).ip);
    },
};
