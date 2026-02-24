import { startApi } from "./start/startApi";
import { startPostgres } from "./start/startPostgres";

await Promise.all([startPostgres(), startApi()]);
