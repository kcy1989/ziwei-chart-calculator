'use strict';

/**
 * Palace Interaction Module
 * Handles click events on palace cells to highlight three-way-four-square (三方四正)
 * and draw connection lines using Canvas API
 */

/**
 * Initialize palace interaction for the chart
 * @param {HTMLElement} grid The 4x4 grid container
 */
function initializePalaceInteraction(grid) {
    if (!grid) return;
    
    // Store reference to currently selected palace
    let selectedPalaceIndex = null;
    
    // Store cell elements by branch index for quick lookup
    const cellsByBranchIndex = {};
    
    // Canvas for drawing connection lines
    let linesCanvas = null;
    let linesCtx = null;
    
    // Branch index to grid position mapping (same as in chart.js createPalaceCell)
    const branchMap = [
        [5,  6,  7,  8],  // row 1: 巳  午   未  申
        [4, -1, -1,  9],  // row 2: 辰 [中] [中] 酉
        [3, -1, -1, 10],  // row 3: 卯 [中] [中] 戌
        [2,  1,  0, 11]   // row 4: 寅  丑   子  亥
    ];
    
    /**
     * Get the three-way-four-square (三方四正) positions for a given palace
     * Returns array of branch indices: self + 對宮 + 兩個三合宮
     */
    function getThreeWayFourSquare(branchIndex) {
        const positions = new Set();
        positions.add((branchIndex) % 12);           // 1. 本宮 (self)
        positions.add((branchIndex + 6) % 12);       // 2. 對宮 (opposite palace)
        positions.add((branchIndex + 4) % 12);       // 3. 三合宮之一
        positions.add((branchIndex + 8) % 12);       // 4. 三合宮之二
        return Array.from(positions);
    }
    
    /**
     * Get connection point on palace boundary
     * Each of the 12 palaces has a specific connection point
     */
    function getConnectionPoint(branchIndex) {
        // Fixed connection points for each palace (branchIndex 0-11)
        const connectionPoints = {
            0:  { x: 400, y: 480 },  // 子
            1:  { x: 240, y: 480 },  // 丑
            2:  { x: 160, y: 480 },  // 寅
            3:  { x: 160, y: 400 },  // 卯
            4:  { x: 160, y: 240 },  // 辰
            5:  { x: 160, y: 160 },  // 巳
            6:  { x: 240, y: 160 },  // 午
            7:  { x: 400, y: 160 },  // 未
            8:  { x: 480, y: 160 },  // 申
            9:  { x: 480, y: 240 },  // 酉
            10: { x: 480, y: 400 },  // 戌
            11: { x: 480, y: 480 }   // 亥
        };
        
        if (!(branchIndex in connectionPoints)) {
            console.error(`Invalid branchIndex for connection point: ${branchIndex} (expected 0-11)`);
            throw new Error(`Invalid branch index: ${branchIndex}`);
        }
        return connectionPoints[branchIndex];
    }
    
    /**
     * Clear all highlights and lines
     */
    function clearHighlight() {
        // Remove highlight classes from all cells
        const allCells = grid.querySelectorAll('.ziwei-cell');
        allCells.forEach(cell => {
            cell.classList.remove('ziwei-cell-selected', 'ziwei-cell-highlighted');
        });
        
        // Remove canvas with lines
        const existingCanvas = grid.querySelector('.ziwei-connection-canvas');
        if (existingCanvas) {
            existingCanvas.remove();
        }
        
        selectedPalaceIndex = null;
    }
    
    /**
     * Highlight related palaces and draw connection lines
     */
    function highlightRelatedPalaces(branchIndex) {
        clearHighlight();
        selectedPalaceIndex = branchIndex;
        
        const relatedIndices = getThreeWayFourSquare(branchIndex);
        const allCells = grid.querySelectorAll('.ziwei-cell');
        
        // Re-map cells by branch index for proper lookup
        allCells.forEach(cell => {
            const gridCol = parseInt(cell.style.gridColumnStart, 10);
            const gridRow = parseInt(cell.style.gridRowStart, 10);
            
            const branchMapRow = branchMap[gridRow - 1];
            if (branchMapRow) {
                const cellBranchIndex = branchMapRow[gridCol - 1];
                if (cellBranchIndex >= 0) {
                    cellsByBranchIndex[cellBranchIndex] = cell;
                }
            }
        });
        
        // Highlight cells
        allCells.forEach(cell => {
            const gridCol = parseInt(cell.style.gridColumnStart, 10);
            const gridRow = parseInt(cell.style.gridRowStart, 10);
            
            const branchMapRow = branchMap[gridRow - 1];
            if (!branchMapRow) return;
            
            const cellBranchIndex = branchMapRow[gridCol - 1];
            
            if (cellBranchIndex === branchIndex) {
                cell.classList.add('ziwei-cell-selected');
            } else if (relatedIndices.includes(cellBranchIndex) && cellBranchIndex >= 0) {
                cell.classList.add('ziwei-cell-highlighted');
            }
        });
        
        // Draw connection lines
        drawConnectionLines(branchIndex, relatedIndices);
    }
    
    /**
     * Draw connection lines using Canvas API
     * No SVG namespace needed, simpler and cleaner approach
     */
    function drawConnectionLines(selectedIndex, relatedIndices) {
        // Remove old canvas if exists
        const oldCanvas = grid.querySelector('.ziwei-connection-canvas');
        if (oldCanvas) {
            oldCanvas.remove();
        }
        
        // Create new canvas
        linesCanvas = document.createElement('canvas');
        linesCanvas.className = 'ziwei-connection-canvas';
        
        const gridRect = grid.getBoundingClientRect();
        linesCanvas.width = gridRect.width;
        linesCanvas.height = gridRect.height;
        linesCanvas.style.position = 'absolute';
        linesCanvas.style.top = '0';
        linesCanvas.style.left = '0';
        linesCanvas.style.pointerEvents = 'none';
        linesCanvas.style.zIndex = '5';
        
        linesCtx = linesCanvas.getContext('2d');
        
        const selectedCell = cellsByBranchIndex[selectedIndex];
        if (!selectedCell) {
            grid.appendChild(linesCanvas);
            return;
        }
        
        const selectedPoint = getConnectionPoint(selectedIndex);
        
        // Draw lines from selected to each related palace
        relatedIndices.forEach(relatedIndex => {
            if (relatedIndex === selectedIndex || !cellsByBranchIndex[relatedIndex]) return;
            
            const relatedCell = cellsByBranchIndex[relatedIndex];
            const relatedPoint = getConnectionPoint(relatedIndex);
            
            // Draw dashed line
            linesCtx.strokeStyle = '#3498db';
            linesCtx.lineWidth = 2;
            linesCtx.globalAlpha = 0.6;
            linesCtx.setLineDash([5, 5]);
            linesCtx.beginPath();
            linesCtx.moveTo(selectedPoint.x, selectedPoint.y);
            linesCtx.lineTo(relatedPoint.x, relatedPoint.y);
            linesCtx.stroke();
            linesCtx.setLineDash([]);
            linesCtx.globalAlpha = 1.0;
        });
        
        grid.appendChild(linesCanvas);
    }
    
    /**
     * Get branch index from cell element using grid coordinates
     */
    function getBranchIndexFromCell(cellElement) {
        const gridCol = parseInt(cellElement.style.gridColumnStart, 10);
        const gridRow = parseInt(cellElement.style.gridRowStart, 10);
        
        if (!Number.isInteger(gridCol) || !Number.isInteger(gridRow)) {
            console.error(`Invalid grid coordinates for cell: gridCol=${gridCol}, gridRow=${gridRow}`);
            return -1;
        }
        
        const branchMapRow = branchMap[gridRow - 1];
        if (!branchMapRow) {
            console.error(`Invalid grid row index: ${gridRow} (expected 1-4)`);
            return -1;
        }
        
        const cellBranchIndex = branchMapRow[gridCol - 1];
        if (cellBranchIndex === undefined) {
            console.error(`Invalid grid column index: ${gridCol} (expected 1-4), or center cell`);
            return -1;
        }
        
        return cellBranchIndex;
    }
    
    /**
     * Attach click handlers to all palace cells
     */
    function attachCellClickHandlers() {
        const cells = grid.querySelectorAll('.ziwei-cell');
        
        cells.forEach(cell => {
            const branchIndex = getBranchIndexFromCell(cell);
            
            if (branchIndex >= 0) {
                cell.style.cursor = 'pointer';
                cell.addEventListener('click', function(e) {
                    e.stopPropagation();
                    highlightRelatedPalaces(branchIndex);
                });
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
            } else {
                const branchIndex = getBranchIndexFromCell(cellElement);
                if (branchIndex < 0) {
                    clearHighlight();
                }
            }
        });
    }
    
    // Initialize handlers
    attachCellClickHandlers();
    attachGridClearHandler();
    
    // Expose API globally for external control
    window.ziweiChartInteraction = {
        clearHighlight: clearHighlight,
        highlightPalace: highlightRelatedPalaces,
        getSelectedPalace: () => selectedPalaceIndex
    };
}
