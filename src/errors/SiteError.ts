import type { Response } from "express";
import type { SiteErrorObject } from "@/shared/SiteErrorObject";

/** Generic error class that can be caught by middleware. */
export abstract class SiteError<T extends SiteErrorObject = SiteErrorObject> extends Error {
	protected abstract readonly statusCode: number;

	private readonly responseBody: T;

	public constructor(responseBody: T, options?: ErrorOptions) {
		super(responseBody.description, options);
		this.name = this.constructor.name;
		this.responseBody = responseBody;
	}

	public makeResponse(res: Response<T>) {
		res.status(this.statusCode).json(this.responseBody);
	}
}
