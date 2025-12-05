/**
 * Ziwei Doushu Four Mutations System
 * 
 * Default: Zhongzhou School (中州派) for all 10 heavenly stems.
 * Controversial stems (甲、乙、丙、丁、戊、己) have alternative interpretations
 * that users can select.
 * 
 * Dependencies: None
 * 
 * Exports:
 * - window.MutationZhongzhou
 * - window.getMutation
 * - window.getAllMutations
 * - window.updateStemSelections
 * - window.getCurrentStemSelections
 */

'use strict';

// ============================================================================
// Default Zhongzhou School Mutations
// ============================================================================

// Default Zhongzhou School Four Mutations (10 heavenly stems)
const MutationZhongzhou = {
    name: '中州派四化',
    school: 'zhongzhou',

    table: {
        '甲': { 祿: '廉貞', 權: '破軍', 科: '武曲', 忌: '太陽' },
        '乙': { 祿: '天機', 權: '天梁', 科: '紫微', 忌: '太陰' },
        '丙': { 祿: '天同', 權: '天機', 科: '文昌', 忌: '廉貞' },
        '丁': { 祿: '太陰', 權: '天同', 科: '天機', 忌: '巨門' },
        '戊': { 祿: '貪狼', 權: '太陰', 科: '太陽', 忌: '天機' },
        '己': { 祿: '武曲', 權: '貪狼', 科: '天梁', 忌: '文曲' },
        '庚': { 祿: '太陽', 權: '武曲', 科: '天府', 忌: '天同' },
        '辛': { 祿: '巨門', 權: '太陽', 科: '文曲', 忌: '文昌' },
        '壬': { 祿: '天梁', 權: '紫微', 科: '天府', 忌: '武曲' },
        '癸': { 祿: '破軍', 權: '巨門', 科: '太陰', 忌: '貪狼' }
    },

    getMutation: function(tiangan, type) {
        if (!this.table[tiangan]) return null;
        return this.table[tiangan][type];
    },

    getAllMutations: function(tiangan) {
        return this.table[tiangan] || null;
    }
};

// Alternative interpretations for 6 controversial heavenly stems
const ControversialStemInterpretations = {
    // 甲年四化解釋選項
    '甲年四化': {
        'interpretation_1': {
            name: '甲廉破武陽 - 預設',
            school: 'school_a',
            table: { 祿: '廉貞', 權: '破軍', 科: '武曲', 忌: '太陽' }
        },
        'interpretation_2': {
            name: '甲廉破曲陽',
            school: 'school_b',
            table: { 祿: '廉貞', 權: '破軍', 科: '文曲', 忌: '太陽' }
        }
    },

    // 戊年四化解釋選項
    '戊年四化': {
        'interpretation_1': {
            name: '戊貪陰陽機 - 預設',
            school: 'school_a',
            table: { 祿: '貪狼', 權: '太陰', 科: '太陽', 忌: '天機' }
        },
        'interpretation_2': {
            name: '戊貪陰右機',
            school: 'school_b',
            table: { 祿: '貪狼', 權: '太陰', 科: '右弼', 忌: '天機' }
        }
    },

    // 庚年四化解釋選項
    '庚年四化': {
        'interpretation_1': {
            name: '庚陽武府同 - 預設',
            school: 'school_a',
            table: { 祿: '太陽', 權: '武曲', 科: '天府', 忌: '天同' }
        },
        'interpretation_2': {
            name: '庚陽武陰同',
            school: 'school_b',
            table: { 祿: '太陽', 權: '武曲', 科: '太陰', 忌: '天同' }
        },
        'interpretation_3': {
            name: '庚陽武同陰',
            school: 'school_c',
            table: { 祿: '太陽', 權: '武曲', 科: '天同', 忌: '太陰' }
        },
        'interpretation_4': {
            name: '庚陽武同相',
            school: 'school_d',
            table: { 祿: '太陽', 權: '武曲', 科: '天同', 忌: '天相' }
        }
    },

    // 辛年四化解釋選項
    '辛年四化': {
        'interpretation_1': {
            name: '辛巨陽曲昌 - 預設',
            school: 'school_a',
            table: { 祿: '巨門', 權: '太陽', 科: '文曲', 忌: '文昌' }
        },
        'interpretation_2': {
            name: '辛巨陽武昌',
            school: 'school_b',
            table: { 祿: '巨門', 權: '太陽', 科: '武曲', 忌: '文昌' }
        }
    },

    // 壬年四化解釋選項
    '壬年四化': {
        'interpretation_1': {
            name: '壬梁紫府武 - 預設',
            school: 'school_a',
            table: { 祿: '天梁', 權: '紫微', 科: '天府', 忌: '武曲' }
        },
        'interpretation_2': {
            name: '壬梁紫左武',
            school: 'school_b',
            table: { 祿: '天梁', 權: '紫微', 科: '左輔', 忌: '武曲' }
        }
    },

    // 癸年四化解釋選項
    '癸年四化': {
        'interpretation_1': {
            name: '癸破巨陰貪 - 預設',
            school: 'school_a',
            table: { 祿: '破軍', 權: '巨門', 科: '太陰', 忌: '貪狼' }
        },
        'interpretation_2': {
            name: '癸破巨陽貪',
            school: 'school_b',
            table: { 祿: '破軍', 權: '巨門', 科: '太陽', 忌: '貪狼' }
        }
    }
};

// Default interpretations for controversial stems (中州派)
const DefaultControversialInterpretations = {
    '甲': 'interpretation_1', // 中州派解釋
    '戊': 'interpretation_1', // 中州派解釋
    '庚': 'interpretation_1', // 中州派解釋
    '辛': 'interpretation_1', // 中州派解釋
    '壬': 'interpretation_1', // 中州派解釋
    '癸': 'interpretation_1'  // 中州派解釋
};

// Current user selections (will be set by config.js)
let currentStemSelections = { ...DefaultControversialInterpretations };

// Map single heavenly stem to full key (e.g., '甲' -> '甲年四化')
const STEM_KEY_MAP = {
    '甲': '甲年四化',
    '戊': '戊年四化',
    '庚': '庚年四化',
    '辛': '辛年四化',
    '壬': '壬年四化',
    '癸': '癸年四化'
};

// Helper function to get full key from single stem
const getFullKey = (tiangan) => STEM_KEY_MAP[tiangan] || tiangan;

// Helper function to get controversial interpretation
const getControversialInterpretation = (tiangan, interpretationKey, selections = currentStemSelections) => {
    const fullKey = getFullKey(tiangan);
    const interpretations = ControversialStemInterpretations[fullKey];
    
    if (interpretations && selections[tiangan] && interpretations[selections[tiangan]]) {
        return interpretations[selections[tiangan]];
    }
    
    return null;
};

// Initialize selections from adapter if available
function initializeFromAdapter() {
    if (typeof window !== 'undefined' && window.ziweiAdapter && window.ziweiAdapter.settings) {
        try {
            const adapter = window.ziweiAdapter;
            // Load user selections from adapter settings
            const loadedSelections = {};
            Object.keys(DefaultControversialInterpretations).forEach(stem => {
                const settingName = `stemInterpretation_${stem}`;
                const storedValue = adapter.settings.get(settingName);
                if (storedValue) {
                    loadedSelections[stem] = storedValue;
                }
            });
            
            if (Object.keys(loadedSelections).length > 0) {
                currentStemSelections = { ...DefaultControversialInterpretations, ...loadedSelections };
            }
        } catch (e) {
            // Silently fail - use default selections
        }
    }
}

// Initialize on module load
if (typeof window !== 'undefined') {
    // Use setTimeout to ensure adapter is loaded
    setTimeout(initializeFromAdapter, 0);
}

// Helper functions
const getMutation = function(tiangan, type, userSelections = null) {
    const selections = userSelections || currentStemSelections;
    const interpretation = getControversialInterpretation(tiangan, selections[tiangan], selections);
    
    if (interpretation) {
        return interpretation.table[type];
    }

    // Fall back to default Zhongzhou
    return MutationZhongzhou.getMutation(tiangan, type);
};

const getAllMutations = function(tiangan, userSelections = null) {
    const selections = userSelections || currentStemSelections;
    const interpretation = getControversialInterpretation(tiangan, selections[tiangan], selections);
    
    if (interpretation) {
        return interpretation.table;
    }

    // Fall back to default Zhongzhou
    return MutationZhongzhou.getAllMutations(tiangan);
};

const updateStemSelections = function(newSelections) {
    currentStemSelections = { ...DefaultControversialInterpretations, ...newSelections };
    
    // Persist to adapter if available
    if (typeof window !== 'undefined' && window.ziweiAdapter && window.ziweiAdapter.settings) {
        try {
            const adapter = window.ziweiAdapter;
            Object.keys(newSelections).forEach(stem => {
                const settingName = `stemInterpretation_${stem}`;
                adapter.settings.set(settingName, newSelections[stem]);
            });
        } catch (e) {
            // Silently fail - settings not persisted
        }
    }
};

const getCurrentStemSelections = function() {
    return { ...currentStemSelections };
};

const getAvailableInterpretations = function(tiangan) {
    const fullKey = getFullKey(tiangan);
    const interpretations = ControversialStemInterpretations[fullKey];
    return interpretations ? Object.keys(interpretations) : [];
};

const getDefaultInterpretation = function(tiangan) {
    return DefaultControversialInterpretations[tiangan] || 'interpretation_1';
};

const getInterpretationName = function(tiangan, interpretationKey) {
    const fullKey = getFullKey(tiangan);
    const interpretations = ControversialStemInterpretations[fullKey];
    
    if (interpretations && interpretations[interpretationKey]) {
        return interpretations[interpretationKey].name;
    }
    
    return '中州派';
};

// Export functions for testing (in Node.js environment)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        MutationZhongzhou,
        ControversialStemInterpretations,
        DefaultControversialInterpretations,
        getMutation,
        getAllMutations,
        updateStemSelections,
        getCurrentStemSelections,
        getAvailableInterpretations,
        getDefaultInterpretation,
        getInterpretationName
    };
}

// Export to global scope for browser environment
if (typeof window !== 'undefined') {
    window.MutationZhongzhou = MutationZhongzhou;
    window.ControversialStemInterpretations = ControversialStemInterpretations;
    window.DefaultControversialInterpretations = DefaultControversialInterpretations;
    window.getMutation = getMutation;
    window.getAllMutations = getAllMutations;
    window.updateStemSelections = updateStemSelections;
    window.getCurrentStemSelections = getCurrentStemSelections;
    window.getAvailableInterpretations = getAvailableInterpretations;
    window.getDefaultInterpretation = getDefaultInterpretation;
    window.getInterpretationName = getInterpretationName;
    // Only set window.currentStemSelections if it's not already set to prevent accidental reset
    if (!window.currentStemSelections) {
        window.currentStemSelections = currentStemSelections;
    }
}

