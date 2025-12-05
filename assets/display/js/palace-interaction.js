/**
 * Palace Interaction Module
 * 
 * Handles click events on palace cells to highlight three-way-four-square (三方四正)
 * and draw connection lines using Canvas API.
 * 
 * Performance optimizations:
 * - Pre-computed tri-square lookup table
 * - Persistent canvas reuse (no recreation)
 * - Cached cell index via dataset attributes
 * - Single-pass rect caching to eliminate layout thrashing
 * - Differential class updates (only change what's needed)
 * - Event delegation for click handling
 * - Fixed 640x640px canvas (no responsive resizing)
 * 
 * Dependencies:
 * - assets/data/constants.js (ziweiConstants)
 * 
 * Corresponding CSS: assets/display/css/palace-interaction.css
 * 
 * Exports: window.initializePalaceInteraction
 */

'use strict';

/**
 * Initialize palace interaction for the chart
 * @param {HTMLElement} grid The 4x4 grid container
 */
function initializePalaceInteraction(grid) {
    if (!grid) return;
    
    // ============================================================================
    // 1. Constants & Debug Setup
    // ============================================================================
    
    const CONNECTION_OFFSET = 3;
    const CANVAS_SIZE = 640; // Fixed size (no responsive handling)
    const DEBUG = window.ziweiCalData?.isDebug === true;

    // Use constants from window.ziweiConstants only
    const BRANCH_MAP = window.ziweiConstants.GRID_BRANCH_MAP;
    const TRI_SQUARE = window.ziweiConstants.TRI_SQUARE_MAP.map(obj => [
        obj.self,
        obj.opposition,
        obj.trine1,
        obj.trine2
    ]);

    // Connection point positions for each palace
    const CONNECTION_POSITIONS = {
        0: 'top-center',
        1: 'top-center',
        2: 'top-right',
        3: 'right-center',
        4: 'right-center',
        5: 'bottom-right',
        6: 'bottom-center',
        7: 'bottom-center',
        8: 'bottom-left',
        9: 'left-center',
        10: 'left-center',
        11: 'top-left'
    };
    
    // ============================================================================
    // 2. Module State
    // ============================================================================
    
    let lastSelected = null;
    let lastRelated = [];
    let lastClickSource = null; // Track whether last click was from grid or cycles module
    const clearCallbacks = [];
    let isInitialized = false;
    
    // Persistent canvas (created once, reused forever)
    const canvas = document.createElement('canvas');
    canvas.className = 'ziwei-connection-canvas';
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    canvas.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:5';
    grid.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    
    // Persistent cell index (built once during init)
    const cellsByBranchIndex = Array(12).fill(null);
    const cellRects = Array(12).fill(null); // Cached rects
    
    // ============================================================================
    // 3. Initialization: Build Cell Index (One-Time DOM Query)
    // ============================================================================
    
    /**
     * Build persistent cell index by calculating branchIndex from grid position
     * This runs once during initialization
     */
    function buildCellIndex() {
        const allCells = grid.querySelectorAll('.ziwei-cell');
        
        allCells.forEach(cell => {
            const col = parseInt(cell.style.gridColumnStart, 10);
            const row = parseInt(cell.style.gridRowStart, 10);
            
            if (!Number.isInteger(col) || !Number.isInteger(row)) return;
            
            const branchMapRow = BRANCH_MAP[row - 1];
            if (!branchMapRow) return;
            
            const branchIndex = branchMapRow[col - 1];
            if (branchIndex >= 0 && branchIndex < 12) {
                cellsByBranchIndex[branchIndex] = cell;
                // Store branchIndex in dataset for fast lookup (no inline style parsing)
                cell.dataset.branchIndex = String(branchIndex);
                cell.dataset.gridCol = String(col);
                cell.dataset.gridRow = String(row);
                // Set cursor to pointer to indicate clickability
                cell.style.cursor = 'pointer';
            }
        });
        
        // Validate mapping
        const mappedCount = cellsByBranchIndex.filter(c => c !== null).length;
        if (DEBUG && mappedCount < 12) {
            console.log(`[Palace Interaction] Only ${mappedCount}/12 cells mapped.`);
        } else if (DEBUG) {
            console.log('[Palace Interaction] All 12 cells mapped successfully');
        }
        
        return mappedCount === 12;
    }
    
    // ============================================================================
    // 4. Rect Caching: Batch Read to Eliminate Layout Thrashing
    // ============================================================================
    
    /**
     * Cache all cell rects in a single pass (before drawing)
     * This eliminates layout thrashing caused by reading rects during drawing
     */
    function cacheAllRects() {
        const gridRect = grid.getBoundingClientRect();
        
        for (let i = 0; i < 12; i++) {
            const cell = cellsByBranchIndex[i];
            cellRects[i] = cell ? {
                cell: cell,
                rect: cell.getBoundingClientRect(),
                gridOffsetLeft: gridRect.left,
                gridOffsetTop: gridRect.top
            } : null;
        }
    }
    
    /**
     * Get connection point for a cell (using cached rects, no BoundingClientRect call)
     */
    function getConnectionPoint(branchIndex) {
        const cached = cellRects[branchIndex];
        if (!cached) return null;
        
        const { rect, gridOffsetLeft, gridOffsetTop } = cached;
        const position = CONNECTION_POSITIONS[branchIndex];
        const off = CONNECTION_OFFSET;
        
        switch (position) {
            case 'top-center':
                return {
                    x: (rect.left + rect.right) / 2 - gridOffsetLeft - off,
                    y: rect.top - gridOffsetTop - off
                };
            case 'top-right':
                return {
                    x: rect.right - gridOffsetLeft - off,
                    y: rect.top - gridOffsetTop - off
                };
            case 'right-center':
                return {
                    x: rect.right - gridOffsetLeft - off,
                    y: (rect.top + rect.bottom) / 2 - gridOffsetTop - off
                };
            case 'bottom-right':
                return {
                    x: rect.right - gridOffsetLeft - off,
                    y: rect.bottom - gridOffsetTop - off
                };
            case 'bottom-center':
                return {
                    x: (rect.left + rect.right) / 2 - gridOffsetLeft - off,
                    y: rect.bottom - gridOffsetTop - off
                };
            case 'bottom-left':
                return {
                    x: rect.left - gridOffsetLeft - off,
                    y: rect.bottom - gridOffsetTop - off
                };
            case 'left-center':
                return {
                    x: rect.left - gridOffsetLeft - off,
                    y: (rect.top + rect.bottom) / 2 - gridOffsetTop - off
                };
            case 'top-left':
                return {
                    x: rect.left - gridOffsetLeft - off,
                    y: rect.top - gridOffsetTop - off
                };
            default:
                return {
                    x: (rect.left + rect.right) / 2 - gridOffsetLeft - off,
                    y: (rect.top + rect.bottom) / 2 - gridOffsetTop - off
                };
        }
    }
    
    // ============================================================================
    // 5. Highlight Management: Differential Updates
    // ============================================================================
    
    /**
     * Clear all highlights (differential update)
     * Only removes classes from previously highlighted cells
     */
    function clearHighlight() {
        // Remove from previously selected cell
        if (lastSelected !== null) {
            const cell = cellsByBranchIndex[lastSelected];
            if (cell) {
                cell.classList.remove('ziwei-cell-selected');
            }
        }
        
        // Remove from previously related cells
        for (let i = 0; i < lastRelated.length; i++) {
            const cell = cellsByBranchIndex[lastRelated[i]];
            if (cell) {
                cell.classList.remove('ziwei-cell-highlighted');
            }
        }
        
        // Clear canvas
        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        
        lastSelected = null;
        lastRelated = [];
        
        // Invoke registered callbacks
        for (let i = 0; i < clearCallbacks.length; i++) {
            try {
                clearCallbacks[i]();
            } catch (e) {
                console.error('[Palace Interaction] Error in clear callback:', e);
            }
        }
        
        // Dispatch palace cleared event for interpretation panel
        if (document.dispatchEvent) {
            document.dispatchEvent(new CustomEvent('ziwei-palace-cleared'));
        }
    }
    
    /**
     * Highlight related palaces and draw lines (differential update)
     * Only updates cells that changed
     * Special handling: if clicking a different palace that shares the same branch index,
     * keep the highlight. Only clear if clicking the exact same palace twice in a row from grid.
     * @param {number} branchIndex - The palace branch index to highlight
     * @param {string} source - Optional source identifier ('grid', 'major-cycle', 'annual-cycle', etc.)
     */
    function highlightRelatedPalaces(branchIndex, source) {
        if (branchIndex < 0 || branchIndex > 11) {
            return;
        }
        
        if (DEBUG) {
            console.log(`[Palace Interaction] Highlighting branchIndex=${branchIndex}, source=${source}`);
        }
        
        // Only toggle off if:
        // 1. Clicking same palace twice from grid (not from cycles.js)
        // 2. Never toggle off when switching between major/annual cycles with same branch
        const isSamePalace = (lastSelected === branchIndex);
        const isGridClick = (source === 'grid' || !source);
        
        if (isSamePalace && isGridClick && lastClickSource === 'grid') {
            clearHighlight();
            return;
        }
        
        // Remove old highlights (differential)
        if (lastSelected !== null) {
            const prevCell = cellsByBranchIndex[lastSelected];
            if (prevCell) {
                prevCell.classList.remove('ziwei-cell-selected');
            }
        }
        
        for (let i = 0; i < lastRelated.length; i++) {
            const idx = lastRelated[i];
            const cell = cellsByBranchIndex[idx];
            if (cell) {
                cell.classList.remove('ziwei-cell-highlighted');
            }
        }
        
        // Get related palaces from TRI_SQUARE
        const related = TRI_SQUARE[branchIndex];
        
        // Add new highlights
        const selectedCell = cellsByBranchIndex[branchIndex];
        if (selectedCell) {
            selectedCell.classList.remove('ziwei-cell-highlighted');
            selectedCell.classList.add('ziwei-cell-selected');
        }
        
        for (let i = 0; i < related.length; i++) {
            const idx = related[i];
            if (idx !== branchIndex) {
                const cell = cellsByBranchIndex[idx];
                if (cell) {
                    cell.classList.add('ziwei-cell-highlighted');
                }
            }
        }
        
        // Update state
        lastSelected = branchIndex;
        lastRelated = related;
        lastClickSource = source;
        
        // Draw connection lines immediately (synchronous) for instant visual feedback
        drawConnectionLines(branchIndex, related);
        
        // Dispatch palace selected event for interpretation panel
        if (document.dispatchEvent) {
            document.dispatchEvent(new CustomEvent('ziwei-palace-selected', {
                detail: { branchIndex, source, related }
            }));
        }
    }
    
    // ============================================================================
    // 6. Canvas Drawing (Optimized)
    // ============================================================================
    
    /**
     * Draw connection lines (using cached rects, batch canvas operations)
     */
    function drawConnectionLines(selectedIndex, relatedIndices) {
        // Cache all rects before drawing (single pass, no interleaved reads/writes)
        cacheAllRects();
        
        const sp = getConnectionPoint(selectedIndex);
        if (!sp) {
            ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
            return;
        }
        
        // Batch canvas state changes
        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        ctx.save();
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.6;
        ctx.setLineDash([5, 5]);
        
        // Draw all lines
        for (let i = 0; i < relatedIndices.length; i++) {
            const ri = relatedIndices[i];
            if (ri === selectedIndex) continue;
            
            const rp = getConnectionPoint(ri);
            if (!rp) continue;
            
            ctx.beginPath();
            ctx.moveTo(sp.x, sp.y);
            ctx.lineTo(rp.x, rp.y);
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    // ============================================================================
    // 7. Event Handling (Optimized with Event Delegation)
    // ============================================================================
    
    /**
     * Handle grid clicks with event delegation (single listener, no per-cell handlers)
     */
    function handleGridClick(e) {
        const cellElement = e.target.closest('.ziwei-cell');
        
        if (!cellElement || !grid.contains(cellElement)) {
            clearHighlight();
            return;
        }
        
        const branchIndex = cellElement.dataset.branchIndex;
        
        if (branchIndex !== undefined && Number(branchIndex) >= 0) {
            e.stopPropagation();
            highlightRelatedPalaces(Number(branchIndex), 'grid');
        } else {
            // Clicked on center or invalid cell
            clearHighlight();
        }
    }
    
    // ============================================================================
    // 8. Initialization
    // ============================================================================
    
    // Build cell index (one-time DOM query)
    const success = buildCellIndex();
    if (!success) {
        console.error('[Palace Interaction] Failed to map all cells');
        return null;
    }
    
    // Attach single delegated click handler (not per-cell)
    grid.addEventListener('click', handleGridClick);
    
    isInitialized = true;
    
    if (DEBUG) {
        console.log('[Palace Interaction] Initialized with event delegation');
    }
    
    // ============================================================================
    // 9. Public API Export
    // ============================================================================
    
    const api = {
        clear: clearHighlight,
        highlight: highlightRelatedPalaces,
        getSelectedPalace: () => lastSelected,
        onClear: (callback) => {
            if (typeof callback === 'function') {
                clearCallbacks.push(callback);
            }
        },
        refresh: () => {
            cellsByBranchIndex.fill(null);
            buildCellIndex();
        },
        destroy: () => {
            grid.removeEventListener('click', handleGridClick);
            clearCallbacks.length = 0;
            if (canvas.parentNode) {
                canvas.parentNode.removeChild(canvas);
            }
            isInitialized = false;
        }
    };

    grid.ziweiPalaceInteraction = api;
    return api;
}


// Expose to global scope
window.initializePalaceInteraction = initializePalaceInteraction;
