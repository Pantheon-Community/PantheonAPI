import process from "node:process";
import { SQL } from "bun";
import { createSessionTable } from "@/databases/sessionModel/base/createSessionTable";
import { createUserTable } from "@/databases/userModel/base/createUserTable";
import { config } from "@/global/config";
import { setPg } from "@/global/pg";
import { Color } from "@/types/Color";
import { colorize } from "@/utils/colorize";
import { log, logWithTimeTaken } from "@/utils/logging";

enum ConnectionStatus {
	Attempting,
	Connected,
	Disconnected,
}

async function connectToPostgres(): Promise<void> {
	const { hostname, port, database, username, password } = config.db;

	const startedAt = Date.now();

	// Logging In

	let connectionStatus = ConnectionStatus.Attempting;

	const pg = new SQL({
		hostname,
		port,
		database,
		username,
		password,

		onconnect: (): void => {
			if (connectionStatus === ConnectionStatus.Connected) return;

			connectionStatus = ConnectionStatus.Connected;

			logWithTimeTaken("Connected to PostgreSQL", startedAt);
		},

		onclose: (error: Error | null): void => {
			switch (connectionStatus) {
				case ConnectionStatus.Attempting:
					log(colorize("Failed to connect to PostgreSQL", Color.FgRed));
					console.error(error);
					break;
				case ConnectionStatus.Connected:
					log(colorize("Disconnected from PostgreSQL", Color.FgRed));
					console.error(error);
					break;
				default:
					return;
			}

			connectionStatus = ConnectionStatus.Disconnected;

			process.exit(1);
		},
	});

	setPg(pg);

	await pg.connect();
}

async function setupTables(): Promise<void> {
	const startedAt = Date.now();

	await createUserTable();

	await createSessionTable();

	logWithTimeTaken("Setup Database Tables", startedAt);
}

export async function startPostgres(): Promise<void> {
	await connectToPostgres();
	await setupTables();
}
