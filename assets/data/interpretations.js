/**
 * Star Interpretations Database
 * 
 * Provides concise interpretations (≤20 characters) for:
 * - Primary Stars (主星)
 * - Secondary Stars (輔星)
 * - Minor Stars (雜曜)
 * - Twelve Life Stages (十二長生)
 * - Empty Palace (空宮)
 * - Star + Mutation Combinations (主輔星四化)
 * 
 * Each entry includes:
 * - text: Brief interpretation (≤20 chars)
 * - link: URL for tutorial articles
 * 
 * Dependencies: None
 * 
 * Exports: window.ziweiInterpretations
 */

'use strict';

(function() {

    // ============================================================================
    // Palaces (37 entries: 12 natal + body + 12 major + 12 annual)
    // ============================================================================
    // Shared link for palace interpretations
    const SHARED_PALACE_LINK = 'https://little-yin.com/2021/06/13/intro1/';
    const NATAL_PALACES = {
        '命宮': { text: '總體命運、性格、外在明顯特徵', link: SHARED_PALACE_LINK },
        '兄弟': { text: '與兄弟及朋友的關係及狀況', link: SHARED_PALACE_LINK },
        '夫妻': { text: '配偶特質及感情婚姻狀況', link: SHARED_PALACE_LINK },
        '子女': { text: '與子女的關係及狀況', link: SHARED_PALACE_LINK },
        '財帛': { text: '價值觀', link: SHARED_PALACE_LINK },
        '疾厄': { text: '體質強弱、健康狀況', link: SHARED_PALACE_LINK },
        '遷移': { text: '所在環境的狀況', link: SHARED_PALACE_LINK },
        '交友': { text: '與下屬和人際圈的關係及狀況', link: SHARED_PALACE_LINK },
        '僕役': { text: '與下屬和人際圈的關係及狀況', link: SHARED_PALACE_LINK },
        '奴僕': { text: '與下屬和人際圈的關係及狀況', link: SHARED_PALACE_LINK },
        '官祿': { text: '行事手法', link: SHARED_PALACE_LINK },
        '事業': { text: '行事手法', link: SHARED_PALACE_LINK },
        '田宅': { text: '居住環境、家運及財富積累的情況', link: SHARED_PALACE_LINK },
        '福德': { text: '內在的思想和性格', link: SHARED_PALACE_LINK },
        '父母': { text: '與父母和上司的關係及狀況', link: SHARED_PALACE_LINK }
    };

    const BODY_PALACE = {
        '身宮': { text: '增加宮位的關注程度，後天常執行的事情', link: SHARED_PALACE_LINK }
    };

    const MAJOR_PALACES = {
        '大限命宮': { text: '大限的總體命運', link: SHARED_PALACE_LINK },
        '大限父母': { text: '大限期間與父母和上司的關係及狀況', link: SHARED_PALACE_LINK },
        '大限福德': { text: '大限期間的內在的思想和性格', link: SHARED_PALACE_LINK },
        '大限田宅': { text: '大限期間的居住環境、家運及財富', link: SHARED_PALACE_LINK },
        '大限官祿': { text: '大限期間的行事手法', link: SHARED_PALACE_LINK },
        '大限事業': { text: '大限期間的行事手法', link: SHARED_PALACE_LINK },
        '大限交友': { text: '大限期間的人際關係', link: SHARED_PALACE_LINK },
        '大限僕役': { text: '大限期間的人際關係', link: SHARED_PALACE_LINK },
        '大限奴僕': { text: '大限期間的人際關係', link: SHARED_PALACE_LINK },
        '大限遷移': { text: '大限期間的所在環境的狀況', link: SHARED_PALACE_LINK },
        '大限疾厄': { text: '大限期間的健康狀況', link: SHARED_PALACE_LINK },
        '大限財帛': { text: '大限期間奉行的價值觀', link: SHARED_PALACE_LINK },
        '大限子女': { text: '大限期間與子女的關係及狀況', link: SHARED_PALACE_LINK },
        '大限夫妻': { text: '大限期間與夫妻的關係及感情狀況', link: SHARED_PALACE_LINK },
        '大限兄弟': { text: '大限期間與兄弟及朋友的關係', link: SHARED_PALACE_LINK }
    };

    const ANNUAL_PALACES = {
        '流年命宮': { text: '流年的總體命運', link: SHARED_PALACE_LINK },
        '流年父母': { text: '流年期間與父母和上司的關係及狀況', link: SHARED_PALACE_LINK },
        '流年福德': { text: '流年期間的內在的思想和性格', link: SHARED_PALACE_LINK },
        '流年田宅': { text: '流年期間的居住環境、家運及財富', link: SHARED_PALACE_LINK },
        '流年官祿': { text: '流年期間的行事手法', link: SHARED_PALACE_LINK },
        '流年事業': { text: '流年期間的行事手法', link: SHARED_PALACE_LINK },
        '流年交友': { text: '流年期間的人際關係', link: SHARED_PALACE_LINK },
        '流年奴僕': { text: '流年期間的人際關係', link: SHARED_PALACE_LINK },
        '流年僕役': { text: '流年期間的人際關係', link: SHARED_PALACE_LINK },
        '流年遷移': { text: '流年期間的所在環境的狀況', link: SHARED_PALACE_LINK },
        '流年疾厄': { text: '流年期間的健康狀況', link: SHARED_PALACE_LINK },
        '流年財帛': { text: '流年期間奉行的價值觀', link: SHARED_PALACE_LINK },
        '流年子女': { text: '流年期間與子女的關係及狀況', link: SHARED_PALACE_LINK },
        '流年夫妻': { text: '流年期間與夫妻的關係及感情狀況', link: SHARED_PALACE_LINK },
        '流年兄弟': { text: '流年期間與兄弟及朋友的關係', link: SHARED_PALACE_LINK }
    };

    const ALL_PALACES = {
        ...NATAL_PALACES,
        ...BODY_PALACE,
        ...MAJOR_PALACES,
        ...ANNUAL_PALACES
    };

    // ============================================================================
    // Primary Stars (主星) - 14 Main Stars
    // ============================================================================
    const PRIMARY_STARS = {
        '紫微': {
            text: '象徵皇帝，代表喜惡隨心，固執，領導力',
            link: 'https://little-yin.com/2022/01/14/ziwei/'
        },
        '天機': {
            text: '象徵謀士，代表聰明靈巧，多學少精，善於變通',
            link: 'https://little-yin.com/2022/01/28/nunki/'
        },
        '太陽': {
            text: '象徵太陽，代表消耗，付出，群眾',
            link: 'https://little-yin.com/2022/02/11/sun/'
        },
        '武曲': {
            text: '象徵總帥，主執行力、短慮與實際效益',
            link: 'https://little-yin.com/2022/02/25/military/'
        },
        '天同': {
            text: '象徵小孩，主任性程度，精神享受與福氣',
            link: 'https://little-yin.com/2022/03/11/child/'
        },
        '廉貞': {
            text: '象徵宗族，主倫理忠貞、精神理想與重視血緣的程度',
            link: 'https://little-yin.com/2022/03/25/clan/'
        },
        '天府': {
            text: '象徵王府，性格含蓄保守、主守成，意志力與財庫',
            link: 'https://little-yin.com/2022/04/08/lord/'
        },
        '太陰': {
            text: '象徵女性，主思慮、計劃與女性親屬',
            link: 'https://little-yin.com/2022/04/22/moon/'
        },
        '貪狼': {
            text: '象徵外交官，主溝通、成熟進取、慾望',
            link: 'https://little-yin.com/2022/05/06/sirius/'
        },
        '巨門': {
            text: '象徵幕僚，有如山洞，主低調潛藏與收藏',
            link: 'https://little-yin.com/2022/05/20/cave/'
        },
        '天相': {
            text: '象徵玉璽，性格謹慎、忠誠、守規矩，主執行',
            link: 'https://little-yin.com/2022/06/03/seal/'
        },
        '天梁': {
            text: '象徵法官，代表原則、獨見、喜照顧人，主公允與蔭庇',
            link: 'https://little-yin.com/2022/06/17/judge/'
        },
        '七殺': {
            text: '象徵指揮官，性格剛猛、力爭上游、孤獨唏噓，主競爭',
            link: 'https://little-yin.com/2022/07/01/commander/'
        },
        '破軍': {
            text: '象徵前鋒，性格親力親為、主犧牲與重建',
            link: 'https://little-yin.com/2022/07/15/soldier/'
        }
    };

    // ============================================================================
    // Empty Palace (空宮)
    // ============================================================================
    const EMPTY_PALACE = {
        text: '無主星較易受環境影響',
        link: 'https://little-yin.com/tag/%e5%91%bd%e7%84%a1%e4%b8%bb%e6%98%9f/'
    };

    // ============================================================================
    // Secondary Stars (輔星) - Auxiliary Stars
    // ============================================================================
    const SECONDARY_STARS = {
        '左輔': {
            text: '貴人星，代表主動尋求幫助、納諫與助力',
            link: 'https://little-yin.com/2021/11/19/help/'
        },
        '右弼': {
            text: '貴人星，代表被動接受他人介入、納諫與助力',
            link: 'https://little-yin.com/2021/11/19/help/'
        },
        '文昌': {
            text: '文曜，偏向理性，主正統學術與科名',
            link: 'https://little-yin.com/2021/11/05/secondary1/'
        },
        '文曲': {
            text: '文曜，偏向感性，主口才、技巧、才藝與表達',
            link: 'https://little-yin.com/2021/11/05/secondary1/'
        },
        '天魁': {
            text: '象徵實質利益的機遇，氣質偏文雅',
            link: 'https://little-yin.com/2021/12/03/opportunity/'
        },
        '天鉞': {
            text: '象徵實質利益的機遇，氣質偏勇武',
            link: 'https://little-yin.com/2021/12/03/opportunity/'
        },
        '祿存': {
            text: '主穩定進財，氣質收斂保守，願意助人',
            link: 'https://little-yin.com/2021/12/17/accumulate/'
        },
        '擎羊': {
            text: '形象是刀刃，主剛強果斷、積極進取、奪取',
            link: 'https://little-yin.com/2021/12/17/accumulate/'
        },
        '陀羅': {
            text: '形象是陀螺，代表持久、拖累、持續和延遲',
            link: 'https://little-yin.com/2021/12/17/accumulate/'
        },
        '火星': {
            text: '象徵衝擊與破壞的力量，主突發',
            link: 'https://little-yin.com/2021/12/31/impact/'
        },
        '鈴星': {
            text: '象徵衝擊與破壞的力量，主紛擾',
            link: 'https://little-yin.com/2021/12/31/impact/'
        },
        '地空': {
            text: '象徵廣闊的空地，主清除、顛倒與反傳統',
            link: 'https://little-yin.com/2021/11/05/secondary1/'
        },
        '地劫': {
            text: '象徵一個坑，主清除、顛倒與反傳統',
            link: 'https://little-yin.com/2021/11/05/secondary1/'
        }
    };

    // ============================================================================
    // Minor Stars (雜曜) - Miscellaneous Stars
    // ============================================================================
    const MINOR_STARS = {
        '天官': {
            text: '主職位地位'
        },
        '天福': {
            text: '主福氣'
        },
        '天廚': {
            text: '主飲食享受'
        },
        '截空': {
            text: '主中斷'
        },
        '副截': {
            text: '主中斷，力量較弱'
        },
        '旬空': {
            text: '主不了了之'
        },
        '副旬': {
            text: '主不了了之，力量較弱'
        },
        '天馬': {
            text: '主活動，變化，走動'
        },
        '天空': {
            text: '想法獨特，廣闊空襟'
        },
        '天哭': {
            text: '主悲傷哭泣'
        },
        '天虛': {
            text: '主虛無、損失'
        },
        '紅鸞': {
            text: '主婚姻'
        },
        '天喜': {
            text: '主喜慶'
        },
        '孤辰': {
            text: '主寂寞'
        },
        '寡宿': {
            text: '主獨處'
        },
        '劫殺': {
            text: '主打擊和傷害'
        },
        '大耗': {
            text: '主耗損，花費'
        },
        '蜚廉': {
            text: '主閒言閒語'
        },
        '破碎': {
            text: '主心情破碎'
        },
        '華蓋': {
            text: '宗教、啟發'
        },
        '咸池': {
            text: '性福、桃花'
        },
        '龍德': {
            text: '高尚品德'
        },
        '月德': {
            text: '女德星，溫柔賢淑'
        },
        '天德': {
            text: '父親庇佑'
        },
        '年解': {
            text: '主解厄化煞'
        },
        '天才': {
            text: '主聰明才智'
        },
        '天壽': {
            text: '主長壽健康'
        },
        '龍池': {
            text: '工藝、典雅、建築物'
        },
        '鳳閣': {
            text: '工藝、典雅、建築物'
        },
        '天刑': {
            text: '主戒律，法律'
        },
        '天姚': {
            text: '幽默，輕佻，有趣'
        },
        '解神': {
            text: '化解災厄'
        },
        '天巫': {
            text: '主中介、宗教'
        },
        '天月': {
            text: '主疾病纏身'
        },
        '陰煞': {
            text: '小人暗害'
        },
        '天傷': {
            text: '主傷害損失'
        },
        '天使': {
            text: '主傷害損失'
        },
        '台輔': {
            text: '提高名譽地位'
        },
        '封誥': {
            text: '賞賜'
        },
        '三台': {
            text: '排場，人多勢眾'
        },
        '八座': {
            text: '排場，人多勢眾'
        },
        '恩光': {
            text: '主恩惠福澤'
        },
        '天貴': {
            text: '主尊貴榮顯'
        }
    };

    // ============================================================================
    // Twelve Life Stages (十二長生)
    // ============================================================================
    // Shared link for life stages interpretations
    const SHARED_LIFE_STAGE_LINK = 'https://little-yin.com/2022/11/04/status/';

    const TWELVE_STAGES = {
        '長生': {
            text: '充滿生命力，主星的能量持續不斷',
            link: SHARED_LIFE_STAGE_LINK
        },
        '沐浴': {
            text: '去除了雜質，展現本性',
            link: SHARED_LIFE_STAGE_LINK
        },
        '冠帶': {
            text: '接受禮教，成熟的開端',
            link: SHARED_LIFE_STAGE_LINK
        },
        '臨官': {
            text: '充滿上升的動力',
            link: SHARED_LIFE_STAGE_LINK
        },
        '帝旺': {
            text: '鼎盛時期，活力達到頂峰',
            link: SHARED_LIFE_STAGE_LINK
        },
        '衰': {
            text: '體力開始下降，但智慧依然豐富',
            link: SHARED_LIFE_STAGE_LINK
        },
        '病': {
            text: '體力進一步下降，健康問題',
            link: SHARED_LIFE_STAGE_LINK
        },
        '死': {
            text: '活動力的停止',
            link: SHARED_LIFE_STAGE_LINK
        },
        '墓': {
            text: '收藏、隱藏，有積蓄之意',
            link: SHARED_LIFE_STAGE_LINK
        },
        '絕': {
            text: '氣數已盡',
            link: SHARED_LIFE_STAGE_LINK
        },
        '胎': {
            text: '充滿希望而脆弱',
            link: SHARED_LIFE_STAGE_LINK
        },
        '養': {
            text: '培育、滋養，等待時機',
            link: SHARED_LIFE_STAGE_LINK
        }
    };

    // ============================================================================
    // Star + Mutation Combinations (主輔星四化) - 40+ entries
    // ============================================================================
    const STAR_MUTATIONS = {
        // 甲
        '廉貞化祿': { text: '建立新想法，新制度', link: 'https://little-yin.com/2022/07/29/mutation/' },
        '破軍化權': { text: '行動焦點集中', link: 'https://little-yin.com/2022/07/29/mutation/' },
        '武曲化科': { text: '短期判斷力增加', link: 'https://little-yin.com/2022/07/29/mutation/' },
        '太陽化忌': { text: '男性或環境去舊迎新', link: 'https://little-yin.com/2022/07/29/mutation/' },
        // 乙
        '天機化祿': { text: '機會，靈感增多', link: 'https://little-yin.com/2022/07/29/mutation/' },
        '天梁化權': { text: '執緊原則', link: 'https://little-yin.com/2022/07/29/mutation/' },
        '紫微化科': { text: '聰明的學習能力', link: 'https://little-yin.com/2022/07/29/mutation/' },
        '太陰化忌': { text: '母親、積蓄計劃等的損耗', link: 'https://little-yin.com/2022/07/29/mutation/' },
        // 丙
        '天同化祿': { text: '安逸享福的意欲增加，', link: 'https://little-yin.com/2022/07/29/mutation/' },
        '天機化權': { text: '機遇落實', link: 'https://little-yin.com/2022/07/29/mutation/' },
        '文昌化科': { text: '文書順利、枱面上的道理', link: 'https://little-yin.com/2022/07/29/mutation/' },
        '廉貞化忌': { text: '宗族、血、禮教的災禍', link: 'https://little-yin.com/2022/07/29/mutation/' },
        // 丁
        '太陰化祿': { text: '思慮增加', link: 'https://little-yin.com/2022/07/29/mutation/' },
        '天同化權': { text: '減少逸樂，專注務實', link: 'https://little-yin.com/2022/07/29/mutation/' },
        '天機化科': { text: '短促的機會，潮流', link: 'https://little-yin.com/2022/07/29/mutation/' },
        '巨門化忌': { text: '是非爭執，招人怨恨', link: 'https://little-yin.com/2022/07/29/mutation/' },
        // 戊
        '貪狼化祿': { text: '積極進取，多才多藝', link: 'https://little-yin.com/2022/07/29/mutation/' },
        '太陰化權': { text: '計劃的推行', link: 'https://little-yin.com/2022/07/29/mutation/' },
        '太陽化科': { text: '表面、表演性的消費、照顧、宣傳', link: 'https://little-yin.com/2022/07/29/mutation/' },
        '天機化忌': { text: '錯失機會，後悔', link: 'https://little-yin.com/2022/07/29/mutation/' },
        // 己
        '武曲化祿': { text: '執行順利，務實，當機立斷', link: 'https://little-yin.com/2022/07/29/mutation/' },
        '貪狼化權': { text: '做事圓滑，目標明確', link: 'https://little-yin.com/2022/07/29/mutation/' },
        '天梁化科': { text: '清高公正，助人為樂', link: 'https://little-yin.com/2022/07/29/mutation/' },
        '文曲化忌': { text: '溝通失誤，心情不快', link: 'https://little-yin.com/2022/07/29/mutation/' },
        // 庚
        '太陽化祿': { text: '支出增加，增進名聲', link: 'https://little-yin.com/2022/07/29/mutation/' },
        '武曲化權': { text: '權力、決定調度準確', link: 'https://little-yin.com/2022/07/29/mutation/' },
        '天府化科': { text: '良好名聲和信譽', link: 'https://little-yin.com/2022/07/29/mutation/' },
        '天同化忌': { text: '無福消受，難以享樂', link: 'https://little-yin.com/2022/07/29/mutation/' },
        // 辛
        '巨門化祿': { text: '藏量增加，或口才提升', link: 'https://little-yin.com/2022/07/29/mutation/' },
        '太陽化權': { text: '焦點聚焦自己，或消費、付出有道', link: 'https://little-yin.com/2022/07/29/mutation/' },
        '文曲化科': { text: '表演藝術或情感表達能力提升', link: 'https://little-yin.com/2022/07/29/mutation/' },
        '文昌化忌': { text: '文書失誤，理性不足', link: 'https://little-yin.com/2022/07/29/mutation/' },
        // 壬
        '天梁化祿': { text: '逢凶化吉，助人得財', link: 'https://little-yin.com/2022/07/29/mutation/' },
        '紫微化權': { text: '非常時期的權力集中，固執', link: 'https://little-yin.com/2022/07/29/mutation/' },
        // 天府化科重覆四化，不再定義
        '武曲化忌': { text: '中斷休息，失去，周轉困難', link: 'https://little-yin.com/2022/07/29/mutation/' },
        // 癸
        '破軍化祿': { text: '開創新局面', link: 'https://little-yin.com/2022/07/29/mutation/' },
        '巨門化權': { text: '心情堅實，自信', link: 'https://little-yin.com/2022/07/29/mutation/' },
        '太陰化科': { text: '行內、熟絡圈子中的信譽', link: 'https://little-yin.com/2022/07/29/mutation/' },
        '貪狼化忌': { text: '感情失意，不得所求', link: 'https://little-yin.com/2022/07/29/mutation/' },
        // 非預設四化選項
        // 甲年四化 - 非預設選項
        // 沒有不重覆的四化組合
        // 戊年四化 - 非預設選項
        '右弼化科': { text: '本門派沒有這四化，不懂解釋', link: 'https://little-yin.com/2022/07/29/mutation/' },
        // 庚年四化 - 非預設選項
        '天同化科': { text: '本門派沒有這四化，不懂解釋', link: 'https://little-yin.com/2022/07/29/mutation/' },
        '天相化忌': { text: '本門派沒有這四化，不懂解釋', link: 'https://little-yin.com/2022/07/29/mutation/' },
        // 辛年四化 - 非預設選項
        '武曲化科': { text: '本門派沒有這四化，不懂解釋', link: 'https://little-yin.com/2022/07/29/mutation/' },
        // 壬年四化 - 非預設選項
        '左輔化科': { text: '本門派沒有這四化，不懂解釋', link: 'https://little-yin.com/2022/07/29/mutation/' },
        // 癸年四化 - 非預設選項
        '太陽化科': { text: '本門派沒有這四化，不懂解釋', link: 'https://little-yin.com/2022/07/29/mutation/' }
    };

    // ============================================================================
    // Public Functions
    // ============================================================================
    function getPalaceInterpretation(palaceName) {
        return ALL_PALACES[palaceName] || null;
    }

    function getStarMutationInterpretation(fullName) {
        return STAR_MUTATIONS[fullName] || null;
    }

    /**
     * Get star interpretation (no change)
     */
    function getStarInterpretation(starName) {
        return PRIMARY_STARS[starName] || 
               SECONDARY_STARS[starName] || 
               MINOR_STARS[starName] || 
               null;
    }

    /**
     * Get interpretation for a life stage
     * @param {string} stageName - Name of the stage
     * @returns {Object|null} - {text, link} or null if not found
     */
    function getLifeStageInterpretation(stageName) {
        return TWELVE_STAGES[stageName] || null;
    }

    /**
     * Get empty palace interpretation
     * @returns {Object} - {text, link}
     */
    function getEmptyPalaceInterpretation() {
        return EMPTY_PALACE;
    }

    /**
     * Check if a star is a primary star
     * @param {string} starName - Name of the star
     * @returns {boolean}
     */
    function isPrimaryStar(starName) {
        return starName in PRIMARY_STARS;
    }

    /**
     * Check if a star is a secondary star
     * @param {string} starName - Name of the star
     * @returns {boolean}
     */
    function isSecondaryStar(starName) {
        return starName in SECONDARY_STARS;
    }

    /**
     * Check if a star is a minor star
     * @param {string} starName - Name of the star
     * @returns {boolean}
     */
    function isMinorStar(starName) {
        return starName in MINOR_STARS;
    }

    // ============================================================================
    // Module Registration & Export
    // ============================================================================
    const publicAPI = {
        PRIMARY_STARS,
        SECONDARY_STARS,
        MINOR_STARS,
        TWELVE_STAGES,
        ALL_PALACES,
        STAR_MUTATIONS,
        getStarInterpretation,
        getLifeStageInterpretation,
        getEmptyPalaceInterpretation,
        getPalaceInterpretation,
        getStarMutationInterpretation,
        isPrimaryStar,
        isSecondaryStar,
        isMinorStar
    };

    // Register with adapter if available
    if (typeof window.registerAdapterModule === 'function') {
        window.registerAdapterModule('interpretations', publicAPI);
    } else {
        window.__ziweiAdapterModules = window.__ziweiAdapterModules || {};
        window.__ziweiAdapterModules['interpretations'] = publicAPI;
    }

    // Global export
    window.ziweiInterpretations = {
        PRIMARY_STARS,
        SECONDARY_STARS,
        MINOR_STARS,
        TWELVE_STAGES,
        ALL_PALACES,
        STAR_MUTATIONS,
        getStarInterpretation,
        getLifeStageInterpretation,
        getEmptyPalaceInterpretation,
        getPalaceInterpretation,
        getStarMutationInterpretation,
        isPrimaryStar
    };
})();
