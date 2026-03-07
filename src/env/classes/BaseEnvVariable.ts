import { Color } from "@/types/Color";
import { colorize } from "@/utils/colorize";

export abstract class BaseEnvVariable {
    protected readonly key: string;

    protected constructor(key: string) {
        this.key = key;
    }

    protected named(): `Environment variable ${string}` {
        return `Environment variable ${colorize(this.key, Color.FgRed)}`;
    }
}
