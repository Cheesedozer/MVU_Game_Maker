import { registerMvuSchema } from 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js';
// zod and lodash are available globally as `z` and `_`

/**
 * IMPORTANT:
 * Your MVU variable name is `stat_data`.
 * Therefore the schema MUST describe the VALUE of that variable directly:
 * { World_Calc, World, Mainchar, Partner, MVUStatMenu_DB_Ver, GameStarted ... }
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
    Locations: z.record(z.string(), z
    .object({
        summary: z.string().prefault(''),
    })
    .passthrough()
    .prefault({})).prefault({}),
    Events: z.record(z.string(), z
    .object({
        summary: z.string().prefault(''),
        state: z.string().prefault(''),
        time: z.string().prefault(''),
    })
    .passthrough()
    .prefault({})).prefault({}),
    NPCs: z.record(z.string(), z
    .object({
        name: z.string().prefault(''),
        relationship: z.string().prefault(''),
        occupation: z.string().prefault(''),
        personality: z.string().prefault(''),
        last_seen: z.string().prefault(''),
        summary: z.string().prefault(''),
    })
    .passthrough()
    .prefault({})).prefault({}),
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
    Mental_state: labeledStr,
    Charisma: labeledNum,
    SocialEnergy: labeledNum,
    Money: labeledNum,
    Salary: labeledNum,
    Quests: z.record(z.string(), z
    .object({
        Desc: z.string().prefault(''),
        Reward: z.string().prefault(''),
        Status: z.string().prefault(''),
        LastUpdated: z.string().prefault(''),
        Difficulty: z.string().prefault(''),
        Objective: z.string().prefault(''),
        ProgressSummary: z.string().prefault(''),
    })
    .passthrough()
    .prefault({})).prefault({}),
    Skills: z.record(z.string(), z
    .object({
        Desc: z.string().prefault(''),
    })
    .passthrough()
    .prefault({})).prefault({}),
    Belongings: z.record(z.string(), z
    .object({
        Type: z.string().prefault(''),
        Qty: z.coerce.number().prefault(0),
        Desc: z.string().prefault(''),
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
    Stress_Curr: labeledNum,
    Energy_curr: labeledNum,
    Energy_max: labeledNum,
    Stress_max: labeledNum,
  })
  .prefault({});


// -------------------------
// Partner (Collection)
// -------------------------

const partnerMemberSchema = z
  .object({
    Name: labeledStr,
    Age: labeledStr,
    Gender: labeledStr,
    Race: labeledStr,
    Identity: labeledStr,
    Occupation: labeledStr,
    Location: labeledStr,
    Height: labeledStr,
    Cup_Size: labeledStr,
    Body_Measurements: labeledStr,
    Hair_Style: labeledStr,
    Physical_Features: labeledStr,
    Personality: labeledStr,
    Biography: labeledStr,
    Secret: labeledStr,
    Image: labeledStr,
    Affection: labeledNum,
    Trust: labeledNum,
    Respect: labeledNum,
    Attraction: labeledNum,
    Comfort: labeledNum,
    Bonds: labeledNum,
    Energy: labeledNum,
    Desire: labeledNum,
    Arousal: labeledNum,
    Openness: labeledNum,
    Dominance: labeledNum,
    Shyness: labeledNum,
    Playfulness: labeledNum,
    Kindness: labeledNum,
    Patience: labeledNum,
    Confidence: labeledNum,
    EmotionalStability: labeledNum,
    Impulsive: labeledNum,
    Jealousy: labeledNum,
    Guilt: labeledNum,
    Depression: labeledNum,
    Initiative: labeledNum,
    IntensityPreference: labeledNum,
    ControlPreference: labeledNum,
    Curiosity: labeledNum,
    Mood: labeledStr,
    Stress: labeledNum,
    Embarrassment: labeledNum,
    Excitement: labeledNum,
    RelationshipStage: labeledStr,
    ConflictActive: labeledBool,
    Is_present: labeledBool,
    PositiveMemories: z.record(z.string(), z
    .object({
        Desc: z.string().prefault(''),
        TimeStamp: z.string().prefault(''),
    })
    .prefault({})).prefault({}),
    NegativeMemories: z.record(z.string(), z
    .object({
        Desc: z.string().prefault(''),
        TimeStamp: z.string().prefault(''),
    })
    .prefault({})).prefault({}),
    ImportantEvents: z.record(z.string(), z
    .object({
        Desc: z.string().prefault(''),
        TimeStamp: z.string().prefault(''),
    })
    .prefault({})).prefault({}),
    Friends: z.record(z.string(), z
    .object({
        Name: z.string().prefault(''),
        FriendshipScore: z.string().prefault(''),
        Mood: z.string().prefault(''),
    })
    .prefault({})).prefault({}),
    Hobbies: z.record(z.string(), z
    .object({
        Desc: z.string().prefault(''),
    })
    .prefault({})).prefault({}),
    Values: z
    .object({
        Second: z
        .object({
            Desc: z.string().prefault(''),
        })
        .prefault({}),
    })
    .passthrough()
    .prefault({}),
    Money: labeledNum,
    Salary: labeledNum,
    FlirtingStyle: labeledStr,
    Boundaries: labeledStr,
    Lewdness: labeledNum,
    Sex_count: labeledNum,
    Thoughts: labeledStr,
    Belongings: z.record(z.string(), z
    .object({
        Type: z.string().prefault(''),
        Qty: z.coerce.number().prefault(0),
        Desc: z.string().prefault(''),
    })
    .passthrough()
    .prefault({})).prefault({}),
    Base100: labeledNum,
    Base400: labeledNum,
    TimeSinceLastSeen: labeledStr,
  })
  .prefault({});


const partnerSchema = z.record(z.string(), partnerMemberSchema).prefault({});

// -------------------------
// StatData root (THIS is the value of MVU variable `stat_data`)
// -------------------------
export const StatDataSchema = z
  .object({
    World_Calc: world_CalcSchema,
    World: worldSchema,
    Mainchar: maincharSchema,
    Partner: partnerSchema,
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
