import type { OAS } from "@/shared/global/OAS";
import type { AnyEndpoint } from "@/types/Express/Endpoint";
import { typedEntries } from "@/utils/objectUtils";

export function* generatePathParameters(endpoint: AnyEndpoint): Generator<OAS.PathParameter> {
    const { pathParams } = endpoint;

    if (pathParams?.schema.properties === undefined) {
        return;
    }

    for (const [key, value] of typedEntries(pathParams.schema.properties)) {
        yield {
            in: "path",
            required: true,
            name: key,
            schema: value,
        };
    }
}
export function* generateQueryParameters(endpoint: AnyEndpoint): Generator<OAS.QueryParameter> {
    const { queryParams } = endpoint;

    if (queryParams?.schema.properties === undefined) {
        return;
    }

    for (const [key, value] of typedEntries(queryParams.schema.properties)) {
        yield {
            in: "query",
            required: true,
            name: key,
            schema: value,
        };
    }
}
