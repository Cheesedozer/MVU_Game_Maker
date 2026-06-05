import { registerMvuSchema } from 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js';
// zod and lodash are available globally as `z` and `_`

/**
 * IMPORTANT:
 * Your MVU variable name is `stat_data`.
 * Therefore the schema MUST describe the VALUE of that variable directly:
 * { World_Calc, World, Mainchar, Familiar, MVUStatMenu_DB_Ver, GameStarted ... }
 */

// -------------------------
// Base atoms
// -------------------------
const strEmpty = z.string().prefault('');
const num0 = z.coerce.number().prefault(0);
const boolFalse = z.coerce.boolean().prefault(false);

// -------------------------
// "Labeled" field helper: [value, label]
// -------------------------
const labeledValue = z
  .tuple([
    z.union([
      z.string(),
      z.number(),
      z.boolean(),
      z.null(),
      z.array(z.any()),
      z.object({}).passthrough(),
    ]).prefault(''),
    strEmpty,
  ])
  .prefault(['', '']);

// Convenience typed variants
const labeledStr = z.tuple([strEmpty, strEmpty]).prefault(['', '']);
const labeledNum = z.tuple([num0, strEmpty]).prefault([0, '']);
const labeledBool = z.tuple([boolFalse, strEmpty]).prefault([false, '']);

// A generic "world record entry"
const worldRecordEntrySchema = z.object({}).passthrough().prefault({});

// -------------------------
// World_Calc
// -------------------------

const world_CalcSchema = z
  .object({
    Factions: z.record(z.string(), z.object({}).passthrough().prefault({})).prefault({}),
    Locations: z.record(z.string(), z.object({}).passthrough().prefault({})).prefault({}),
    Ruins: z.record(z.string(), z.object({}).passthrough().prefault({})).prefault({}),
    Events: z.record(z.string(), z.object({}).passthrough().prefault({})).prefault({}),
  })
  .passthrough()
  .prefault({});


// -------------------------
// World
// -------------------------

const worldSchema = z
  .object({
    Date: labeledStr,
    Time: labeledStr,
    Location: labeledStr,
    Weather: labeledStr,
  })
  .prefault({});


// -------------------------
// Mainchar
// -------------------------

const maincharSchema = z
  .object({
    Name: labeledStr,
    Age: labeledStr,
    Gender: labeledStr,
    Image: labeledStr,
    Race: labeledStr,
    Occupation: labeledStr,
    Level: labeledNum,
    Exp: labeledNum,
    'Core-points': labeledNum,
    Mental_state: labeledStr,
    Strength: labeledNum,
    Agility: labeledNum,
    Constitution: labeledNum,
    Intelligence: labeledNum,
    Wisdom: labeledNum,
    Charisma: labeledNum,
    Hp_curr: labeledNum,
    Hp_max: labeledNum,
    Mp_curr: labeledNum,
    Mp_max: labeledNum,
    Sta_curr: labeledNum,
    Sta_max: labeledNum,
    Physical_attack: labeledNum,
    Physical_defense: labeledNum,
    Magic_attack: labeledNum,
    Magic_defense: labeledNum,
    Magic_assist: labeledNum,
    Quests: z.record(z.string(), z
    .object({
        Desc: z.string().prefault(''),
        Difficulty: z.string().prefault(''),
        Reward: z.string().prefault(''),
        Status: z.string().prefault(''),
        LastUpdated: z.string().prefault(''),
        Objective: z.string().prefault(''),
        ProgressSummary: z.string().prefault(''),
    })
    .prefault({})).prefault({}),
    Skills: z.record(z.string(), z
    .object({
        Desc: z.string().prefault(''),
    })
    .passthrough()
    .prefault({})).prefault({}),
    Equipment: z.record(z.string(), z
    .object({
        Type: z.string().prefault(''),
        Qty: z.coerce.number().prefault(0),
        Desc: z.string().prefault(''),
        Rarity: z.string().prefault(''),
        Slot: z.string().prefault(''),
        EquipmentLevel: z.coerce.number().prefault(0),
        Appearance: z.string().prefault(''),
    })
    .passthrough()
    .prefault({})).prefault({}),
    Inventory: z.record(z.string(), z
    .object({
        Type: z.string().prefault(''),
        Qty: z.coerce.number().prefault(0),
        Desc: z.string().prefault(''),
    })
    .passthrough()
    .prefault({})).prefault({}),
    Talents: z.record(z.string(), z
    .object({
        Desc: z.string().prefault(''),
    })
    .prefault({})).prefault({}),
    Real_estate: z
    .object({
        Estates: z.record(z.string(), z.any()).prefault({}),
        Buildings: z.record(z.string(), z.any()).prefault({}),
        Assets: z.record(z.string(), z.any()).prefault({}),
    })
    .passthrough()
    .prefault({}),
    Buffs: z.record(z.string(), z
    .object({
        Desc: z.string().prefault(''),
    })
    .passthrough()
    .prefault({})).prefault({}),
    Ailments: z.record(z.string(), z
    .object({
        Desc: z.string().prefault(''),
    })
    .passthrough()
    .prefault({})).prefault({}),
  })
  .passthrough()
  .prefault({});


// -------------------------
// Familiar (Collection)
// -------------------------

const familiarMemberSchema = z
  .object({
    Name: labeledStr,
    Age: labeledStr,
    Gender: labeledStr,
    Race: labeledStr,
    Identity: labeledStr,
    Occupation: labeledStr,
    Level: labeledNum,
    Exp: labeledNum,
    'Core-points': labeledNum,
    Location: labeledStr,
    Height: labeledStr,
    Cup_Size: labeledStr,
    Body_Measurements: labeledStr,
    Hair_Style: labeledStr,
    Physical_Features: labeledStr,
    Personality: labeledStr,
    Image: labeledStr,
    Hp_curr: labeledNum,
    Hp_max: labeledNum,
    Mp_curr: labeledNum,
    Mp_max: labeledNum,
    Sta_curr: labeledNum,
    Sta_max: labeledNum,
    Strength: labeledNum,
    Agility: labeledNum,
    Constitution: labeledNum,
    Intelligence: labeledNum,
    Wisdom: labeledNum,
    Charisma: labeledNum,
    Physical_attack: labeledNum,
    Physical_defense: labeledNum,
    Magic_attack: labeledNum,
    Magic_defense: labeledNum,
    Magic_assist: labeledNum,
    Affection: labeledNum,
    Lewdness: labeledNum,
    Control_desire: labeledNum,
    M_level: labeledNum,
    Is_in_battle_team: labeledBool,
    Is_present: labeledBool,
    Familiar_Status: labeledStr,
    ExSkill: labeledStr,
    Biography: labeledStr,
    Equipment: z.record(z.string(), z
    .object({
        Type: z.string().prefault(''),
        Qty: z.coerce.number().prefault(0),
        Desc: z.string().prefault(''),
        Rarity: z.string().prefault(''),
        Slot: z.string().prefault(''),
        EquipmentLevel: z.coerce.number().prefault(0),
        Appearance: z.string().prefault(''),
    })
    .passthrough()
    .prefault({})).prefault({}),
    Sex_count: labeledNum,
    Secret: labeledStr,
  })
  .catchall(labeledValue)
  .prefault({});


const familiarSchema = z.record(z.string(), familiarMemberSchema).prefault({});

// -------------------------
// StatData root (THIS is the value of MVU variable `stat_data`)
// -------------------------
export const StatDataSchema = z
  .object({
    World_Calc: world_CalcSchema,
    World: worldSchema,
    Mainchar: maincharSchema,
    Familiar: familiarSchema,
    MVUStatMenu_DB_Ver: z.string().prefault(''),
    GameStarted: z.coerce.boolean().prefault(false),
  })
  .prefault({});

// -------------------------
// Register
// -------------------------
$(() => {
  registerMvuSchema(StatDataSchema);
});
