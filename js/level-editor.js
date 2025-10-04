class LevelEditor {
    constructor() {
        this.canvas = document.getElementById('levelCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gridSize = 20;
        this.levelWidth = 25;
        this.levelHeight = 18;
        this.currentTool = 'wall';
        this.isDrawing = false;
        this.isDragging = false;
        
        // Level data
        this.levelData = {
            name: "New Level",
            width: 25,
            height: 18,
            player: { x: 1, y: 1 },
            goal: { x: 23, y: 16 },
            obstacles: [],
            teacher: {
                startX: 5,
                startY: 5,
                path: [],
                speed: 1.0,
                viewDistance: 4
            }
        };
        
        // Grid data for drawing
        this.grid = [];
        this.initializeGrid();
        this.setupEventListeners();
        this.resizeCanvas();
        this.render();
    }
    
    initializeGrid() {
        this.grid = [];
        for (let y = 0; y < this.levelHeight; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.levelWidth; x++) {
                this.grid[y][x] = 'empty';
            }
        }
        
        // Set initial positions
        this.grid[this.levelData.player.y][this.levelData.player.x] = 'player';
        this.grid[this.levelData.goal.y][this.levelData.goal.x] = 'goal';
        this.grid[this.levelData.teacher.startY][this.levelData.teacher.startX] = 'teacher';
    }
    
    setupEventListeners() {
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
        this.canvas.addEventListener('mouseleave', () => this.handleMouseUp());
        
        // Prevent context menu
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    getGridPosition(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const x = Math.floor((clientX - rect.left) / this.gridSize);
        const y = Math.floor((clientY - rect.top) / this.gridSize);
        return { x, y };
    }
    
    handleMouseDown(e) {
        const pos = this.getGridPosition(e.clientX, e.clientY);
        if (pos.x >= 0 && pos.x < this.levelWidth && pos.y >= 0 && pos.y < this.levelHeight) {
            this.isDrawing = true;
            this.placeTile(pos.x, pos.y, e.button === 2);
        }
    }
    
    handleMouseMove(e) {
        if (this.isDrawing) {
            const pos = this.getGridPosition(e.clientX, e.clientY);
            if (pos.x >= 0 && pos.x < this.levelWidth && pos.y >= 0 && pos.y < this.levelHeight) {
                this.placeTile(pos.x, pos.y, e.button === 2);
            }
        }
    }
    
    handleMouseUp() {
        this.isDrawing = false;
    }
    
    placeTile(x, y, isRightClick = false) {
        if (isRightClick || this.currentTool === 'erase') {
            this.grid[y][x] = 'empty';
        } else {
            // Handle special tools that should only place one instance
            if (this.currentTool === 'player') {
                this.clearTileType('player');
                this.levelData.player = { x, y };
            } else if (this.currentTool === 'goal') {
                this.clearTileType('goal');
                this.levelData.goal = { x, y };
            } else if (this.currentTool === 'teacher') {
                this.clearTileType('teacher');
                this.levelData.teacher.startX = x;
                this.levelData.teacher.startY = y;
            } else if (this.currentTool === 'path') {
                // Add to path if not already in path
                const existingIndex = this.levelData.teacher.path.findIndex(p => p.x === x && p.y === y);
                if (existingIndex === -1) {
                    this.levelData.teacher.path.push({ x, y, wait: 1000 });
                    this.updatePathList();
                }
            }
            
            this.grid[y][x] = this.currentTool;
        }
        
        this.generateObstacles();
        this.render();
    }
    
    clearTileType(tileType) {
        for (let y = 0; y < this.levelHeight; y++) {
            for (let x = 0; x < this.levelWidth; x++) {
                if (this.grid[y][x] === tileType) {
                    this.grid[y][x] = 'empty';
                }
            }
        }
    }
    
    generateObstacles() {
        this.levelData.obstacles = [];
        const processed = new Set();
        
        for (let y = 0; y < this.levelHeight; y++) {
            for (let x = 0; x < this.levelWidth; x++) {
                if (this.grid[y][x] === 'wall' && !processed.has(`${x},${y}`)) {
                    const obstacle = this.findObstacleGroup(x, y, processed);
                    if (obstacle) {
                        this.levelData.obstacles.push(obstacle);
                    }
                }
            }
        }
    }
    
    findObstacleGroup(startX, startY, processed) {
        let minX = startX, maxX = startX;
        let minY = startY, maxY = startY;
        
        // Find rectangular group of walls
        const toProcess = [[startX, startY]];
        const group = new Set();
        
        while (toProcess.length > 0) {
            const [x, y] = toProcess.pop();
            const key = `${x},${y}`;
            
            if (processed.has(key) || group.has(key)) continue;
            if (x < 0 || x >= this.levelWidth || y < 0 || y >= this.levelHeight) continue;
            if (this.grid[y][x] !== 'wall') continue;
            
            group.add(key);
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
            
            // Add adjacent cells
            toProcess.push([x+1, y], [x-1, y], [x, y+1], [x, y-1]);
        }
        
        // Check if it forms a perfect rectangle
        let isRectangle = true;
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                if (!group.has(`${x},${y}`)) {
                    isRectangle = false;
                    break;
                }
            }
            if (!isRectangle) break;
        }
        
        if (isRectangle) {
            // Mark all cells as processed
            group.forEach(key => processed.add(key));
            
            return {
                x: minX,
                y: minY,
                width: maxX - minX + 1,
                height: maxY - minY + 1
            };
        } else {
            // Create individual 1x1 obstacles for non-rectangular groups
            processed.add(`${startX},${startY}`);
            return {
                x: startX,
                y: startY,
                width: 1,
                height: 1
            };
        }
    }
    
    render() {
        this.ctx.fillStyle = '#2a2a2a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid
        this.ctx.strokeStyle = '#444';
        this.ctx.lineWidth = 1;
        
        for (let x = 0; x <= this.levelWidth; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * this.gridSize, 0);
            this.ctx.lineTo(x * this.gridSize, this.levelHeight * this.gridSize);
            this.ctx.stroke();
        }
        
        for (let y = 0; y <= this.levelHeight; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * this.gridSize);
            this.ctx.lineTo(this.levelWidth * this.gridSize, y * this.gridSize);
            this.ctx.stroke();
        }
        
        // Draw tiles
        for (let y = 0; y < this.levelHeight; y++) {
            for (let x = 0; x < this.levelWidth; x++) {
                const tileType = this.grid[y][x];
                if (tileType !== 'empty') {
                    this.drawTile(x, y, tileType);
                }
            }
        }
        
        // Draw path connections
        this.drawPathConnections();
    }
    
    drawTile(x, y, type) {
        const pixelX = x * this.gridSize;
        const pixelY = y * this.gridSize;
        const size = this.gridSize - 2;
        
        switch (type) {
            case 'wall':
                this.ctx.fillStyle = '#795548';
                break;
            case 'player':
                this.ctx.fillStyle = '#4CAF50';
                break;
            case 'goal':
                this.ctx.fillStyle = '#FF9800';
                break;
            case 'teacher':
                this.ctx.fillStyle = '#F44336';
                break;
            case 'path':
                this.ctx.fillStyle = '#E91E63';
                break;
            default:
                return;
        }
        
        this.ctx.fillRect(pixelX + 1, pixelY + 1, size, size);
        
        // Add labels for special tiles
        if (type === 'player' || type === 'goal' || type === 'teacher') {
            this.ctx.fillStyle = 'white';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            const label = type === 'player' ? 'P' : type === 'goal' ? 'G' : 'T';
            this.ctx.fillText(label, pixelX + this.gridSize/2, pixelY + this.gridSize/2 + 4);
        }
    }
    
    drawPathConnections() {
        if (this.levelData.teacher.path.length < 2) return;
        
        this.ctx.strokeStyle = '#E91E63';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        
        // Connect teacher start to first path point
        if (this.levelData.teacher.path.length > 0) {
            this.drawConnection(
                this.levelData.teacher.startX,
                this.levelData.teacher.startY,
                this.levelData.teacher.path[0].x,
                this.levelData.teacher.path[0].y
            );
        }
        
        // Connect path points
        for (let i = 0; i < this.levelData.teacher.path.length - 1; i++) {
            const current = this.levelData.teacher.path[i];
            const next = this.levelData.teacher.path[i + 1];
            this.drawConnection(current.x, current.y, next.x, next.y);
        }
        
        // Connect last path point back to first (if more than 1 point)
        if (this.levelData.teacher.path.length > 1) {
            const last = this.levelData.teacher.path[this.levelData.teacher.path.length - 1];
            const first = this.levelData.teacher.path[0];
            this.drawConnection(last.x, last.y, first.x, first.y);
        }
        
        this.ctx.setLineDash([]);
    }
    
    drawConnection(x1, y1, x2, y2) {
        const centerX1 = x1 * this.gridSize + this.gridSize / 2;
        const centerY1 = y1 * this.gridSize + this.gridSize / 2;
        const centerX2 = x2 * this.gridSize + this.gridSize / 2;
        const centerY2 = y2 * this.gridSize + this.gridSize / 2;
        
        this.ctx.beginPath();
        this.ctx.moveTo(centerX1, centerY1);
        this.ctx.lineTo(centerX2, centerY2);
        this.ctx.stroke();
    }
    
    updatePathList() {
        const pathList = document.getElementById('pathList');
        pathList.innerHTML = '';
        
        this.levelData.teacher.path.forEach((point, index) => {
            const pointDiv = document.createElement('div');
            pointDiv.className = 'path-point';
            pointDiv.innerHTML = `
                <span>${index + 1}:</span>
                <input type="number" value="${point.x}" min="0" max="${this.levelWidth-1}" 
                       onchange="editor.updatePathPoint(${index}, 'x', this.value)">
                <input type="number" value="${point.y}" min="0" max="${this.levelHeight-1}" 
                       onchange="editor.updatePathPoint(${index}, 'y', this.value)">
                <input type="number" value="${point.wait}" min="0" max="5000" step="100"
                       onchange="editor.updatePathPoint(${index}, 'wait', this.value)"
                       style="width: 80px;" placeholder="Wait (ms)">
                <button onclick="editor.removePathPoint(${index})">×</button>
            `;
            pathList.appendChild(pointDiv);
        });
    }
    
    updatePathPoint(index, property, value) {
        if (index >= 0 && index < this.levelData.teacher.path.length) {
            this.levelData.teacher.path[index][property] = parseInt(value);
            this.updatePathGrid();
            this.render();
        }
    }
    
    removePathPoint(index) {
        if (index >= 0 && index < this.levelData.teacher.path.length) {
            this.levelData.teacher.path.splice(index, 1);
            this.updatePathGrid();
            this.updatePathList();
            this.render();
        }
    }
    
    updatePathGrid() {
        // Clear existing path points from grid
        for (let y = 0; y < this.levelHeight; y++) {
            for (let x = 0; x < this.levelWidth; x++) {
                if (this.grid[y][x] === 'path') {
                    this.grid[y][x] = 'empty';
                }
            }
        }
        
        // Add current path points to grid
        this.levelData.teacher.path.forEach(point => {
            if (point.x >= 0 && point.x < this.levelWidth && 
                point.y >= 0 && point.y < this.levelHeight) {
                this.grid[point.y][point.x] = 'path';
            }
        });
    }
    
    resizeLevel() {
        const newWidth = parseInt(document.getElementById('levelWidth').value);
        const newHeight = parseInt(document.getElementById('levelHeight').value);
        
        // Create new grid
        const newGrid = [];
        for (let y = 0; y < newHeight; y++) {
            newGrid[y] = [];
            for (let x = 0; x < newWidth; x++) {
                if (y < this.levelHeight && x < this.levelWidth) {
                    newGrid[y][x] = this.grid[y][x];
                } else {
                    newGrid[y][x] = 'empty';
                }
            }
        }
        
        this.levelWidth = newWidth;
        this.levelHeight = newHeight;
        this.levelData.width = newWidth;
        this.levelData.height = newHeight;
        this.grid = newGrid;
        
        this.resizeCanvas();
        this.generateObstacles();
        this.render();
    }
    
    resizeCanvas() {
        this.gridSize = parseInt(document.getElementById('gridSize').value);
        this.canvas.width = this.levelWidth * this.gridSize;
        this.canvas.height = this.levelHeight * this.gridSize;
        this.render();
    }
    
    exportLevel() {
        const jsonOutput = JSON.stringify(this.levelData, null, 2);
        document.getElementById('jsonOutput').value = jsonOutput;
    }
    
    loadLevelData(data) {
        this.levelData = data;
        this.levelWidth = data.width;
        this.levelHeight = data.height;
        
        document.getElementById('levelWidth').value = this.levelWidth;
        document.getElementById('levelHeight').value = this.levelHeight;
        document.getElementById('levelName').value = data.name;
        document.getElementById('teacherSpeed').value = data.teacher.speed;
        document.getElementById('teacherViewDistance').value = data.teacher.viewDistance;
        
        this.initializeGrid();
        
        // Place obstacles
        data.obstacles.forEach(obstacle => {
            for (let y = obstacle.y; y < obstacle.y + obstacle.height; y++) {
                for (let x = obstacle.x; x < obstacle.x + obstacle.width; x++) {
                    if (y < this.levelHeight && x < this.levelWidth) {
                        this.grid[y][x] = 'wall';
                    }
                }
            }
        });
        
        // Place special tiles
        this.grid[data.player.y][data.player.x] = 'player';
        this.grid[data.goal.y][data.goal.x] = 'goal';
        this.grid[data.teacher.startY][data.teacher.startX] = 'teacher';
        
        // Place path points
        data.teacher.path.forEach(point => {
            if (point.y < this.levelHeight && point.x < this.levelWidth) {
                this.grid[point.y][point.x] = 'path';
            }
        });
        
        this.updatePathList();
        this.resizeCanvas();
        this.render();
    }
}

// Global editor instance
let editor;

// Tool functions
function setTool(tool) {
    editor.currentTool = tool;
    
    // Update button states
    document.querySelectorAll('.toolbar button').forEach(btn => btn.classList.remove('active'));
    document.getElementById('tool' + tool.charAt(0).toUpperCase() + tool.slice(1)).classList.add('active');
}

function clearLevel() {
    if (confirm('Are you sure you want to clear the entire level?')) {
        editor.initializeGrid();
        editor.levelData.obstacles = [];
        editor.levelData.teacher.path = [];
        editor.updatePathList();
        editor.render();
    }
}

function addBorders() {
    // Add border walls
    for (let x = 0; x < editor.levelWidth; x++) {
        editor.grid[0][x] = 'wall'; // Top
        editor.grid[editor.levelHeight - 1][x] = 'wall'; // Bottom
    }
    for (let y = 0; y < editor.levelHeight; y++) {
        editor.grid[y][0] = 'wall'; // Left
        editor.grid[y][editor.levelWidth - 1] = 'wall'; // Right
    }
    
    editor.generateObstacles();
    editor.render();
}

function clearPath() {
    if (confirm('Are you sure you want to clear the teacher\'s path?')) {
        editor.levelData.teacher.path = [];
        editor.updatePathGrid();
        editor.updatePathList();
        editor.render();
    }
}

function updateLevelName() {
    editor.levelData.name = document.getElementById('levelName').value;
}

function updateTeacherProperties() {
    editor.levelData.teacher.speed = parseFloat(document.getElementById('teacherSpeed').value);
    editor.levelData.teacher.viewDistance = parseInt(document.getElementById('teacherViewDistance').value);
}

function loadLevel() {
    document.getElementById('fileInput').click();
}

function handleFileLoad(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const levelData = JSON.parse(e.target.result);
                editor.loadLevelData(levelData);
            } catch (error) {
                alert('Error loading level file: ' + error.message);
            }
        };
        reader.readAsText(file);
    }
}

function saveLevel() {
    editor.exportLevel();
    const jsonData = document.getElementById('jsonOutput').value;
    
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (editor.levelData.name || 'level').toLowerCase().replace(/\s+/g, '-') + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function exportLevel() {
    editor.exportLevel();
}

function copyToClipboard() {
    const textarea = document.getElementById('jsonOutput');
    textarea.select();
    document.execCommand('copy');
    alert('Level JSON copied to clipboard!');
}

// Initialize editor when page loads
window.addEventListener('load', () => {
    editor = new LevelEditor();
});
