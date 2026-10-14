import { mock } from "bun:test";

type RolesFetch = (url: string, options?: RequestInit) => Promise<Response>;

/** Synthetic config and fetch only; never contact Bots or read live key values. */
export function mockBotsRoles(): {
    fetchMock: ReturnType<typeof mock<RolesFetch>>;
    restore: () => void;
} {
    const keys = [
        "BOTS_NEXT_PUBLIC_SUPABASE_URL",
        "BOTS_SUPABASE_SERVICE_ROLE_KEY",
        "BOTS_NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY",
    ];
    const descriptors = keys.map((key) => Object.getOwnPropertyDescriptor(process.env, key));
    process.env[keys[0]!] = "https://synthetic-bots.invalid";
    process.env[keys[1]!] = "synthetic-service-key";
    process.env[keys[2]!] = "synthetic-publishable-key";
    const originalFetch = globalThis.fetch;
    const fetchMock = mock<RolesFetch>(async () =>
        Response.json([{ role: "donator", other_roles: [] }]),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    return {
        fetchMock,
        restore() {
            globalThis.fetch = originalFetch;
            keys.forEach((key, index) => {
                const descriptor = descriptors[index];
                if (descriptor) Object.defineProperty(process.env, key, descriptor);
                else delete process.env[key];
            });
        },
    };
}
