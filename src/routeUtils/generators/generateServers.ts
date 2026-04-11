import { config } from "@/global/config";
import type { OAS } from "@/shared/global/OAS";

export function generateServers(): OAS.Server[] {
    const servers: OAS.Server[] = [
        {
            url: "https://api.pantheoncommunity.org",
            description: "Production Server",
        },
    ];

    if (config.environment === "development") {
        let devServer: OAS.Server;

        if (config.api.port !== 0) {
            devServer = {
                url: `http://localhost:${config.api.port}`,
                description: "Local Development Server",
            };
        } else {
            devServer = {
                url: "http://localhost:{port}",
                description: "Local Development Server",
                variables: {
                    port: {
                        description: "Dynamically assigned port.",
                        default: "5000",
                    },
                },
            };
        }

        servers.unshift(devServer);

        if (config.api.customExampleServerUrl !== "http://example.com") {
            servers.push({
                url: config.api.customExampleServerUrl,
                description: "Local Development Server (Custom)",
            });
        }
    }

    return servers;
}
