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
    // Stage 1c: scene mode set by the AI each reply (exploration|combat|dialogue|shop|town).
    // Used to gate combat-only rule entries; defaults to exploration (combat rules stay on).
    Mode: labeledStr,
    // Optional map image shown by the status panel; declared so it is preserved (worldSchema is
    // not passthrough, so undeclared World fields would be stripped on validation).
    MapImage: labeledStr,
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
        // Equipment bonuses (additive). Documented in <equipment_budget_system>; reconciled into
        // derived stats by the recompute and GUI. Direct bonuses feed derived stats; core-stat
        // bonuses (Str/Agi/Con/Int/Wis) feed EFFECTIVE attributes. ChaBonus is schema-only (no
        // derived consumer). Stored on the equipped item; never baked into base attributes.
        WeaponDamage: z.coerce.number().prefault(0),
        WeaponMagDamage: z.coerce.number().prefault(0),
        ArmorPDefBonus: z.coerce.number().prefault(0),
        ArmorMDefBonus: z.coerce.number().prefault(0),
        MaxHPBonus: z.coerce.number().prefault(0),
        MaxMPBonus: z.coerce.number().prefault(0),
        StrBonus: z.coerce.number().prefault(0),
        AgiBonus: z.coerce.number().prefault(0),
        ConBonus: z.coerce.number().prefault(0),
        IntBonus: z.coerce.number().prefault(0),
        WisBonus: z.coerce.number().prefault(0),
        ChaBonus: z.coerce.number().prefault(0),
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
        // Equipment bonuses (additive). Documented in <equipment_budget_system>; reconciled into
        // derived stats by the recompute and GUI. Direct bonuses feed derived stats; core-stat
        // bonuses (Str/Agi/Con/Int/Wis) feed EFFECTIVE attributes. ChaBonus is schema-only (no
        // derived consumer). Stored on the equipped item; never baked into base attributes.
        WeaponDamage: z.coerce.number().prefault(0),
        WeaponMagDamage: z.coerce.number().prefault(0),
        ArmorPDefBonus: z.coerce.number().prefault(0),
        ArmorMDefBonus: z.coerce.number().prefault(0),
        MaxHPBonus: z.coerce.number().prefault(0),
        MaxMPBonus: z.coerce.number().prefault(0),
        StrBonus: z.coerce.number().prefault(0),
        AgiBonus: z.coerce.number().prefault(0),
        ConBonus: z.coerce.number().prefault(0),
        IntBonus: z.coerce.number().prefault(0),
        WisBonus: z.coerce.number().prefault(0),
        ChaBonus: z.coerce.number().prefault(0),
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

// =====================================================================================
// Stage 1b — Derived-stat recompute (deterministic, authoritative)
// -------------------------------------------------------------------------------------
// The AI only emits BASE stats (Level, Str/Agi/Con/Int/Wis/Cha) and current resources
// (Hp_curr/Mp_curr/Sta_curr). All DERIVED stats are recomputed here on every
// VARIABLE_UPDATE_ENDED, so the model can never drift them and never double-applies.
// Formulas mirror the GUI's recalculateDerivedStats() exactly (see <character_attributes_system>
// and rpg-statusmenu.html), so the panel and the saved state always agree — even when the
// status panel iframe is closed, which is exactly when the AI reads CURRENT_VARIABLE_DATA.
// Idempotent: it only writes fields that actually change, so re-firing the event is a no-op
// (no recompute loop).
// =====================================================================================
const RPG_RECOMPUTE_VERSION = 'v1.0';

const _isTuple = (v) => Array.isArray(v) && v.length >= 2 && typeof v[1] === 'string';
const _num = (v) => { const n = _isTuple(v) ? v[0] : v; const x = Number(n); return Number.isFinite(x) ? x : 0; };
const _getN = (obj, key, def) => {
  if (!obj || !(key in obj)) return def;
  const v = obj[key]; const n = _isTuple(v) ? v[0] : v; const x = Number(n);
  return Number.isFinite(x) ? x : def;
};
const _setN = (obj, key, val) => {
  const cur = obj[key];
  if (_isTuple(cur)) { if (cur[0] !== val) { obj[key] = [val, cur[1]]; return 1; } return 0; }
  if (cur !== val) { obj[key] = val; return 1; }
  return 0;
};

function recomputeCharDerived(c) {
  if (!c || typeof c !== 'object') return 0;
  const Lvl = _getN(c, 'Level', 1), Con = _getN(c, 'Constitution', 0), Str = _getN(c, 'Strength', 0),
        Agi = _getN(c, 'Agility', 0), Int = _getN(c, 'Intelligence', 0), Wis = _getN(c, 'Wisdom', 0);

  let eqHP = 0, eqMP = 0, eqPAtk = 0, eqMAtk = 0, eqPDef = 0, eqMDef = 0;
  if (c.Equipment && typeof c.Equipment === 'object') {
    for (const item of Object.values(c.Equipment)) {
      if (item && typeof item === 'object') {
        eqHP += Number(item.MaxHPBonus || 0); eqMP += Number(item.MaxMPBonus || 0);
        eqPAtk += Number(item.WeaponDamage || 0); eqMAtk += Number(item.WeaponMagDamage || 0);
        eqPDef += Number(item.ArmorPDefBonus || 0); eqMDef += Number(item.ArmorMDefBonus || 0);
      }
    }
  }

  const oldMaxHp = _getN(c, 'Hp_max', 0), oldMaxMp = _getN(c, 'Mp_max', 0), oldMaxSta = _getN(c, 'Sta_max', 0);

  const Hp_max  = Math.floor(20 + (Con * 3) + (Lvl * 6)) + eqHP;
  const Sta_max = Math.floor(50 + (Con * 3) + (Agi * 2) + Math.floor((Lvl * 5) / 3));
  const Mp_max  = Math.floor((50 + (Int * 4) + (Wis * 2) + (Lvl * 5)) / 3) + eqMP;
  const P_Atk = Math.floor((Str * 2) + (Lvl * 2)) + eqPAtk;
  const M_Atk = Math.floor((Int * 2) + (Lvl * 2)) + eqMAtk;
  const P_Def = Math.floor((Con / 2) + (Lvl * 3)) + eqPDef;
  const M_Def = Math.floor((Wis / 2) + (Lvl * 3)) + eqMDef;
  const M_Ast = Math.floor((Wis * 1.5) + (Int * 0.5) + (Lvl * 1.5));

  let changed = 0;
  changed += _setN(c, 'Hp_max', Hp_max);
  changed += _setN(c, 'Mp_max', Mp_max);
  changed += _setN(c, 'Sta_max', Sta_max);
  changed += _setN(c, 'Physical_attack', P_Atk);
  changed += _setN(c, 'Magic_attack', M_Atk);
  changed += _setN(c, 'Physical_defense', P_Def);
  changed += _setN(c, 'Magic_defense', M_Def);
  changed += _setN(c, 'Magic_assist', M_Ast);

  // Level-up adjustment: grow current resources by the gain in their max (mirror GUI).
  if (oldMaxHp > 0)  changed += _setN(c, 'Hp_curr',  Math.max(0, _getN(c, 'Hp_curr', 0)  + (Hp_max  - oldMaxHp)));
  if (oldMaxMp > 0)  changed += _setN(c, 'Mp_curr',  Math.max(0, _getN(c, 'Mp_curr', 0)  + (Mp_max  - oldMaxMp)));
  if (oldMaxSta > 0) changed += _setN(c, 'Sta_curr', Math.max(0, _getN(c, 'Sta_curr', 0) + (Sta_max - oldMaxSta)));

  // Clamp current <= max.
  if (_getN(c, 'Hp_curr', 0)  > Hp_max)  changed += _setN(c, 'Hp_curr', Hp_max);
  if (_getN(c, 'Mp_curr', 0)  > Mp_max)  changed += _setN(c, 'Mp_curr', Mp_max);
  if (_getN(c, 'Sta_curr', 0) > Sta_max) changed += _setN(c, 'Sta_curr', Sta_max);

  return changed;
}

function onRpgVariableUpdateEnded(variables) {
  try {
    const stat = variables && variables.stat_data;
    if (!stat || typeof stat !== 'object' || !stat.Mainchar) return; // RPG cards only
    let changed = 0, chars = 0;
    changed += recomputeCharDerived(stat.Mainchar); chars++;
    if (stat.Familiar && typeof stat.Familiar === 'object') {
      for (const [key, fam] of Object.entries(stat.Familiar)) {
        if (key === '$meta' || key === 'template') continue;
        if (fam && typeof fam === 'object' && ('Level' in fam || 'Constitution' in fam)) {
          changed += recomputeCharDerived(fam); chars++;
        }
      }
    }
    if (changed > 0) console.log(`[RPG Recompute ${RPG_RECOMPUTE_VERSION}] recomputed ${chars} character(s), ${changed} field(s).`);
  } catch (e) {
    console.error('[RPG Recompute] failed:', e);
  }
}

let _rpgRecomputeInit = false;
function _rpgRecomputeStart() {
  if (_rpgRecomputeInit) return;
  const Mvu = (typeof window !== 'undefined') && (window.Mvu || (window.parent && window.parent.Mvu) || (window.top && window.top.Mvu));
  if (Mvu && Mvu.events && Mvu.events.VARIABLE_UPDATE_ENDED && typeof eventOn === 'function') {
    eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, onRpgVariableUpdateEnded);
    _rpgRecomputeInit = true;
    console.log(`[RPG Recompute] ${RPG_RECOMPUTE_VERSION} started.`);
  } else {
    setTimeout(_rpgRecomputeStart, 1000);
  }
}
$(() => setTimeout(_rpgRecomputeStart, 500));
$(window).on('unload', () => {
  const Mvu = (typeof window !== 'undefined') && (window.Mvu || (window.parent && window.parent.Mvu) || (window.top && window.top.Mvu));
  if (Mvu && Mvu.events && typeof eventRemoveListener === 'function') {
    try { eventRemoveListener(Mvu.events.VARIABLE_UPDATE_ENDED, onRpgVariableUpdateEnded); } catch (e) {}
  }
  _rpgRecomputeInit = false;
});
