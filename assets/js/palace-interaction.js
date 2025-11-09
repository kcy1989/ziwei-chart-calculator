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
    let clearCallbacks = [];
    
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
    const connectionPointPositions = {
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

    function getConnectionPoint(branchIndex) {
        const position = connectionPointPositions[branchIndex];
        if (!position) {
            console.error(`Invalid branchIndex for connection point: ${branchIndex} (expected 0-11)`);
            throw new Error(`Invalid branch index: ${branchIndex}`);
        }

        const targetCell = cellsByBranchIndex[branchIndex];
        if (!targetCell) {
            console.error(`Missing palace cell for branchIndex: ${branchIndex}`);
            throw new Error(`Cannot locate palace cell for branchIndex ${branchIndex}`);
        }

        const gridRect = grid.getBoundingClientRect();
        const cellRect = targetCell.getBoundingClientRect();
        const offset = 3; // Adjust all connection points by 1px left and up

        switch (position) {
            case 'top-center':
                return {
                    x: (cellRect.left + cellRect.right) / 2 - gridRect.left - offset,
                    y: cellRect.top - gridRect.top - offset
                };
            case 'top-right':
                return {
                    x: cellRect.right - gridRect.left - offset,
                    y: cellRect.top - gridRect.top - offset
                };
            case 'right-center':
                return {
                    x: cellRect.right - gridRect.left - offset,
                    y: (cellRect.top + cellRect.bottom) / 2 - gridRect.top - offset
                };
            case 'bottom-right':
                return {
                    x: cellRect.right - gridRect.left - offset,
                    y: cellRect.bottom - gridRect.top - offset
                };
            case 'bottom-center':
                return {
                    x: (cellRect.left + cellRect.right) / 2 - gridRect.left - offset,
                    y: cellRect.bottom - gridRect.top - offset
                };
            case 'bottom-left':
                return {
                    x: cellRect.left - gridRect.left - offset,
                    y: cellRect.bottom - gridRect.top - offset
                };
            case 'left-center':
                return {
                    x: cellRect.left - gridRect.left - offset,
                    y: (cellRect.top + cellRect.bottom) / 2 - gridRect.top - offset
                };
            case 'top-left':
                return {
                    x: cellRect.left - gridRect.left - offset,
                    y: cellRect.top - gridRect.top - offset
                };
            default:
                console.error(`Unsupported connection point position: ${position}`);
                throw new Error(`Unsupported connection point position: ${position}`);
        }
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

        // Invoke all registered clear callbacks
        clearCallbacks.forEach(callback => {
            try {
                callback();
            } catch (e) {
                console.error('Error in clear callback:', e);
            }
        });
    }
    
    /**
     * Highlight related palaces and draw connection lines
     */
    function highlightRelatedPalaces(branchIndex) {
        console.log('highlightRelatedPalaces called:', branchIndex);
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

    // Expose API for external control
    const api = {
        clear: clearHighlight,
        clearHighlight: clearHighlight, // Legacy alias
        highlight: highlightRelatedPalaces,
        highlightPalace: highlightRelatedPalaces, // Legacy alias
        getSelectedPalace: () => selectedPalaceIndex,
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
