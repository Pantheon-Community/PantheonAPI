/** Inserts template economy rewards into the database. */

import { config } from "@/global/config";
import { pg } from "@/global/pg";
import type { EconomyRewardItemModel } from "@/models/EconomyRewardItemModel";
import type { EconomyRewardModel } from "@/models/EconomyRewardModel";
import { startPostgres } from "@/start/startPostgres";
import { Color } from "@/types/Color";
import { colorize } from "@/utils/colorize";
import { logWithTimeTaken } from "@/utils/logging";
import { sql } from "bun";

interface HardcodedReward {
    title: string;

    subtitle: string;

    description: string;

    cost: number;

    quantity: number;

    image: string;

    itemId: number;
}

const HARDCODED_REWARDS: HardcodedReward[] = [
    // MARK: Medical
    {
        title: "Painkillers",
        subtitle: "Slowly restores health over time.",
        description:
            "This bottle of painkillers will restore up to 50HP over the course of 15 seconds. Not approved by the FDA.",
        cost: 25,
        quantity: 1,
        image: "painkillers",
        itemId: 34,
    },
    {
        title: "First Aid Kit",
        subtitle: "Heals your injuries.",
        description:
            "This 0.7kg first aid kit contains enough medical supplies to heal 65HP in less than 5 seconds!",
        cost: 50,
        quantity: 1,
        image: "medkit",
        itemId: 14,
    },
    {
        title: "Adrenaline",
        subtitle: "Provides a temporary health boost and a short burst of stamina.",
        description:
            "Don't worry - adrenaline has zero addictive properties!*\n*Study paid for by Permacura. Permacura: put your life in our hands.",
        cost: 68,
        quantity: 1,
        image: "adrenaline",
        itemId: 33,
    },
    // MARK: Ammo
    {
        title: "9x19mm Ammo",
        subtitle: "Several boxes of 9x19mm calibre bullets.",
        description: "Usable by the COM-15, COM-18, COM-45, Crossvec, and FSP-9.",
        cost: 40,
        quantity: 5,
        image: "ammo_9",
        itemId: 29,
    },
    {
        title: "5.56x45mm Ammo",
        subtitle: "Several boxes of 5.56x45mm calibre bullets.",
        description: "Usable by the FR-MG-0 and MTF-E11-SR.",
        cost: 65,
        quantity: 5,
        image: "ammo_5",
        itemId: 22,
    },
    {
        title: "7.62x39mm Ammo",
        subtitle: "Several boxes of 7.62x39mm calibre bullets.",
        description: "Usable by the A7, AK, and Logicer.",
        cost: 65,
        quantity: 5,
        image: "ammo_7",
        itemId: 28,
    },
    {
        title: "12/70 Buckshot Ammo",
        subtitle: "Several boxes of 12/70 calibre buckshot shells.",
        description: "Exclusively used by the shotgun.",
        cost: 55,
        quantity: 5,
        image: "ammo_buckshot",
        itemId: 19,
    },
    {
        title: ".44 Mag Ammo",
        subtitle: "Several magazines of .44 calibre bullets.",
        description: "Exclusively used by the .44 revolver.",
        cost: 50,
        quantity: 5,
        image: "ammo_44",
        itemId: 27,
    },
    // MARK: Armor
    {
        title: "Light Armour",
        subtitle: "Reduces damage from bullets and grenades.",
        description: "A lightweight vest that provides some protection.",
        cost: 25,
        quantity: 1,
        image: "armour_light",
        itemId: 36,
    },
    {
        title: "Combat Armour",
        subtitle: "Reduces damage from bullets and grenades.",
        description: "A sturdy vest that provides decent protection, at the cost of stamina.",
        cost: 50,
        quantity: 1,
        image: "armour_combat",
        itemId: 37,
    },
    {
        title: "Heavy Armour",
        subtitle: "Reduces damage from bullets and grenades",
        description:
            "A heavy, padded vest that provides excellent protection, but heavily reduces stamina.",
        cost: 75,
        quantity: 1,
        image: "armour_heavy",
        itemId: 38,
    },
    // MARK: Firearms
    {
        title: "COM-15",
        subtitle: "A standard semi-automatic pistol.",
        description: "A somewhat weak yet reliable gun, sporting a 9x19mm calibre and 18cm barrel.",
        cost: 60,
        quantity: 1,
        image: "com15",
        itemId: 13,
    },
    {
        title: "COM-18",
        subtitle: "An impressive semi-automatic pistol.",
        description:
            "The more tactical and lightweight brother of the COM-15, great against singular targets.",
        cost: 75,
        quantity: 1,
        image: "com18",
        itemId: 30,
    },
    {
        title: ".44 Revolver",
        subtitle: "A powerful magnum pistol.",
        description:
            "A slow firing but high firepower sidearm commonly seen among members of the Chaos Insurgency.",
        cost: 130,
        quantity: 1,
        image: "44-revolver",
        itemId: 39,
    },
    {
        title: "FSP-9",
        subtitle: "A standard submachine gun.",
        description: "Standard issue submachine gun for guards and other security personnel.",
        cost: 95,
        quantity: 1,
        image: "fsp9",
        itemId: 23,
    },
    {
        title: "Crossvec",
        subtitle: "An tactical submachine gun.",
        description:
            "A C.R.O.S.S endorsed, highly reputable weapon sporting an integrated recoil-reduction system and impressive fire rate.",
        cost: 115,
        quantity: 1,
        image: "crossvec",
        itemId: 21,
    },
    {
        title: "MTF-E11-SR",
        subtitle: "A standard MTF assault rifle.",
        description:
            "A common choice among NTF seargants and specialists, the Facility Recovery-Standard Rifle (FR-SR) is highly customisabe, lightweight, and versatile in many combat situations.",
        cost: 200,
        quantity: 1,
        image: "mtf-e11-sr",
        itemId: 20,
    },
    {
        title: "AK",
        subtitle: "A Russian assault rifle.",
        description:
            "Excelling in player-versus-player combat, the AK is a renowned and reliable weapon.",
        cost: 175,
        quantity: 1,
        image: "ak",
        itemId: 40,
    },
    {
        title: "Logicer",
        subtitle: "A powerful light machine gun.",
        description:
            "A dominant but rarely seen weapon, the Logicer is an excellent choice for raining bullets on your enemies.",
        cost: 300,
        quantity: 1,
        image: "logicer",
        itemId: 24,
    },
    {
        title: "FR-MG-0",
        subtitle: "An MTF light machine gun.",
        description:
            "A relatively light yet powerful weapon, the Facility Recovery-Machine Gun (FR-MG) is a common choice among MTF captains.",
        cost: 450,
        quantity: 1,
        image: "fr-mg-0",
        itemId: 52,
    },
    // MARK: Special Items
    {
        title: "SCP-207",
        subtitle: "Harmfully increases motor skills.",
        description:
            "A tasty beverage that permanently increases speed and provides infinite stamina, but at the cost of slowly draining the user's health.",
        cost: 170,
        quantity: 1,
        image: "scp-207",
        itemId: 18,
    },
    {
        title: "Anti-Cola",
        subtitle:
            "Good for your health, bad for your motor skills. Will save your life in a pinch.",
        description:
            "The result of an experiment with SCP-914 and SCP-207, Anti-Cola has the opposite effects to SCP-207, providing permanent health regenation at the cost of speed.",
        cost: 195,
        quantity: 1,
        image: "anti-cola",
        itemId: 51,
    },
    {
        title: "SCP-1853",
        subtitle: "Increased dexterity and weapon handling when your life is in danger.",
        description:
            "A favourite of weapon specialists, SCP-1853 improves weapon handling, accuracy, and other motor skills when your life is in danger.",
        cost: 200,
        quantity: 1,
        image: "scp-1853",
        itemId: 46,
    },
    {
        title: "SCP-018",
        subtitle: "Superball with the ability to bounce with extreme efficiency.",
        description: "A seemingly-normal ball that disobeys the laws of thermodynamics.",
        cost: 185,
        quantity: 1,
        image: "scp-018",
        itemId: 31,
    },
    {
        title: "SCP-244",
        subtitle: "An ancient vase, freezing to the touch.",
        description: "Creates a large cloud of icy fog when placed.",
        cost: 330,
        quantity: 1,
        image: "scp-244",
        itemId: 45,
    },
    {
        title: "SCP-2176",
        subtitle: "Your very own Ghostlight!",
        description:
            "An electroplasm-powered lightbulb that can affect surrounding electrical devices when broken.",
        cost: 180,
        quantity: 1,
        image: "scp-2176",
        itemId: 43,
    },
    {
        title: "Jailbird",
        subtitle: "An electric melee weapon.",
        description: "Channel your inner Half-Life 2 scientist.",
        cost: 350,
        quantity: 1,
        image: "jailbird",
        itemId: 50,
    },
    {
        title: "SCP-1576",
        subtitle: "Allows temporary communication with the dead.",
        description:
            "A reusable phonograph that can be used to communicate with the dead, but at the cost of your mental sanity.",
        cost: 175,
        quantity: 1,
        image: "scp-1576",
        itemId: 49,
    },
    {
        title: "COM-45",
        subtitle: "A triple full-auto pistol.",
        description:
            "Extremely hard-to-handle, but deadly to even the strongest opponent in the right hands.",
        cost: 200,
        quantity: 1,
        image: "com45",
        itemId: 48,
    },
    {
        title: "3-X Particle Disruptor",
        subtitle: "An experimental fusion rifle.",
        description:
            "An extremely powerful weapon that is effective against all types of enemies, doors included.",
        cost: 350,
        quantity: 1,
        image: "3-x-particle-disruptor",
        itemId: 47,
    },
    {
        title: "SCP-500",
        subtitle: "The Panacea.",
        description:
            "Eases all trouble and pain, curing almost all diseases, afflictions, and injuries.",
        cost: 180,
        quantity: 1,
        image: "scp-500",
        itemId: 17,
    },
    {
        title: "Micro H.I.D",
        subtitle: "An experimental energy weapon.",
        description:
            "The bane of any SCP, the Micro High-Intensity Electrical Discharge Thrower (Micro H.I.D) is an extremely powerful weapon if used correctly.",
        cost: 350,
        quantity: 1,
        image: "micro-hid",
        itemId: 16,
    },
    {
        title: "Lantern",
        subtitle: "An oil lantern that never runs out of fuel.",
        description: "A seemingly normal oil lantern that never runs out of fuel.",
        cost: 50,
        quantity: 1,
        image: "lantern",
        itemId: 54,
    },
    // MARK: Keycards
    {
        title: "Janitor Keycard",
        subtitle: "A tier 1 containment keycard.",
        description: "Capable of opening the door to SCP-914, and not much else.",
        cost: 25,
        quantity: 1,
        image: "keycard_janitor",
        itemId: 0,
    },
    {
        title: "Scientist Keycard",
        subtitle: "A tier 2 containment keycard.",
        description: "Capable of opening most doors in light containment, excluding checkpoints.",
        cost: 50,
        quantity: 1,
        image: "keycard_scientist",
        itemId: 1,
    },
    {
        title: "Zone Manager Keycard",
        subtitle: "A tier 1 administration keycard.",
        description: "capable of opening some doors in light containment and checkpoints.",
        cost: 60,
        quantity: 1,
        image: "keycard_zone_manager",
        itemId: 3,
    },
    {
        title: "Research Supervisor Keycard",
        subtitle: "A tier 3 containment keycard.",
        description: "Capable of opening most doors in light containment, including checkpoints.",
        cost: 100,
        quantity: 1,
        image: "keycard_research_supervisor",
        itemId: 2,
    },
    {
        title: "Guard Keycard",
        subtitle: "A tier 1 security keycard.",
        description:
            "Capable of opening most doors in light containment, checkpoints, and armouries.",
        cost: 75,
        quantity: 1,
        image: "keycard_guard",
        itemId: 4,
    },
    {
        title: "MTF Captain Keycard",
        subtitle: "A tier 4 security keycard.",
        description:
            "Capable of opening all but tier 3 containment areas and the surface warhead door.",
        cost: 250,
        quantity: 1,
        image: "keycard_mtf_captain",
        itemId: 8,
    },
];

await startPostgres();

const startTimeRewards = Date.now();

const rewards = HARDCODED_REWARDS.map<Partial<EconomyRewardModel>>((x) => ({
    title: x.title,
    subtitle: x.subtitle,
    description: x.description,
    image: x.image,
    cost: x.cost,
    normal_cost: x.cost,
    posted_by: config.db.rootUserId,
    last_updated_by: config.db.rootUserId,
}));

const rewardIds = await pg<Pick<EconomyRewardModel, "id">[]>`
    INSERT INTO economy_rewards ${sql(rewards)}
    RETURNING id
`;

logWithTimeTaken(
    `Seeded ${colorize(`${HARDCODED_REWARDS.length} Rewards`, Color.FgCyan)}`,
    startTimeRewards,
);

const startTimeItems = Date.now();

const rewardItems = HARDCODED_REWARDS.map<EconomyRewardItemModel>((x, i) => ({
    reward_id: rewardIds[i]!.id,
    item_id: x.itemId,
    item_count: x.quantity,
}));

await pg`INSERT INTO economy_reward_items ${sql(rewardItems)} ON CONFLICT (id) DO NOTHING`;

logWithTimeTaken(
    `Seeded ${colorize(`${HARDCODED_REWARDS.length} Reward Items`, Color.FgCyan)}`,
    startTimeItems,
);
