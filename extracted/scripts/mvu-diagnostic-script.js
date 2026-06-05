/**
 * 世界書《創世域沉淪詩篇》專屬變量監護系統 - Mvu對象結構終極診斷腳本
 * Tavern Helper 全局腳本 v-Final-Debug
 *
 * @description
 * 這是一個診斷專用腳本，它不執行任何遊戲邏輯修正。
 * 它的唯一作用是，在變量更新結束后，捕獲 Mvu 實例 (即“遊戲管理員工具箱”)，並將其完整的內部結構打印到開發者控制台中。
 * 這是解決“找不到 addCommands 函數”這一終極問題的唯一正確途徑。
 */

// --- 全局配置 ---
const SCRIPT_NAME = '創世域沉淪詩篇-Mvu終極診斷腳本';
const SCRIPT_VERSION = 'v-Final-Debug';

let scriptInitialized = false;
let hasLogged = false; // 添加一個標誌位，確保只打印一次，避免信息刷屏

// --- 輔助函數 ---
function getMvuInstance() { try { return window.Mvu || window.parent?.Mvu || window.top?.Mvu || null; } catch (e) { return null; } }

// --- 主診斷函數 ---
function onVariableUpdateEnded(variables) {
    if (hasLogged) return; // 如果已經記錄過，就直接退出，避免重複輸出

    console.log(`[${SCRIPT_NAME}] 事件已觸發，正在嘗試捕獲並分析 Mvu 實例...`);

    const Mvu = getMvuInstance();
    
    if (Mvu) {
        hasLogged = true; // 標記為已成功記錄
        console.log(`%c[${SCRIPT_NAME}] [成功捕獲] Mvu 實例已找到！正在打印其完整結構...`, 'color: #4CAF50; font-weight: bold;');
        console.log('------------------- Mvu 實例(“管理員工具箱”) 結 構 分 析 開 始 -------------------');

        // 打印完整的 Mvu 對象，這是最有價值的信息
        console.log('[診斷] 完整的 Mvu 對象本身:', Mvu);

        // 嘗試遍歷並打印 Mvu 對象的第一層所有屬性和方法的名稱
        try {
            console.log('[診斷] Mvu 對象的第一層鍵名 (Keys):', Object.keys(Mvu));
        } catch (e) {
            console.error('[診斷] 無法獲取 Mvu.keys', e);
        }
        
        console.log('------------------- Mvu 實例(“管理員工具箱”) 結 構 分 析 結 束 -------------------');
        console.log(`%c[${SCRIPT_NAME}] 診斷完成。請將以上 "-----" 分割線內的所有內容，全部複製併發送給我。`, 'color: #FF5722; font-weight: bold;');
    } else {
        console.log(`[${SCRIPT_NAME}] 在本次事件中未能捕獲到 Mvu 實例，仍在等待...`);
    }
}

// --- 腳本生命周期管理 ---
function initializeEventListeners() {
    if (scriptInitialized) return;
    const Mvu = getMvuInstance();
    if (Mvu && Mvu.events) {
        eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, onVariableUpdateEnded);
        scriptInitialized = true;
        console.log(`[${SCRIPT_NAME}] ${SCRIPT_VERSION} 已啟動，正等待變量更新事件以進行診斷...`);
    } else {
        setTimeout(initializeEventListeners, 2000);
    }
}

function cleanup() {
    const Mvu = getMvuInstance();
    if (Mvu && scriptInitialized) {
        eventRemoveListener(Mvu.events.VARIABLE_UPDATE_ENDED, onVariableUpdateEnded);
        scriptInitialized = false;
        console.log(`[${SCRIPT_NAME}] 腳本已卸載。`);
    }
}

$(() => {
    setTimeout(initializeEventListeners, 1000);
});
$(window).on('unload', cleanup);
