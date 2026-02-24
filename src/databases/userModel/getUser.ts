import { NotFoundError } from "@/errors/NotFoundError";
import { pg } from "@/global/pg";
import type { DiscordId } from "@/shared/Common";
import type { User } from "@/shared/User";
import { convertToUser, type UserModel } from "./base/UserModel";

export async function getUser(id: DiscordId): Promise<User> {
	const result = await pg<UserModel[]>`SELECT * FROM users WHERE id = ${id}`;

	if (result.length === 0) {
		throw new NotFoundError({
			title: "User Not Found",
			description: "A user with this ID does not exist in the database.",
		});
	}

	return convertToUser(result[0]);
}
