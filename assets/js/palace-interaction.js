'use strict';

/**
 * Palace Interaction Module
 * Handles click events on palace cells to highlight three-way-four-square (三方四正)
 * and draw connection lines using Canvas API
 * 
 * Performance optimizations:
 * - Pre-computed tri-square lookup table
 * - Persistent canvas reuse
 * - Cached cell index and rects
 * - Differential class updates
 * - Batch drawing operations
 */

/**
 * Initialize palace interaction for the chart
 * @param {HTMLElement} grid The 4x4 grid container
 */
function initializePalaceInteraction(grid) {
    if (!grid) return;
    
    // Constants - wrapped in function to avoid global scope conflicts
    const CONNECTION_OFFSET = 3;
    const DEBUG = window.ziweiCalData?.isDebug === true;

    // Branch index to grid position mapping (same as in chart.js createPalaceCell)
    const BRANCH_MAP = [
        [5,  6,  7,  8],  // row 1: 巳  午   未  申
        [4, -1, -1,  9],  // row 2: 辰 [中] [中] 酉
        [3, -1, -1, 10],  // row 3: 卯 [中] [中] 戌
        [2,  1,  0, 11]   // row 4: 寅  丑   子  亥
    ];

    // Pre-computed three-way-four-square for all 12 palaces
    // triSquare[i] = [self, opposite, harmonic1, harmonic2]
    const TRI_SQUARE = Array.from({ length: 12 }, (_, i) => [
        i,
        (i + 6) % 12,
        (i + 4) % 12,
        (i + 8) % 12
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
    
    // State
    let lastSelected = null;
    let lastRelated = [];
    const clearCallbacks = [];
    
    // Persistent canvas
    const canvas = document.createElement('canvas');
    canvas.className = 'ziwei-connection-canvas';
    canvas.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:5';
    grid.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    
    // Build persistent cell index with dataset
    const cellsByBranchIndex = Array(12).fill(null);
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
            cell.dataset.branchIndex = String(branchIndex);
            cell.dataset.gridCol = String(col);
            cell.dataset.gridRow = String(row);
        }
    });
    
    // Validate mapping
    const mappedCount = cellsByBranchIndex.filter(c => c !== null).length;
    if (mappedCount < 12) {
        console.warn(`[Palace Interaction] Only ${mappedCount}/12 cells mapped.`);
    }
    
    /**
     * Ensure canvas size matches grid
     */
    function ensureCanvasSize() {
        const rect = grid.getBoundingClientRect();
        const w = Math.floor(rect.width);
        const h = Math.floor(rect.height);
        
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
        }
    }
    
    /**
     * Calculate connection point for a cell
     * @param {number} branchIndex Branch index (0-11)
     * @param {DOMRect} cellRect Cell bounding rect
     * @param {DOMRect} gridRect Grid bounding rect
     * @returns {{x: number, y: number}} Connection point coordinates
     */
    function getConnectionPoint(branchIndex, cellRect, gridRect) {
        const position = CONNECTION_POSITIONS[branchIndex];
        if (!position) {
            console.warn(`Invalid branchIndex: ${branchIndex}, using center`);
            return {
                x: (cellRect.left + cellRect.right) / 2 - gridRect.left - CONNECTION_OFFSET,
                y: (cellRect.top + cellRect.bottom) / 2 - gridRect.top - CONNECTION_OFFSET
            };
        }
        
        const off = CONNECTION_OFFSET;
        
        switch (position) {
            case 'top-center':
                return {
                    x: (cellRect.left + cellRect.right) / 2 - gridRect.left - off,
                    y: cellRect.top - gridRect.top - off
                };
            case 'top-right':
                return {
                    x: cellRect.right - gridRect.left - off,
                    y: cellRect.top - gridRect.top - off
                };
            case 'right-center':
                return {
                    x: cellRect.right - gridRect.left - off,
                    y: (cellRect.top + cellRect.bottom) / 2 - gridRect.top - off
                };
            case 'bottom-right':
                return {
                    x: cellRect.right - gridRect.left - off,
                    y: cellRect.bottom - gridRect.top - off
                };
            case 'bottom-center':
                return {
                    x: (cellRect.left + cellRect.right) / 2 - gridRect.left - off,
                    y: cellRect.bottom - gridRect.top - off
                };
            case 'bottom-left':
                return {
                    x: cellRect.left - gridRect.left - off,
                    y: cellRect.bottom - gridRect.top - off
                };
            case 'left-center':
                return {
                    x: cellRect.left - gridRect.left - off,
                    y: (cellRect.top + cellRect.bottom) / 2 - gridRect.top - off
                };
            case 'top-left':
                return {
                    x: cellRect.left - gridRect.left - off,
                    y: cellRect.top - gridRect.top - off
                };
            default:
                return {
                    x: (cellRect.left + cellRect.right) / 2 - gridRect.left - off,
                    y: (cellRect.top + cellRect.bottom) / 2 - gridRect.top - off
                };
        }
    }
    
    /**
     * Clear all highlights (differential update)
     */
    function clearHighlight() {
        // Only clear previously highlighted cells
        if (lastSelected !== null) {
            const cell = cellsByBranchIndex[lastSelected];
            if (cell) {
                cell.classList.remove('ziwei-cell-selected');
            }
        }
        
        for (let i = 0; i < lastRelated.length; i++) {
            const cell = cellsByBranchIndex[lastRelated[i]];
            if (cell) {
                cell.classList.remove('ziwei-cell-highlighted');
            }
        }
        
        // Clear canvas
        if (canvas.width > 0 && canvas.height > 0) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        
        lastSelected = null;
        lastRelated = [];
        
        // Invoke callbacks
        clearCallbacks.forEach(callback => {
            try {
                callback();
            } catch (e) {
                console.error('Error in clear callback:', e);
            }
        });
    }
    
    /**
     * Highlight related palaces and draw connection lines (differential update)
     */
    function highlightRelatedPalaces(branchIndex) {
        if (branchIndex < 0 || branchIndex > 11) {
            console.warn(`[Palace Interaction] Invalid branchIndex: ${branchIndex}`);
            return;
        }
        
        // Clear previous highlights (but don't trigger callbacks if same palace)
        const isSamePalace = (lastSelected === branchIndex);
        
        if (lastSelected !== null && !isSamePalace) {
            const prevCell = cellsByBranchIndex[lastSelected];
            if (prevCell) {
                prevCell.classList.remove('ziwei-cell-selected');
            }
        }
        
        for (let i = 0; i < lastRelated.length; i++) {
            const cell = cellsByBranchIndex[lastRelated[i]];
            if (cell) {
                cell.classList.remove('ziwei-cell-highlighted');
            }
        }
        
        // Get related palaces from pre-computed table
        const related = TRI_SQUARE[branchIndex];
        
        // Apply new highlights
        const selectedCell = cellsByBranchIndex[branchIndex];
        if (selectedCell) {
            selectedCell.classList.add('ziwei-cell-selected');
        } else {
            console.warn(`[Palace Interaction] Cell not found for palace ${branchIndex}`);
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
        
        // Draw connection lines
        drawConnectionLines(branchIndex, related);
    }
    
    /**
     * Draw connection lines (optimized with cached rects)
     */
    function drawConnectionLines(selectedIndex, relatedIndices) {
        ensureCanvasSize();
        
        const gridRect = grid.getBoundingClientRect();
        
        // Pre-cache all rects
        const rects = new Array(12);
        for (let i = 0; i < 12; i++) {
            const cell = cellsByBranchIndex[i];
            rects[i] = cell ? cell.getBoundingClientRect() : null;
        }
        
        const selectedRect = rects[selectedIndex];
        if (!selectedRect) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            return;
        }
        
        // Clear and prepare drawing
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.6;
        ctx.setLineDash([5, 5]);
        
        // Get selected point
        const sp = getConnectionPoint(selectedIndex, selectedRect, gridRect);
        
        // Draw lines to related palaces
        for (let i = 0; i < relatedIndices.length; i++) {
            const ri = relatedIndices[i];
            if (ri === selectedIndex) continue;
            
            const rr = rects[ri];
            if (!rr) continue;
            
            const rp = getConnectionPoint(ri, rr, gridRect);
            
            ctx.beginPath();
            ctx.moveTo(sp.x, sp.y);
            ctx.lineTo(rp.x, rp.y);
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    /**
     * Attach click handlers to all palace cells
     */
    function attachCellClickHandlers() {
        allCells.forEach(cell => {
            const branchIndex = cell.dataset.branchIndex;
            
            if (branchIndex !== undefined) {
                const bi = Number(branchIndex);
                if (bi >= 0 && bi < 12) {
                    cell.style.cursor = 'pointer';
                    cell.addEventListener('click', function(e) {
                        e.stopPropagation();
                        
                        // Toggle: if clicking same palace, clear
                        if (lastSelected === bi) {
                            clearHighlight();
                        } else {
                            highlightRelatedPalaces(bi);
                        }
                    });
                }
            }
        });
    }
    
    /**
     * Clear highlight when clicking on center or grid background
     */
    function attachGridClearHandler() {
        grid.addEventListener('click', function(e) {
            const cellElement = e.target.closest('.ziwei-cell');
            
            if (!cellElement || !grid.contains(cellElement)) {
                clearHighlight();
                return;
            }
            
            const branchIndex = cellElement.dataset.branchIndex;
            if (branchIndex === undefined || Number(branchIndex) < 0) {
                clearHighlight();
            }
        });
    }
    
    /**
     * Handle window resize to adjust canvas
     */
    let resizeTimeout = null;
    function handleResize() {
        if (resizeTimeout) {
            clearTimeout(resizeTimeout);
        }
        
        resizeTimeout = setTimeout(() => {
            ensureCanvasSize();
            
            // Redraw if something is selected
            if (lastSelected !== null && lastRelated.length > 0) {
                drawConnectionLines(lastSelected, lastRelated);
            }
        }, 100);
    }
    
    // Use ResizeObserver if available, otherwise fallback to window resize
    if (typeof ResizeObserver !== 'undefined') {
        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(grid);
    } else {
        window.addEventListener('resize', handleResize);
    }
    
    // Initialize
    ensureCanvasSize();
    attachCellClickHandlers();
    attachGridClearHandler();

    // Expose API for external control
    const api = {
        clear: clearHighlight,
        clearHighlight: clearHighlight, // Legacy alias
        highlight: highlightRelatedPalaces,
        highlightPalace: highlightRelatedPalaces, // Legacy alias
        getSelectedPalace: () => lastSelected,
        onClear: (callback) => {
            if (typeof callback === 'function') {
                clearCallbacks.push(callback);
            }
        }
    };

    grid.ziweiPalaceInteraction = api;
    window.ziweiChartInteraction = api; // Maintain legacy global for backward compatibility

    return api;
}

// Expose to global scope
window.initializePalaceInteraction = initializePalaceInteraction;
