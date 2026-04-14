import { AuthScope } from "@/types/Express/AuthScope";
import type { AnyEndpoint } from "@/types/Express/Endpoint";
import { registerNoAuthEndpoint } from "./registerNoAuthEndpoint";
import { registerPermissionAuthEndpoint } from "./registerPermissionAuthEndpoint";
import { registerPluginAuthEndpoint } from "./registerPluginAuthEndpoint";
import { registerSessionAuthEndpoint } from "./registerSessionAuthEndpoint";

export function registerEndpoint(endpoint: AnyEndpoint): void {
    switch (endpoint.auth) {
        case AuthScope.None:
            return registerNoAuthEndpoint(endpoint);

        case AuthScope.Session:
            return registerSessionAuthEndpoint(endpoint);

        case AuthScope.Permission:
            return registerPermissionAuthEndpoint(endpoint);

        case AuthScope.Plugin:
            return registerPluginAuthEndpoint(endpoint);
    }
}
