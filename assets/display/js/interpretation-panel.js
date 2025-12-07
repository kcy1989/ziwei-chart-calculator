/**
 * Interpretation Panel Module
 * 
 * Displays detailed palace information when a user clicks on a palace cell.
 * Shows: Stars (with mutations), life stage, palace names (natal/major/annual).
 * 
 * Features:
 * - 4-column layout (item1 | interp1 | item2 | interp2) for compact display
 * - Stars with mutations shown as separate rows
 * - Major/annual cycle stars (流曜) included
 * - Full major/annual cycle mutation support
 * 
 * Dependencies:
 * - assets/js/data-adapter.js (ziweiAdapter)
 * - assets/data/interpretations.js (ziweiInterpretations)
 * - palace-interaction events (ziwei-palace-selected, ziwei-palace-cleared)
 * 
 * Corresponding CSS: assets/display/css/interpretation-panel.css
 * 
 * Exports: window.ziweiInterpretationPanel
 */

'use strict';

(function() {

    // ============================================================================
    // Module State
    // ============================================================================

    let panelElement = null;
    let currentBranchIndex = null;
    let isInitialized = false;

    // ============================================================================
    // Mapping Tables for Cycle Stars
    // ============================================================================

    // Map major/annual cycle star names back to their base star names
    // e.g., 大祿存 -> 祿存, 流昌 -> 文昌
    const CYCLE_STAR_TO_BASE = {
        // Major cycle stars (大限流曜)
        '大祿': '祿存',
        '大羊': '擎羊',
        '大陀': '陀羅',
        '大魁': '天魁',
        '大鉞': '天鉞',
        '大昌': '文昌',
        '大曲': '文曲',
        '大火': '火星',
        '大鈴': '鈴星',
        '大馬': '天馬',
        '大喜': '天喜',
        '大鸞': '紅鸞',
        // Annual cycle stars (流年流曜)
        '流祿': '祿存',
        '流羊': '擎羊',
        '流陀': '陀羅',
        '流魁': '天魁',
        '流鉞': '天鉞',
        '流昌': '文昌',
        '流曲': '文曲',
        '流火': '火星',
        '流鈴': '鈴星',
        '流馬': '天馬',
        '流喜': '天喜',
        '流鸞': '紅鸞',
        // Raw short names from module
        '祿': '祿存',
        '羊': '擎羊',
        '陀': '陀羅',
        '魁': '天魁',
        '鉞': '天鉞',
        '昌': '文昌',
        '曲': '文曲',
        '火': '火星',
        '鈴': '鈴星',
        '馬': '天馬',
        '喜': '天喜',
        '鸞': '紅鸞'
    };

    // Star classification: maps star name to category
    // 'secondary' = Auxiliary Stars (輔星), 'minor' = Miscellaneous Stars (雜曜)
    const STAR_CLASSIFICATION = {
        '祿存': 'secondary',
        '擎羊': 'secondary',
        '陀羅': 'secondary',
        '天魁': 'secondary',
        '天鉞': 'secondary',
        '文昌': 'secondary',
        '文曲': 'secondary',
        '火星': 'secondary',
        '鈴星': 'secondary',
        '左輔': 'secondary',
        '右弼': 'secondary',
        '地空': 'secondary',
        '地劫': 'secondary',
        '天馬': 'minor',
        '天喜': 'minor',
        '紅鸞': 'minor'
    };

    // ============================================================================
    // Utility Functions
    // ============================================================================

    function getAdapterStorage(key) {
        const adapter = window.ziweiAdapter;
        if (!adapter || !adapter.storage || typeof adapter.storage.get !== 'function') {
            return null;
        }
        try {
            return adapter.storage.get(key);
        } catch (e) {
            return null;
        }
    }

    function getInterpretations() {
        return window.ziweiInterpretations || null;
    }

    /**
     * Get current major cycle ming palace index
     */
    function getCurrentMajorCycleMingIndex() {
        if (window.ziweiChartHelpers?.getCurrentMajorCycleMingIndex) {
            return window.ziweiChartHelpers.getCurrentMajorCycleMingIndex();
        }
        // Fallback: check DOM for active major cycle button
        const activeBtn = document.querySelector('.ziwei-major-cycle-button.ziwei-cycle-button-active');
        if (activeBtn) {
            const palaceIndex = parseInt(activeBtn.dataset.palaceIndex, 10);
            if (!isNaN(palaceIndex)) return palaceIndex;
        }
        return null;
    }

    /**
     * Get current annual cycle ming palace index
     * The annual button highlights the palace with matching branch index
     */
    function getCurrentAnnualCycleMingIndex() {
        if (window.ziweiChartHelpers?.getCurrentAnnualCycleMingIndex) {
            return window.ziweiChartHelpers.getCurrentAnnualCycleMingIndex();
        }
        // Fallback: check DOM for active annual cycle button
        const activeBtn = document.querySelector('.ziwei-annual-cycle-row .ziwei-cycle-button-active');
        if (activeBtn) {
            // Get the year from the button's dataset
            const year = parseInt(activeBtn.dataset.year, 10);
            if (!isNaN(year)) {
                // Calculate branch index from year
                // Branch cycle: 子(0), 丑(1), ... 亥(11)
                // Base year: 2024 = 甲辰 (辰 = index 4)
                // Formula: (year - 4) % 12
                const branchIndex = ((year - 4) % 12 + 12) % 12;
                return branchIndex;
            }
            
            // Alternative: parse from stem-branch text
            const stemBranchDiv = activeBtn.querySelector('.ziwei-annual-stem-branch');
            if (stemBranchDiv) {
                const text = stemBranchDiv.textContent || '';
                // Format: "乙卯37歲" - extract second character (branch)
                if (text.length >= 2) {
                    const branchChar = text.charAt(1);
                    const branchNames = window.ziweiConstants.BRANCH_NAMES;
                    const branchIdx = branchNames.indexOf(branchChar);
                    if (branchIdx >= 0) return branchIdx;
                }
            }
        }
        return null;
    }

    /**
     * Get major cycle stem character from active button
     */
    function getMajorCycleStemChar() {
        const activeBtn = document.querySelector('.ziwei-major-cycle-button.ziwei-cycle-button-active');
        if (!activeBtn) return null;
        
        const palaceIndex = parseInt(activeBtn.dataset.palaceIndex, 10);
        if (isNaN(palaceIndex)) return null;
        
        const adapterOutput = getAdapterStorage('adapterOutput');
        if (!adapterOutput) return null;
        
        const sections = adapterOutput.sections || {};
        const palaces = sections.palaces || {};
        const palace = palaces[palaceIndex];
        
        return palace?.stem || null;
    }

    /**
     * Get annual cycle stem character from active button
     */
    function getAnnualCycleStemChar() {
        const activeBtn = document.querySelector('.ziwei-annual-cycle-row .ziwei-cycle-button-active');
        if (!activeBtn) return null;
        
        // Get year from button dataset
        const year = parseInt(activeBtn.dataset.year, 10);
        if (!isNaN(year)) {
            // Calculate stem from year
            // Stem cycle: 甲(0), 乙(1), ... 癸(9)
            // Base year: 2024 = 甲辰 (甲 = index 0)
            // Formula: (year - 4) % 10
            const stemNames = window.ziweiConstants?.STEM_NAMES || ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
            const stemIndex = ((year - 4) % 10 + 10) % 10;
            return stemNames[stemIndex] || null;
        }
        
        // Fallback: parse from stem-branch text
        const stemBranchDiv = activeBtn.querySelector('.ziwei-annual-stem-branch');
        if (stemBranchDiv) {
            const text = stemBranchDiv.textContent || '';
            // Format: "乙卯37歲" - extract first character (stem)
            if (text.length >= 1) {
                return text.charAt(0);
            }
        }
        return null;
    }

    // ============================================================================
    // Data Extraction
    // ============================================================================

    /**
     * Extract palace data for a specific branch index
     * @param {number} branchIndex - The branch index (0-11)
     * @returns {Object} Palace data object
     */
    function extractPalaceData(branchIndex) {
        const adapterOutput = getAdapterStorage('adapterOutput');
        if (!adapterOutput) {
            return null;
        }

        const sections = adapterOutput.sections || {};
        const derived = adapterOutput.derived || {};
        const palaces = sections.palaces || derived.palaces || {};
        const primaryStars = sections.primaryStars || {};
        const secondaryStars = sections.secondaryStars || {};
        const minorStars = sections.minorStars || {};
        const mutations = sections.mutations || {};
        const lifeCycles = sections.lifeCycles || {};

        const palace = palaces[branchIndex];
        if (!palace) {
            return null;
        }

        // Collect primary stars in this palace
        const primaryInPalace = [];
        Object.entries(primaryStars).forEach(([starName, idx]) => {
            if (idx === branchIndex) {
                primaryInPalace.push(starName);
            }
        });

        // Collect secondary stars in this palace
        const secondaryInPalace = [];
        Object.entries(secondaryStars).forEach(([starName, idx]) => {
            if (idx === branchIndex) {
                secondaryInPalace.push(starName);
            }
        });

        // Collect minor stars in this palace
        const minorInPalace = [];
        Object.entries(minorStars).forEach(([starName, placement]) => {
            if (Array.isArray(placement)) {
                if (placement.includes(branchIndex)) {
                    minorInPalace.push(starName);
                }
            } else if (placement === branchIndex) {
                minorInPalace.push(starName);
            }
        });

        // Get twelve life stage for this palace
        // lifeCycles.twelve is indexed by branchIndex -> stage name
        const twelveLongLife = lifeCycles.twelve || {};
        let lifeStage = null;
        
        // Check if twelve is an array (indexed by branchIndex)
        if (Array.isArray(twelveLongLife)) {
            lifeStage = twelveLongLife[branchIndex] || null;
        } else if (typeof twelveLongLife === 'object') {
            // Check if it's {branchIndex: stageName} format
            if (twelveLongLife[branchIndex] !== undefined) {
                lifeStage = twelveLongLife[branchIndex];
            } else {
                // Check if it's {stageName: branchIndex} format
                Object.entries(twelveLongLife).forEach(([stage, idx]) => {
                    if (idx === branchIndex) {
                        lifeStage = stage;
                    }
                });
            }
        }

        // Get natal mutations (byStar)
        const natalMutations = mutations.byStar || {};

        return {
            palace,
            branchIndex,
            primaryStars: primaryInPalace,
            secondaryStars: secondaryInPalace,
            minorStars: minorInPalace,
            natalMutations,
            lifeStage
        };
    }

    /**
     * Get major cycle mutations for the current major cycle
     * @returns {Object} Major cycle mutations (byStar format)
     */
    function getMajorCycleMutations() {
        const stemChar = getMajorCycleStemChar();
        if (!stemChar) return {};
        
        const mutationsModule = window.ziweiAdapter?.getModule?.('mutations');
        if (!mutationsModule || !mutationsModule.calculateMajorCycleMutations) return {};
        
        const result = mutationsModule.calculateMajorCycleMutations(stemChar);
        return result?.byStar || {};
    }

    /**
     * Get annual cycle mutations for the current annual year
     * @returns {Object} Annual cycle mutations (byStar format)
     */
    function getAnnualCycleMutations() {
        const stemChar = getAnnualCycleStemChar();
        if (!stemChar) return {};
        
        const mutationsModule = window.ziweiAdapter?.getModule?.('mutations');
        if (!mutationsModule || !mutationsModule.calculateAnnualCycleMutations) return {};
        
        const result = mutationsModule.calculateAnnualCycleMutations(stemChar);
        return result?.byStar || {};
    }

    /**
     * Get major cycle stars (流曜) for the selected palace
     * @param {number} branchIndex - Palace branch index
     * @returns {Array} Array of {displayName, baseName} objects
     */
    function getMajorCycleStarsInPalace(branchIndex) {
        const majorMingIndex = getCurrentMajorCycleMingIndex();
        if (majorMingIndex === null) return [];
        
        const stemChar = getMajorCycleStemChar();
        if (!stemChar) return [];
        
        const adapterOutput = getAdapterStorage('adapterOutput');
        if (!adapterOutput) return [];
        
        const timeIndex = adapterOutput.indices?.timeIndex ?? 0;
        
        const majorCycleModule = window.ziweiAdapter?.getModule?.('majorCycleStars');
        if (!majorCycleModule || !majorCycleModule.calculateAllMajorCycleStars) return [];
        
        const stemNames = window.ziweiConstants?.STEM_NAMES || ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
        const stemIndex = stemNames.indexOf(stemChar);
        if (stemIndex < 0) return [];
        
        try {
            const rawStars = majorCycleModule.calculateAllMajorCycleStars(stemIndex, majorMingIndex, timeIndex);
            const starsInPalace = [];
            Object.entries(rawStars).forEach(([starName, palaceIdx]) => {
                if (palaceIdx === branchIndex) {
                    // Use base name (without 大 prefix) for display
                    const baseName = CYCLE_STAR_TO_BASE[starName] || starName.replace(/^大/, '');
                    starsInPalace.push({
                        displayName: baseName,
                        baseName: baseName,
                        cycleType: 'major'
                    });
                }
            });
            return starsInPalace;
        } catch (e) {
            return [];
        }
    }

    /**
     * Get annual cycle stars (流曜) for the selected palace
     * @param {number} branchIndex - Palace branch index
     * @returns {Array} Array of {displayName, baseName} objects
     */
    function getAnnualCycleStarsInPalace(branchIndex) {
        const annualMingIndex = getCurrentAnnualCycleMingIndex();
        if (annualMingIndex === null) return [];
        
        const stemChar = getAnnualCycleStemChar();
        if (!stemChar) return [];
        
        const adapterOutput = getAdapterStorage('adapterOutput');
        if (!adapterOutput) return [];
        
        const timeIndex = adapterOutput.indices?.timeIndex ?? 0;
        
        const majorCycleModule = window.ziweiAdapter?.getModule?.('majorCycleStars');
        if (!majorCycleModule || !majorCycleModule.calculateAllMajorCycleStars) return [];
        
        const stemNames = window.ziweiConstants?.STEM_NAMES || ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
        const stemIndex = stemNames.indexOf(stemChar);
        if (stemIndex < 0) return [];
        
        try {
            const rawStars = majorCycleModule.calculateAllMajorCycleStars(stemIndex, annualMingIndex, timeIndex);
            const starsInPalace = [];
            Object.entries(rawStars).forEach(([starName, palaceIdx]) => {
                if (palaceIdx === branchIndex) {
                    // Use base name (without 流 prefix) for display
                    const baseName = CYCLE_STAR_TO_BASE['流' + starName.replace(/^大/, '')] || starName.replace(/^大/, '');
                    starsInPalace.push({
                        displayName: baseName,
                        baseName: baseName,
                        cycleType: 'annual'
                    });
                }
            });
            return starsInPalace;
        } catch (e) {
            return [];
        }
    }

    /**
     * Generate palace names (natal, body, major cycle, annual cycle)
     * @param {number} branchIndex - Palace branch index
     * @returns {Object} Palace names with full titles
     */
    function getPalaceNames(branchIndex) {
        const adapterOutput = getAdapterStorage('adapterOutput');
        if (!adapterOutput) return { natal: '', body: '', major: '', annual: '' };

        const sections = adapterOutput.sections || {};
        const palaces = sections.palaces || {};
        const palace = palaces[branchIndex];

        // Check if this palace is also the body palace
        const derived = adapterOutput.derived || {};
        const isShenPalace = derived.shenPalace && derived.shenPalace.index === branchIndex;

        // Get current palace name settings
        const adapter = window.ziweiAdapter;
        const careerSetting = adapter?.settings?.get?.('palaceNameCareer') || 'career';
        const friendsSetting = adapter?.settings?.get?.('palaceNameFriends') || 'friends';

        // Map settings to display names
        const palaceNameMappings = {
            'career': '事業',
            'official': '官祿',
            'friends': '交友',
            'servants': '奴僕',
            'servants_alt': '僕役'
        };

        const careerName = palaceNameMappings[careerSetting] || '事業';
        const friendsName = palaceNameMappings[friendsSetting] || '交友';

        // Apply user-selected palace name override if applicable
        // Check by palace name instead of index
        let natalName = palace?.name || '';

        if (adapter && adapter.settings && typeof adapter.settings.get === 'function') {
            // For Career Palace (事業, position 4 relative to Ming Palace)
            if (palace?.name === '事業') {
                // Check if this is also Shen Palace, apply combined name if needed
                if (isShenPalace) {
                    const shenCombine = { '事業': '身事', '官祿': '身官' };
                    natalName = shenCombine[careerName] || careerName;
                } else {
                    natalName = careerName;
                }
            }
            // For Friends Palace (交友, position 5 relative to Ming Palace)
            // Note: Friends Palace cannot be Shen Palace per Ziwei system rules, so no Shen combination logic
            else if (palace?.name === '交友') {
                natalName = friendsName;
            }
        }

        // For Shen Palace, use original palace name instead of combined name (legacy logic)
        if (isShenPalace && palace?.name) {
            // Create reverse mapping from combined names to original names
            const reverseCombine = {
                '身命': '命宮',
                '身福': '福德',
                '身事': '事業',
                '身官': '官祿',
                '身夫': '夫妻',
                '身財': '財帛',
                '身遷': '遷移',
            };
            natalName = reverseCombine[palace.name] || palace.name;
        }

        let bodyName = '';
        if (isShenPalace) {
            bodyName = '身宮';
        }

        // Major cycle name - full format
        let majorName = '';
        const majorMingIndex = getCurrentMajorCycleMingIndex();
        if (majorMingIndex !== null) {
            const offset = (branchIndex - majorMingIndex + 12) % 12;
            const majorLabels = [
                '大限命宮',
                '大限父母',
                '大限福德',
                '大限田宅',
                '大限' + careerName,
                '大限' + friendsName,
                '大限遷移',
                '大限疾厄',
                '大限財帛',
                '大限子女',
                '大限夫妻',
                '大限兄弟'
            ];
            majorName = majorLabels[offset] || '';
        }

        // Annual cycle name - full format
        let annualName = '';
        const annualMingIndex = getCurrentAnnualCycleMingIndex();
        if (annualMingIndex !== null) {
            const offset = (branchIndex - annualMingIndex + 12) % 12;
            const annualLabels = [
                '流年命宮',
                '流年父母',
                '流年福德',
                '流年田宅',
                '流年' + careerName,
                '流年' + friendsName,
                '流年遷移',
                '流年疾厄',
                '流年財帛',
                '流年子女',
                '流年夫妻',
                '流年兄弟'
            ];
            annualName = annualLabels[offset] || '';
        }

        return { natal: natalName, body: bodyName, major: majorName, annual: annualName };
    }

    // ============================================================================
    // Table Rendering (4-Column Layout)
    // ============================================================================

    /**
     * Create a single item object for the 4-column layout
     * @param {string} itemText - The item name
     * @param {string} interpretation - The interpretation text
     * @param {string} link - The link URL
     * @returns {Object} Item object
     */
    function createItem(itemText, interpretation, link) {
        return { itemText, interpretation, link: link };
    }

    /**
     * Create a table row with 4 columns (item1 | interp1 | item2 | interp2)
     * @param {Object} item1 - First item {itemText, interpretation, link}
     * @param {Object|null} item2 - Second item or null
     * @returns {HTMLElement} Table row element
     */
    function createTableRow(item1, item2 = null) {
        const row = document.createElement('tr');
        row.className = 'ziwei-interp-row';

        // Item 1 cell
        const itemCell1 = document.createElement('td');
        itemCell1.className = 'ziwei-interp-item';

        if (item1.link) {
            const itemLink1 = document.createElement('a');
            itemLink1.href = item1.link;
            itemLink1.target = '_blank';
            itemLink1.rel = 'noopener noreferrer';
            itemLink1.textContent = item1.itemText;
            itemLink1.className = 'ziwei-interp-link';
            itemCell1.appendChild(itemLink1);
        } else {
            itemCell1.textContent = item1.itemText;
        }

        // Interpretation 1 cell
        const interpCell1 = document.createElement('td');
        interpCell1.className = 'ziwei-interp-text';
        interpCell1.textContent = item1.interpretation;

        row.appendChild(itemCell1);
        row.appendChild(interpCell1);

        // Item 2 cell (or empty)
        const itemCell2 = document.createElement('td');
        itemCell2.className = 'ziwei-interp-item';

        if (item2) {
            if (item2.link) {
                const itemLink2 = document.createElement('a');
                itemLink2.href = item2.link;
                itemLink2.target = '_blank';
                itemLink2.rel = 'noopener noreferrer';
                itemLink2.textContent = item2.itemText;
                itemLink2.className = 'ziwei-interp-link';
                itemCell2.appendChild(itemLink2);
            } else {
                itemCell2.textContent = item2.itemText;
            }
        }

        // Interpretation 2 cell (or empty)
        const interpCell2 = document.createElement('td');
        interpCell2.className = 'ziwei-interp-text';
        if (item2) {
            interpCell2.textContent = item2.interpretation;
        }

        row.appendChild(itemCell2);
        row.appendChild(interpCell2);

        return row;
    }

    /**
     * Create section header row (spans all 4 columns)
     * @param {string} title - Section title
     * @returns {HTMLElement} Header row element
     */
    function createSectionHeader(title) {
        const row = document.createElement('tr');
        row.className = 'ziwei-interp-section-header';
        
        const cell = document.createElement('th');
        cell.colSpan = 4;
        cell.textContent = title;
        row.appendChild(cell);

        return row;
    }

    /**
     * Build items array for stars with mutations
     * For each star, creates:
     * - One item for the star itself
     * - One additional item for each mutation (化祿, 化權, etc.)
     * 
     * @param {Array} stars - Array of star names
     * @param {Object} natalMutations - Natal mutations {starName: mutationType}
     * @param {Object} majorMutations - Major cycle mutations
     * @param {Object} annualMutations - Annual cycle mutations
     * @param {Object} interpretations - Interpretation data
     * @returns {Array} Array of item objects
     */
    function buildStarItems(stars, natalMutations, majorMutations, annualMutations, interpretations, includeLink = true) {
        const items = [];

        stars.forEach(starName => {
            const natalMut = natalMutations[starName] || null;
            const majorMut = majorMutations[starName] || null;
            const annualMut = annualMutations[starName] || null;

            const starInterp = interpretations?.getStarInterpretation?.(starName);
            const starText = starInterp?.text || '';
            const starLink = starInterp?.link || '#';

            // Always add the star itself first
            items.push(createItem(starName, starText, includeLink ? starLink : null));

            // Collect unique mutations
            const uniqueMutations = new Set();
            if (natalMut) uniqueMutations.add(natalMut);
            if (majorMut) uniqueMutations.add(majorMut);
            if (annualMut) uniqueMutations.add(annualMut);

            // Add mutation items for unique mutations
            uniqueMutations.forEach(mutType => {
                const mutationName = starName + '化' + mutType;
                const mutInterp = interpretations?.getStarMutationInterpretation?.(mutationName);
                items.push(createItem(
                    mutationName,
                    mutInterp?.text || '',
                    includeLink ? mutInterp?.link || '#LINK_' + mutationName + '#' : null
                ));
            });
        });

        return items;
    }

    /**
     * Render items in pairs (2 items per row for 4-column layout)
     * @param {Array} items - Array of item objects
     * @param {HTMLElement} tbody - Table body to append rows to
     */
    function renderItemsInPairs(items, tbody) {
        for (let i = 0; i < items.length; i += 2) {
            const item1 = items[i];
            const item2 = items[i + 1] || null;
            tbody.appendChild(createTableRow(item1, item2));
        }
    }

    /**
     * Render the interpretation panel
     * @param {number} branchIndex - The selected palace branch index
     */
    function renderPanel(branchIndex) {
        const data = extractPalaceData(branchIndex);
        if (!data) {
            hidePanel();
            return;
        }

        const interpretations = getInterpretations();
        const majorMutations = getMajorCycleMutations();
        const annualMutations = getAnnualCycleMutations();
        const palaceNames = getPalaceNames(branchIndex);

        // Get major/annual cycle stars in this palace
        const majorCycleStars = getMajorCycleStarsInPalace(branchIndex);
        const annualCycleStars = getAnnualCycleStarsInPalace(branchIndex);

        // Categorize cycle stars into secondary and minor
        const allCycleStars = [...majorCycleStars, ...annualCycleStars];
        const cycleSecondaryStars = [];
        const cycleMinorStars = [];
        
        allCycleStars.forEach(starObj => {
            const category = STAR_CLASSIFICATION[starObj.baseName];
            if (category === 'secondary') {
                cycleSecondaryStars.push(starObj.displayName);
            } else {
                // Default to minor if not classified
                cycleMinorStars.push(starObj.displayName);
            }
        });

        // Create or get panel element
        if (!panelElement) {
            panelElement = document.createElement('div');
            panelElement.className = 'ziwei-interpretation-panel';
        }

        // Clear previous content
        panelElement.innerHTML = '';

        // Add title above the table
        const titleElement = document.createElement('h2');
        titleElement.textContent = '術語入門解釋';
        titleElement.style.marginBottom = '0px';
        panelElement.appendChild(titleElement);

        // Create table with explicit column widths
        const table = document.createElement('table');
        table.className = 'ziwei-interp-table';
        
        // Add colgroup for explicit column width control
        const colgroup = document.createElement('colgroup');
        const col1 = document.createElement('col');
        col1.style.width = '80px';  // Item 1 - narrow but readable
        const col2 = document.createElement('col');
        col2.style.width = 'auto';  // Interpretation 1 - flexible
        const col3 = document.createElement('col');
        col3.style.width = '80px';  // Item 2 - narrow but readable
        const col4 = document.createElement('col');
        col4.style.width = 'auto';  // Interpretation 2 - flexible
        colgroup.appendChild(col1);
        colgroup.appendChild(col2);
        colgroup.appendChild(col3);
        colgroup.appendChild(col4);
        table.appendChild(colgroup);
        
        const tbody = document.createElement('tbody');

        // Section: Palace Names (show natal, body if present, major, annual)
        tbody.appendChild(createSectionHeader('宮位'));

        const palaceItems = [];
        if (palaceNames.natal) {
            const natalInterp = interpretations?.getPalaceInterpretation?.(palaceNames.natal);
            if (natalInterp) {
                palaceItems.push(createItem(palaceNames.natal, natalInterp.text, natalInterp.link));
            } else {
                console.error(`No interpretation found for palace: ${palaceNames.natal}`);
                palaceItems.push(createItem(palaceNames.natal, '宮位解釋', '#LINK_宮位#'));
            }
        }
        if (palaceNames.body) {
            const bodyInterp = interpretations?.getPalaceInterpretation?.(palaceNames.body);
            if (bodyInterp) {
                palaceItems.push(createItem(palaceNames.body, bodyInterp.text, bodyInterp.link));
            } else {
                console.error(`No interpretation found for palace: ${palaceNames.body}`);
                palaceItems.push(createItem(palaceNames.body, '宮位解釋', '#LINK_身宮#'));
            }
        }
        if (palaceNames.major) {
            const majorInterp = interpretations?.getPalaceInterpretation?.(palaceNames.major);
            if (majorInterp) {
                palaceItems.push(createItem(palaceNames.major, majorInterp.text, majorInterp.link));
            } else {
                console.error(`No interpretation found for palace: ${palaceNames.major}`);
                palaceItems.push(createItem(palaceNames.major, '宮位解釋', '#LINK_大限#'));
            }
        }
        if (palaceNames.annual) {
            const annualInterp = interpretations?.getPalaceInterpretation?.(palaceNames.annual);
            if (annualInterp) {
                palaceItems.push(createItem(palaceNames.annual, annualInterp.text, annualInterp.link));
            } else {
                console.error(`No interpretation found for palace: ${palaceNames.annual}`);
                palaceItems.push(createItem(palaceNames.annual, '宮位解釋', '#LINK_流年#'));
            }
        }
        renderItemsInPairs(palaceItems, tbody);

        // Section: Primary Stars
        tbody.appendChild(createSectionHeader('主星'));
        
        if (data.primaryStars.length === 0) {
            // Empty palace
            const emptyInterp = interpretations?.getEmptyPalaceInterpretation?.();
            const emptyItems = [createItem('空宮', emptyInterp?.text || '看對宮星曜', emptyInterp?.link || '#LINK_空宮#')];
            renderItemsInPairs(emptyItems, tbody);
        } else {
            const primaryItems = buildStarItems(
                data.primaryStars,
                data.natalMutations,
                majorMutations,
                annualMutations,
                interpretations
            );
            renderItemsInPairs(primaryItems, tbody);
        }

        // Section: Secondary Stars (including cycle secondary stars)
        const allSecondaryStars = [...new Set([...data.secondaryStars, ...cycleSecondaryStars])];
        if (allSecondaryStars.length > 0) {
            tbody.appendChild(createSectionHeader('輔星'));
            const secondaryItems = buildStarItems(
                allSecondaryStars,
                data.natalMutations,
                majorMutations,
                annualMutations,
                interpretations
            );
            renderItemsInPairs(secondaryItems, tbody);
        }

        // Section: Minor Stars (including cycle minor stars)
        const allMinorStars = [...new Set([...data.minorStars, ...cycleMinorStars])];
        if (allMinorStars.length > 0) {
            tbody.appendChild(createSectionHeader('雜曜'));
            const minorItems = buildStarItems(
                allMinorStars,
                data.natalMutations,
                majorMutations,
                annualMutations,
                interpretations,
                false  // includeLink = false
            );
            renderItemsInPairs(minorItems, tbody);
        }

        // Section: Twelve Life Stage (always show)
        tbody.appendChild(createSectionHeader('十二長生'));
        if (data.lifeStage) {
            const stageInterp = interpretations?.getLifeStageInterpretation?.(data.lifeStage);
            const stageItems = [createItem(
                data.lifeStage,
                stageInterp?.text || '',
                stageInterp?.link || '#'
            )];
            renderItemsInPairs(stageItems, tbody);
        } else {
            // No life stage found - show placeholder
            const stageItems = [createItem('(無)', '', '#')];
            renderItemsInPairs(stageItems, tbody);
        }

        table.appendChild(tbody);
        panelElement.appendChild(table);

        // Show panel
        showPanel();
    }

    // ============================================================================
    // Panel Display Control
    // ============================================================================

    function showPanel() {
        if (!panelElement) return;

        // Check if we're in AI mode - if so, don't show the panel
        const mainContainer = document.querySelector('.ziwei-cal[data-ziwei-mode="ai"]');
        if (mainContainer) {
            // We're in AI mode, hide the interpretation panel
            panelElement.style.display = 'none';
            return;
        }
        
        // Find cycle panel to insert after
        const cyclePanel = document.querySelector('.ziwei-cycle-panel');
        if (cyclePanel && cyclePanel.parentNode) {
            // Insert after cycle panel
            if (!panelElement.parentNode || panelElement.parentNode !== cyclePanel.parentNode) {
                cyclePanel.parentNode.insertBefore(panelElement, cyclePanel.nextSibling);
            }
        } else {
            // Fallback: try to find the main container (not chart-wrapper, to avoid scroll issues)
            const mainChartContainer = document.querySelector('.ziwei-cal[data-ziwei-mode="chart"]');
            if (mainChartContainer && !panelElement.parentNode) {
                mainChartContainer.appendChild(panelElement);
            }
        }

        panelElement.style.display = 'block';
    }

    function hidePanel() {
        if (panelElement) {
            panelElement.style.display = 'none';
        }
        currentBranchIndex = null;
    }

    // ============================================================================
    // Event Handlers
    // ============================================================================

    function handlePalaceSelected(event) {
        const { branchIndex } = event.detail || {};
        if (typeof branchIndex !== 'number' || branchIndex < 0 || branchIndex > 11) {
            hidePanel();
            return;
        }
        currentBranchIndex = branchIndex;
        renderPanel(branchIndex);
    }

    function handlePalaceCleared() {
        hidePanel();
    }

    function handleChartDrawn() {
        // Reset panel when new chart is drawn
        hidePanel();
        currentBranchIndex = null;
    }

    function handlePalaceNameChanged() {
        // Re-render panel with updated palace names if currently showing a palace
        if (currentBranchIndex !== null) {
            renderPanel(currentBranchIndex);
        }
    }

    function handleMutationChanged() {
        // Re-render panel with updated mutations if currently showing a palace
        if (currentBranchIndex !== null) {
            renderPanel(currentBranchIndex);
        }
    }

    // ============================================================================
    // Initialization
    // ============================================================================

    function initialize() {
        if (isInitialized) return;

        // Listen for palace selection events
        document.addEventListener('ziwei-palace-selected', handlePalaceSelected);
        document.addEventListener('ziwei-palace-cleared', handlePalaceCleared);
        document.addEventListener('ziwei-chart-drawn', handleChartDrawn);
        document.addEventListener('ziwei-palace-name-changed', handlePalaceNameChanged);
        document.addEventListener('ziwei-mutation-changed', handleMutationChanged);

        isInitialized = true;
    }

    function destroy() {
        document.removeEventListener('ziwei-palace-selected', handlePalaceSelected);
        document.removeEventListener('ziwei-palace-cleared', handlePalaceCleared);
        document.removeEventListener('ziwei-chart-drawn', handleChartDrawn);
        document.removeEventListener('ziwei-palace-name-changed', handlePalaceNameChanged);
        document.removeEventListener('ziwei-mutation-changed', handleMutationChanged);

        if (panelElement && panelElement.parentNode) {
            panelElement.parentNode.removeChild(panelElement);
        }
        panelElement = null;
        currentBranchIndex = null;
        isInitialized = false;
    }

    // ============================================================================
    // Public API
    // ============================================================================

    window.ziweiInterpretationPanel = {
        initialize,
        destroy,
        show: showPanel,
        hide: hidePanel,
        render: renderPanel,
        getCurrentBranchIndex: () => currentBranchIndex
    };

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();
