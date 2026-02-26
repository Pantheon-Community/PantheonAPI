import type { Request } from "express";

// biome-ignore lint/suspicious/noExplicitAny: unknown doesn't work here
export type AnyRequest = Request<any, any, any, any, any>;
