import type { SteamUser } from "@/shared/types/SteamUser";
import type { User } from "@/shared/types/User";
import type { UserModel } from "./userModel";

export function convertToUser(model: UserModel, steam: SteamUser | null): User {
	return { id: model.id, username: model.username, avatar: model.avatar, steam };
}
