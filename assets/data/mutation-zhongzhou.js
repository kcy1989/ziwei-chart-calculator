/**
 * Zhongzhou School Four Mutations Table
 */

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

console.log('Zhongzhou School Four Mutations Table loaded');

