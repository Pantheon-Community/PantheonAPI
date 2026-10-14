import { pgTransaction } from "@/global/pg";
import type { PublicEventCategory } from "@/shared/types/PublicEvents";
import { isSupportedEventCommand } from "./publicEventCommands";
import { PUBLIC_EVENT_DESCRIPTIONS } from "./publicEventDescriptions";

export const PUBLIC_EVENT_PRICE_SHEET: readonly (readonly [
    string,
    string,
    number,
    PublicEventCategory,
])[] = [
    ["birdistheword", "Bird is the Word", 2000, "pvp"],
    ["facilitywarfare", "Facility Warfare", 1500, "pvp"],
    ["hangthedj", "Hang the DJ", 1800, "pvp"],
    ["knifefight", "Knife Fight", 2000, "pvp"],
    ["lasertag", "Laser Tag", 2000, "pvp"],
    ["micromanagement", "Micromanagement", 1800, "pvp"],
    ["searchanddestroy", "Search and Destroy", 2500, "pvp"],
    ["hideandseek", "Hide and Seek", 2000, "survival"],
    ["hle", "Homelander", 3000, "survival"],
    ["leapfrog", "Leapfrog", 1800, "survival"],
    ["murderinthedark", "Murder in the Dark", 2500, "survival"],
    ["nukerun", "Nuke Run", 1200, "survival"],
    ["nutallergy", "Nut Allergy", 2000, "survival"],
    ["cockfights", "Cockfights", 2500, "minigame"],
    ["dodgeball", "Dodgeball", 2000, "minigame"],
    ["gungame", "Gun Game", 3000, "minigame"],
    ["musicalchairs", "Musical Chairs", 2800, "minigame"],
    ["redlightgreenlight", "Red Light Green Light", 1500, "minigame"],
    ["spleef", "Spleef", 3000, "minigame"],
    ["tag", "Tag", 2000, "minigame"],
    ["excorpses", "Exploding Corpses", 2000, "modifier"],
    ["ff", "Friendly Fire", 5000, "modifier"],
    ["hsonly", "Headshots Only", 2000, "modifier"],
    ["lifesteal", "Life Steal", 3000, "modifier"],
    ["gravity", "Low Gravity", 1500, "modifier"],
    ["tiny", "Tiny", 1800, "modifier"],
    ["walkingdead", "Walking Dead", 3000, "modifier"],
];

const OTHER_EVENTS: readonly (readonly [string, string, PublicEventCategory])[] = [
    ["labyrinth", "Labyrinth", "minigame"],
    ["modhunt", "Mod Hunt", "pvp"],
    ["peanutdodgeball", "Peanut Dodgeball", "minigame"],
    ["scp079escape", "SCP-079 Escape", "survival"],
    ["scpreplication", "SCP Replication", "survival"],
    ["traitor", "Traitor", "pvp"],
    ["zombiesurvival", "Zombie Survival", "survival"],
];

export async function seedPublicEventCatalog(): Promise<void> {
    await pgTransaction(async (sql) => {
        // Inserting the marker serializes concurrent bootstraps; rollback removes it too.
        const marker = await sql`
            INSERT INTO public_event_bootstrap (key) VALUES ('categorized-price-sheet-v1')
            ON CONFLICT (key) DO NOTHING RETURNING key
        `;
        if (marker.length > 0) {
            for (const [command, name, cost, category] of PUBLIC_EVENT_PRICE_SHEET) {
                const enabled = isSupportedEventCommand(command);
                // Match normalized bare commands, retaining IDs, media, descriptions and order snapshots.
                // eslint-disable-next-line no-await-in-loop
                const updated = await sql`
                UPDATE public_event_catalog SET name = ${name}, cost = ${cost}, category = ${category}, enabled = ${enabled}
                WHERE regexp_replace(lower(btrim(command)), '^/+', '') = ${command}
                RETURNING id
            `;
                if (updated.length === 0) {
                    // eslint-disable-next-line no-await-in-loop
                    await sql`
                    INSERT INTO public_event_catalog (name, description, cost, command, enabled, category)
                    VALUES (${name}, '', ${cost}, ${command}, ${enabled}, ${category})
                `;
                }
            }
            for (const [command, name, category] of OTHER_EVENTS) {
                // Non-sheet entries remain staff-controlled; only backfill their category.
                // eslint-disable-next-line no-await-in-loop
                await sql`UPDATE public_event_catalog SET category = ${category}
                WHERE split_part(regexp_replace(lower(btrim(command)), '^/+', ''), ' ', 1) = ${command}`;
                // eslint-disable-next-line no-await-in-loop
                await sql`
                INSERT INTO public_event_catalog (name, description, cost, command, enabled, category)
                SELECT ${name}, '', 0, ${command}, FALSE, ${category}
                WHERE NOT EXISTS (SELECT 1 FROM public_event_catalog
                    WHERE regexp_replace(lower(btrim(command)), '^/+', '') = ${command})
            `;
            }
            // Categorize existing song variants without changing their staff-defined prices.
            for (const [command, , , category] of PUBLIC_EVENT_PRICE_SHEET) {
                // eslint-disable-next-line no-await-in-loop
                await sql`UPDATE public_event_catalog SET category = ${category}
                WHERE split_part(regexp_replace(lower(btrim(command)), '^/+', ''), ' ', 1) = ${command}`;
            }
        }

        const priceMarker = await sql`
            INSERT INTO public_event_bootstrap (key) VALUES ('categorized-price-sheet-v2')
            ON CONFLICT (key) DO NOTHING RETURNING key
        `;
        if (priceMarker.length > 0) {
            // Override only revised bare-command prices once; variants and all other fields stay staff-controlled.
            const revisedCommands = new Set([
                "hangthedj",
                "micromanagement",
                "leapfrog",
                "murderinthedark",
                "nukerun",
                "cockfights",
                "dodgeball",
                "musicalchairs",
                "tag",
                "tiny",
            ]);
            for (const [command, , cost] of PUBLIC_EVENT_PRICE_SHEET) {
                if (!revisedCommands.has(command)) continue;
                // eslint-disable-next-line no-await-in-loop
                await sql`UPDATE public_event_catalog SET cost = ${cost}
                WHERE regexp_replace(lower(btrim(command)), '^/+', '') = ${command}`;
            }
        }

        const descriptionMarker = await sql`
            INSERT INTO public_event_bootstrap (key) VALUES ('catalog-descriptions-v1')
            ON CONFLICT (key) DO NOTHING RETURNING key
        `;
        if (descriptionMarker.length === 0) return;
        for (const [command, description] of Object.entries(PUBLIC_EVENT_DESCRIPTIONS)) {
            // eslint-disable-next-line no-await-in-loop
            await sql`UPDATE public_event_catalog SET description = ${description}
                WHERE split_part(regexp_replace(lower(btrim(command)), '^/+', ''), ' ', 1) = ${command}
                AND (btrim(description) = '' OR description = 'Local demo fixture. No real event will run.')`;
        }
    });
}
