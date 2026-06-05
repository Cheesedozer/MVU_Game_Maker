/**
 * 通用角色戰鬥數值監護腳本
 * Tavern Helper 全局腳本 v1.3
 *
 * v1.3 更新日誌:
 * - [泛用性改造] 移除了對固定角色名“埃莉西婭”的依賴，現在腳本可適用於任何自定義創建的角色。
 * - [健壯性提升] 入口檢查邏輯更新，僅驗證核心數據結構是否存在。
 *
 * 功能:
 * - [核心] 自動計算並修正派生屬性。
 * - [核心] 自動處理升級和屬性點分配。
 * - [機制] 自動處理高潮邏輯。
 * - [健壯性] 自動修正各類數值範圍。
 */

// --- 全局配置 ---
const SCRIPT_NAME = '通用角色戰鬥數值監護腳本';
const SCRIPT_VERSION = 'v1.3';
// const CHARACTER_NAME = '埃莉西婭'; // 已廢棄，腳本現在是通用的

// --- 主處理函數 (調度中心) ---
function onVariableUpdateEnded(variables) {
    // [v1.4] 修正數據結構，指向正確的 stat_data 對象
    variables = variables?.stat_data;

    // 確保角色核心數據存在，使其適用於任何角色
    if (!variables?.核心狀態 || !variables?.名字?.[0]) {
        // console.log(`[${SCRIPT_NAME}] 未找到核心數據或角色名，跳過監護。`);
        return;
    }

    try {
        console.log(`[${SCRIPT_NAME}] 開始 v${SCRIPT_VERSION} 監護流程...`);

        // --- 核心數值處理流程 ---
        // 以下所有函數都會直接修改傳入的 `variables` 對象
        processDerivedStats(variables);
        clampStatValues(variables);

        console.log(`[${SCRIPT_NAME}] 監護流程完畢。`);
    } catch (error)
    {
        console.error(`[${SCRIPT_NAME}] 監護事件處理失敗:`, error);
    }
}

/**
 * 核心模塊：根據基礎屬性計算並修正派生屬性
 */
function processDerivedStats(variables) {
    const basePath = `基礎屬性.`;
    const derivedPath = `派生屬性.`;
    const equipmentPath = `裝備服裝`;

    // 1. 獲取裸裝基礎屬性
    const baseStats = {
        strength: parseFloat(_.get(variables, `${basePath}力量[0]`, 0)) || 0,
        agility: parseFloat(_.get(variables, `${basePath}敏捷[0]`, 0)) || 0,
        stamina: parseFloat(_.get(variables, `${basePath}耐力[0]`, 0)) || 0,
        spirit: parseFloat(_.get(variables, `${basePath}精神[0]`, 0)) || 0,
        intelligence: parseFloat(_.get(variables, `${basePath}智力[0]`, 0)) || 0,
        luck: parseFloat(_.get(variables, `${basePath}幸運[0]`, 0)) || 0
    };

    // 2. 計算裝備提供的屬性加成
    const equipmentBonuses = {
        strength: 0, agility: 0, stamina: 0, spirit: 0, intelligence: 0, luck: 0
    };
    const equippedItems = _.get(variables, equipmentPath, {});
    for (const itemName in equippedItems) {
        if (itemName === '$meta' || itemName === 'template') continue; // 跳過元數據
        const item = equippedItems[itemName];
        if (item && item.基礎屬性) {
            equipmentBonuses.strength += parseFloat(item.基礎屬性.力量) || 0;
            equipmentBonuses.agility += parseFloat(item.基礎屬性.敏捷) || 0;
            equipmentBonuses.stamina += parseFloat(item.基礎屬性.耐力) || 0;
            equipmentBonuses.spirit += parseFloat(item.基礎屬性.精神) || 0;
            equipmentBonuses.intelligence += parseFloat(item.基礎屬性.智力) || 0;
            equipmentBonuses.luck += parseFloat(item.基礎屬性.幸運) || 0;
        }
    }

    // 3. 計算最終總屬性
    const totalStats = {
        strength: baseStats.strength + equipmentBonuses.strength,
        agility: baseStats.agility + equipmentBonuses.agility,
        stamina: baseStats.stamina + equipmentBonuses.stamina,
        spirit: baseStats.spirit + equipmentBonuses.spirit,
        intelligence: baseStats.intelligence + equipmentBonuses.intelligence,
        luck: baseStats.luck + equipmentBonuses.luck
    };

    // 4. 根據最終總屬性計算派生屬性
    const derivedStatsFormulas = {
        '生命值.最大值[0]': () => totalStats.stamina * 10,
        '魔力值.最大值[0]': () => totalStats.spirit * 10,
        '精力.最大值[0]': () => (totalStats.stamina * 5) + (totalStats.agility * 5),
        '物理攻擊[0]': () => totalStats.strength * 2.5,
        '物理防禦[0]': () => Math.round(totalStats.stamina * 1.0),
        '魔法攻擊[0]': () => totalStats.intelligence * 2,
        '魔法防禦[0]': () => Math.round((totalStats.spirit * 1.5) + (totalStats.intelligence * 0.5)),
        '閃避率[0]': () => Math.min(totalStats.agility * 0.5, 99),
        '暴擊率[0]': () => parseFloat(((totalStats.agility * 0.2) + (totalStats.luck * 0.3) + (totalStats.intelligence * 0.1)).toFixed(2))
    };

    // 5. 更新派生屬性
    for (const key in derivedStatsFormulas) {
        const path = `${derivedPath}${key}`;
        const currentValue = _.get(variables, path);
        const calculatedValue = derivedStatsFormulas[key]();

        if (typeof currentValue !== 'number' || Math.abs(currentValue - calculatedValue) > 0.01) {
            console.log(`[${SCRIPT_NAME}] [數值修正] ${key}: ${currentValue} -> ${calculatedValue} (基於總屬性)`);
            _.set(variables, path, calculatedValue); // 直接修改 variables 對象
        }
    }
}



/**
 * 健壯性模塊：修正數值範圍
 */
function clampStatValues(variables) {
    const derivedPath = `派生屬性.`;
    const corePath = `核心狀態.`;
    
    // 注意：要從 variables 對象中獲取最新的最大值，因為它們可能在本輪 processDerivedStats 中剛被修正
    const maxHP = _.get(variables, `${derivedPath}生命值.最大值[0]`, 1);
    const maxMP = _.get(variables, `${derivedPath}魔力值.最大值[0]`, 1);
    const maxStamina = _.get(variables, `${derivedPath}精力.最大值[0]`, 1);

    const clampConfigs = [
        { path: `${derivedPath}生命值.當前值`, min: 0, max: maxHP },
        { path: `${derivedPath}魔力值.當前值`, min: 0, max: maxMP },
        { path: `${derivedPath}精力.當前值`, min: 0, max: maxStamina },
    ];

    for (const config of clampConfigs) {
        const value = _.get(variables, config.path);
        if (typeof value === 'number') {
            const clampedValue = Math.max(config.min, Math.min(config.max, value));
            if (clampedValue !== value) {
                console.log(`[${SCRIPT_NAME}] [數值範圍修正] ${config.path}: ${value} -> ${clampedValue}`);
                _.set(variables, config.path, clampedValue);
            }
        }
    }
}

// --- 腳本生命周期管理 (這部分無需更改) ---
let scriptInitialized = false;

function initializeEventListeners() {
    if (scriptInitialized) return;
    const Mvu = window.Mvu || window.parent?.Mvu || window.top?.Mvu;
    if (Mvu) {
        eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, onVariableUpdateEnded);
        scriptInitialized = true;
        console.log(`[${SCRIPT_NAME}] ${SCRIPT_VERSION} 已啟動。`);
    } else {
        setTimeout(initializeEventListeners, 2000);
    }
}

function cleanup() {
    const Mvu = window.Mvu || window.parent?.Mvu || window.top?.Mvu;
    if (Mvu) eventRemoveListener(Mvu.events.VARIABLE_UPDATE_ENDED, onVariableUpdateEnded);
    scriptInitialized = false;
}

$(() => {
    setTimeout(initializeEventListeners, 1000);
});

$(window).on('unload', cleanup);

