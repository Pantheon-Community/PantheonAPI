import { getCommitHash } from "@/env/getCommitHash";
import { readFromEnv } from "@/env/readFromEnv";
import type { DiscordId } from "@/shared/types/Common";

export const config = {
    /** Auto-generated. */
    startTime: new Date(),

    /** Auto-generated. */
    commitHash: getCommitHash(),

    /** Usually either "development" or "production". */
    environment: readFromEnv("NODE_ENV", (env) => env.hasDefaultValueOf("development")),

    api: {
        /** The port that the API will listen to HTTP requests on. */
        port: readFromEnv("API_PORT", (port) => port.hasDefaultValueOf("5000").isPort()),

        /**
         * Number of proxies (Cloudflare, NGINX, etc.) between the server and clients, rate
         * limiting will be broken without this being set to the correct value.
         *
         * You can use the `/ip` endpoint to check this.
         */
        numProxies: readFromEnv("API_NUM_PROXIES", (num) =>
            num.hasDefaultValueOf("0").isInteger().minValue(0),
        ),

        /**
         * Maximum number of requests a client can make to the API in a 1 minute time window.
         *
         * If the API is sitting behind proxy servers, be sure to configure `numProxies` as well.
         */
        maxRequestsPerMinute: readFromEnv("API_MAX_REQUESTS_PER_MINUTE", (max) =>
            max.hasDefaultValueOf("30").isInteger().zeroMeansInfinity().minValue(1),
        ),

        /**
         * Array of origin URLs that are "approved" to use the API.
         *
         * Websites with any of these URLs can make requests to the server without having their
         * browser throw a security error.
         *
         * The wildcard "*" can be used to allow all origins.
         */
        clientUrls: readFromEnv("API_CLIENT_URLS", (clientUrls) =>
            clientUrls
                .hasDefaultValueOf("*")
                .isCommaSeparatedList()
                .each((x) => x.isUrlOrWildcard())
                .map((x) => x.value)
                .hasUniqueEntries()
                .errorIf(
                    (x) => x.includes("*") && x.length > 1,
                    "contains wildcard (*), so does not need to contain other URLs",
                )
                .toSet(),
        ),

        /** If non-default, will be shown as an additional server option in the API spec. */
        customExampleServerUrl: readFromEnv("API_CUSTOM_EXAMPLE_SERVER_URL", (url) =>
            url.hasDefaultValueOf("http://example.com").isUrl(),
        ),

        /**
         * If non-default, requests with a "X-PantheonClient-T" header value matching this secret
         * will have their IP and user agents read via custom headers instead of the original ones.
         */
        mainWebsiteProxySecret: readFromEnv("API_MAIN_WEBSITE_PROXY_SECRET", (secret) =>
            secret.hasDefaultValueOf(""),
        ),
    },

    discord: {
        clientId: readFromEnv("DISCORD_CLIENT_ID", (clientId) => clientId.isRequired()),

        clientSecret: readFromEnv("DISCORD_CLIENT_SECRET", (secret) => secret.isRequired()),
    },

    db: {
        hostname: readFromEnv("DB_HOST", (host) => host.isRequired()),

        username: readFromEnv("DB_USER", (name) => name.isRequired()),

        database: readFromEnv("DB_NAME", (name) => name.isRequired()),

        password: readFromEnv("DB_PASSWORD", (password) => password.isRequired()),

        port: readFromEnv("DB_PORT", (port) => port.isRequired().isPort()),

        /** This user is automatically inserted into the users and roles databases on startup. */
        rootUserId: readFromEnv("DB_ROOT_USER_ID", (id) =>
            id.hasDefaultValueOf("240312568273436674").cast<DiscordId>(),
        ),
    },

    /** Development-related flags. */
    dev: {
        /**
         * For an improved debugging experience, setting this to true will monkey patch timer setup
         * and teardown to log what is being timed.
         */
        logTimers: readFromEnv("DEV_LOG_TIMERS", (env) =>
            env.hasDefaultValueOf("false").isBoolean(),
        ),

        /**
         * For testing background tasks, setting this to true will execute all background tasks
         * once on startup.
         */
        immediateSchedules: readFromEnv("DEV_IMMEDIATE_SCHEDULES", (env) =>
            env.hasDefaultValueOf("false").isBoolean(),
        ),
    },
} as const;
