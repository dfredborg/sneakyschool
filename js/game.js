class SneakySchoolGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        // Game state
        this.gameState = 'playing'; // 'playing', 'gameOver', 'levelComplete'
        this.currentLevel = 1;
        this.levelData = null;
        
        // Grid settings
        this.gridSize = 32;
        this.gridWidth = Math.floor(this.width / this.gridSize);
        this.gridHeight = Math.floor(this.height / this.gridSize);
        
        // Game objects
        this.player = new Player(1, 1, this.gridSize, this);
        this.teacher = null;
        this.obstacles = [];
        this.goal = null;
        
        // Assets
        this.backgroundImage = new Image();
        this.backgroundLoaded = false;
        this.teacherImage = new Image();
        this.teacherImageLoaded = false;
        this.playerImage = new Image();
        this.playerImageLoaded = false;
        this.exitImage = new Image();
        this.exitImageLoaded = false;
        this.loadAssets();
        
        // Input handling
        this.keys = {};
        this.setupEventListeners();
        
        // Game loop
        this.lastTime = 0;
        this.gameLoop = this.gameLoop.bind(this);
        
        // Load first level
        this.loadLevel(this.currentLevel);
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            this.keys[e.code] = true;
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
            this.keys[e.code] = false;
            
            // Handle single key presses
            if (e.key.toLowerCase() === 'r') {
                this.restartLevel();
            }
            if (e.key.toLowerCase() === 'n') {
                this.nextLevel();
            }
        });
    }
    
    loadAssets() {
        this.backgroundImage.onload = () => {
            this.backgroundLoaded = true;
        };
        this.backgroundImage.src = 'assest/background.png';
        
        this.teacherImage.onload = () => {
            this.teacherImageLoaded = true;
        };
        this.teacherImage.src = 'assest/teacher.png';
        
        this.playerImage.onload = () => {
            this.playerImageLoaded = true;
        };
        this.playerImage.src = 'assest/player.png';
        
        this.exitImage.onload = () => {
            this.exitImageLoaded = true;
        };
        this.exitImage.src = 'assest/exit.png';
    }
    
    async loadLevel(levelNumber) {
        try {
            console.log(`Attempting to load level ${levelNumber}`);
            const response = await fetch(`levels/level${levelNumber}.json`);
            if (!response.ok) {
                throw new Error(`Level ${levelNumber} not found (HTTP ${response.status})`);
            }
            this.levelData = await response.json();
            console.log(`Successfully loaded level ${levelNumber}: ${this.levelData.name}`);
            this.initializeLevel();
        } catch (error) {
            console.error('Error loading level:', error);
            
            // If we're trying to load a level beyond what exists, treat as game complete
            if (levelNumber > 7) {
                console.log('No more levels available - game complete');
                this.gameState = 'gameComplete';
                this.currentLevel = 7; // Stay on last level
                this.updateUI();
                return;
            }
            
            // For other errors, create a default level
            console.log('Creating default level due to error');
            this.createDefaultLevel();
        }
    }
    
    createDefaultLevel() {
        this.levelData = {
            name: "Standard Niveau",
            width: this.gridWidth,
            height: this.gridHeight,
            player: { x: 1, y: 1 },
            goal: { x: this.gridWidth - 2, y: this.gridHeight - 2 },
            obstacles: [
                { x: 5, y: 3, width: 2, height: 4 },
                { x: 10, y: 8, width: 3, height: 2 },
                { x: 15, y: 5, width: 1, height: 6 }
            ],
            teacher: {
                startX: 8,
                startY: 2,
                path: [
                    { x: 8, y: 2, wait: 2000 },
                    { x: 12, y: 2, wait: 1000 },
                    { x: 12, y: 6, wait: 2000 },
                    { x: 8, y: 6, wait: 1000 }
                ],
                speed: 1.0,
                viewDistance: 4
            }
        };
        this.initializeLevel();
    }
    
    initializeLevel() {
        // Initialize player
        this.player.setPosition(this.levelData.player.x, this.levelData.player.y);
        
        // Initialize teacher
        const teacherData = this.levelData.teacher;
        this.teacher = new Teacher(
            teacherData.startX,
            teacherData.startY,
            teacherData.path,
            teacherData.speed || 0.02,
            teacherData.viewDistance || 4,
            this.gridSize,
            this
        );
        
        // Initialize obstacles
        this.obstacles = this.levelData.obstacles.map(obs => 
            new Obstacle(obs.x, obs.y, obs.width || 1, obs.height || 1, this.gridSize)
        );
        
        // Initialize goal
        this.goal = new Goal(this.levelData.goal.x, this.levelData.goal.y, this.gridSize, this);
        
        this.gameState = 'playing';
        this.updateUI();
    }
    
    update(deltaTime) {
        if (this.gameState !== 'playing' || !this.teacher) return;
        
        // Update player
        this.player.update(this.keys, deltaTime, this.obstacles, this.gridWidth, this.gridHeight);
        
        // Update teacher
        this.teacher.update(deltaTime);
        
        // Check collisions and game state
        this.checkCollisions();
    }
    
    checkCollisions() {
        // Check if player reached goal
        if (this.goal && this.player.gridX === this.goal.gridX && this.player.gridY === this.goal.gridY) {
            this.gameState = 'levelComplete';
            this.updateUI();
            return;
        }
        
        // Check if teacher sees player
        if (this.teacher && this.teacher.canSeePlayer(this.player, this.obstacles)) {
            this.gameState = 'gameOver';
            this.updateUI();
            return;
        }
    }
    
    render() {
        // Clear canvas and draw background
        if (this.backgroundLoaded) {
            // Draw the background image, scaled to fit the canvas
            this.ctx.drawImage(this.backgroundImage, 0, 0, this.width, this.height);
        } else {
            // Fallback to solid color background if image isn't loaded yet
            this.ctx.fillStyle = '#2a2a2a';
            this.ctx.fillRect(0, 0, this.width, this.height);
        }
        
        // Draw grid (optional, for debugging)
        // this.drawGrid();
        
        // Draw obstacles
        this.obstacles.forEach(obstacle => obstacle.render(this.ctx));
        
        // Draw goal
        if (this.goal) this.goal.render(this.ctx);
        
        // Draw teacher
        if (this.teacher) {
            this.teacher.render(this.ctx);
            // Draw teacher's vision cone
            this.teacher.renderVision(this.ctx, this.obstacles);
        }
        
        // Draw player
        this.player.render(this.ctx);
        
        // Draw game state overlay
        if (this.gameState !== 'playing') {
            this.drawGameStateOverlay();
        }
    }
    
    drawGrid() {
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1;
        
        for (let x = 0; x <= this.width; x += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
            this.ctx.stroke();
        }
        
        for (let y = 0; y <= this.height; y += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
            this.ctx.stroke();
        }
    }
    
    drawGameStateOverlay() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        this.ctx.fillStyle = 'white';
        this.ctx.font = '48px Arial';
        this.ctx.textAlign = 'center';
        
        if (this.gameState === 'gameOver') {
            this.ctx.fillText('FANGET!', this.width / 2, this.height / 2);
            this.ctx.font = '24px Arial';
            this.ctx.fillText('Tryk R for at genstarte', this.width / 2, this.height / 2 + 50);
        } else if (this.gameState === 'levelComplete') {
            this.ctx.fillText('NIVEAU GENNEMFØRT!', this.width / 2, this.height / 2);
            this.ctx.font = '24px Arial';
            this.ctx.fillText('Tryk N til næste niveau', this.width / 2, this.height / 2 + 50);
        } else if (this.gameState === 'gameComplete') {
            this.ctx.fillText('TILLYKKE!', this.width / 2, this.height / 2 - 40);
            this.ctx.font = '32px Arial';
            this.ctx.fillText('Du har gennemført spillet', this.width / 2, this.height / 2);
            this.ctx.fillText('og undsluppet skolen!', this.width / 2, this.height / 2 + 40);
            this.ctx.font = '24px Arial';
            this.ctx.fillText('Vil du spille igen?', this.width / 2, this.height / 2 + 80);
            this.ctx.fillText('Tryk R for at starte forfra fra Niveau 1', this.width / 2, this.height / 2 + 110);
        }
    }
    
    updateUI() {
        document.getElementById('levelNumber').textContent = this.currentLevel;
        
        let status = 'Spiller';
        if (this.gameState === 'gameOver') status = 'Fanget!';
        else if (this.gameState === 'levelComplete') status = 'Niveau Gennemført!';
        else if (this.gameState === 'gameComplete') status = 'Undsluppet! Spil Igen?';
        
        document.getElementById('gameStatus').textContent = status;
    }
    
    restartLevel() {
        if (this.gameState === 'gameComplete') {
            // If game is complete, restart from level 1
            this.currentLevel = 1;
            this.gameState = 'playing';
            this.loadLevel(this.currentLevel);
        } else {
            // Otherwise just restart current level
            this.initializeLevel();
        }
    }
    
    nextLevel() {
        this.currentLevel++;
        // Check if this is beyond our available levels
        if (this.currentLevel > 7) {
            // Show completion message or reset to level 1
            this.gameState = 'gameComplete';
            this.updateUI();
            return;
        }
        this.loadLevel(this.currentLevel);
    }
    
    gameLoop(currentTime) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        this.update(deltaTime);
        this.render();
        
        requestAnimationFrame(this.gameLoop);
    }
    
    start() {
        requestAnimationFrame(this.gameLoop);
    }
}

// Player class
class Player {
    constructor(gridX, gridY, gridSize, game) {
        this.gridX = gridX;
        this.gridY = gridY;
        this.gridSize = gridSize;
        this.x = gridX * gridSize;
        this.y = gridY * gridSize;
        this.speed = 2.5; // Smooth movement speed
        this.moving = false;
        this.targetX = this.x;
        this.targetY = this.y;
        this.direction = 2; // 0: right, 1: down, 2: left, 3: up (starting with left since image faces left)
        this.game = game;
    }
    
    setPosition(gridX, gridY) {
        this.gridX = gridX;
        this.gridY = gridY;
        this.x = gridX * this.gridSize;
        this.y = gridY * this.gridSize;
        this.targetX = this.x;
        this.targetY = this.y;
        this.moving = false;
    }
    
    update(keys, deltaTime, obstacles, gridWidth, gridHeight) {
        if (this.moving) {
            // Continue moving to target with smooth interpolation (same as teacher)
            const dx = this.targetX - this.x;
            const dy = this.targetY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 1) {
                // Reached target - snap to exact position
                this.x = this.targetX;
                this.y = this.targetY;
                this.gridX = this.targetX / this.gridSize;
                this.gridY = this.targetY / this.gridSize;
                this.moving = false;
            } else {
                // Smooth movement towards target (using same formula as teacher)
                const moveSpeed = (this.speed * this.gridSize * deltaTime) / 1000;
                this.x += (dx / distance) * moveSpeed;
                this.y += (dy / distance) * moveSpeed;
            }
        } else {
            // Check for input to start new movement
            let newGridX = this.gridX;
            let newGridY = this.gridY;
            
            if (keys['w'] || keys['arrowup']) {
                newGridY--;
                this.direction = 3; // up
            } else if (keys['s'] || keys['arrowdown']) {
                newGridY++;
                this.direction = 1; // down
            } else if (keys['a'] || keys['arrowleft']) {
                newGridX--;
                this.direction = 2; // left
            } else if (keys['d'] || keys['arrowright']) {
                newGridX++;
                this.direction = 0; // right
            }
            
            // Check if movement is valid
            if (newGridX !== this.gridX || newGridY !== this.gridY) {
                if (this.canMoveTo(newGridX, newGridY, obstacles, gridWidth, gridHeight)) {
                    this.targetX = newGridX * this.gridSize;
                    this.targetY = newGridY * this.gridSize;
                    this.moving = true;
                }
            }
        }
    }
    
    canMoveTo(gridX, gridY, obstacles, gridWidth, gridHeight) {
        // Check bounds
        if (gridX < 0 || gridX >= gridWidth || gridY < 0 || gridY >= gridHeight) {
            return false;
        }
        
        // Check obstacles
        for (const obstacle of obstacles) {
            if (gridX >= obstacle.gridX && gridX < obstacle.gridX + obstacle.width &&
                gridY >= obstacle.gridY && gridY < obstacle.gridY + obstacle.height) {
                return false;
            }
        }
        
        return true;
    }
    
    render(ctx) {
        const centerX = this.x + this.gridSize / 2;
        const centerY = this.y + this.gridSize / 2;
        
        if (this.game.playerImageLoaded && this.game.playerImage) {
            // Save the current context state
            ctx.save();
            
            // Translate to the center of the player
            ctx.translate(centerX, centerY);
            
            // Handle direction-specific transformations
            if (this.direction === 0) { // right - flip horizontally
                ctx.scale(-1, 1); // Flip horizontally
            } else if (this.direction === 1) { // down
                ctx.rotate(-Math.PI / 2); // Rotate -90°
            } else if (this.direction === 2) { // left - original orientation
                // No transformation needed
            } else if (this.direction === 3) { // up
                ctx.rotate(Math.PI / 2); // Rotate 90°
            }
            
            // Draw the player image centered and double size
            const imageSize = (this.gridSize - 4) * 2; // Double the size
            ctx.drawImage(this.game.playerImage, -imageSize/2, -imageSize/2, imageSize, imageSize);
            
            // Restore the context state
            ctx.restore();
        } else {
            // Fallback to rectangle rendering if image isn't loaded
            ctx.fillStyle = '#4CAF50';
            ctx.fillRect(this.x + 2, this.y + 2, this.gridSize - 4, this.gridSize - 4);
            
            // Draw direction indicator
            ctx.fillStyle = '#2E7D32';
            ctx.fillRect(this.x + this.gridSize/2 - 2, this.y + 2, 4, 8);
        }
    }
}

// Teacher class
class Teacher {
    constructor(startX, startY, path, speed, viewDistance, gridSize, game) {
        this.gridSize = gridSize;
        this.path = path;
        this.speed = speed || 1.0; // Default to 1 grid unit per second
        this.viewDistance = viewDistance;
        this.currentPathIndex = 0;
        this.x = startX * gridSize;
        this.y = startY * gridSize;
        this.targetX = this.x;
        this.targetY = this.y;
        this.waitTime = 0;
        this.moving = false;
        this.direction = 1; // 0: right, 1: down, 2: left, 3: up (starting with down since image faces down)
        this.game = game;
        
        this.setNextTarget();
    }
    
    setNextTarget() {
        const target = this.path[this.currentPathIndex];
        this.targetX = target.x * this.gridSize;
        this.targetY = target.y * this.gridSize;
        this.waitTime = target.wait || 0;
        
        // Calculate direction
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        
        if (Math.abs(dx) > Math.abs(dy)) {
            this.direction = dx > 0 ? 0 : 2; // right or left
        } else {
            this.direction = dy > 0 ? 1 : 3; // down or up
        }
    }
    
    update(deltaTime) {
        if (this.waitTime > 0) {
            this.waitTime -= deltaTime;
            return;
        }
        
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 1) {
            // Reached target - snap to exact position
            this.x = this.targetX;
            this.y = this.targetY;
            this.currentPathIndex = (this.currentPathIndex + 1) % this.path.length;
            this.setNextTarget();
        } else {
            // Smooth movement towards target
            const moveSpeed = (this.speed * this.gridSize * deltaTime) / 1000;
            this.x += (dx / distance) * moveSpeed;
            this.y += (dy / distance) * moveSpeed;
        }
    }
    
    canSeePlayer(player, obstacles) {
        const teacherGridX = Math.round(this.x / this.gridSize);
        const teacherGridY = Math.round(this.y / this.gridSize);
        
        // Check if player is within view distance
        const dx = player.gridX - teacherGridX;
        const dy = player.gridY - teacherGridY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > this.viewDistance) return false;
        
        // Check if player is in the teacher's field of view (cone)
        let viewAngle = this.direction * Math.PI / 2;
        let playerAngle = Math.atan2(dy, dx);
        let angleDiff = Math.abs(viewAngle - playerAngle);
        
        // Normalize angle difference
        if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
        
        // 90-degree field of view
        if (angleDiff > Math.PI / 4) return false;
        
        // Check for obstacles blocking line of sight
        return !this.isLineOfSightBlocked(teacherGridX, teacherGridY, player.gridX, player.gridY, obstacles);
    }
    
    isLineOfSightBlocked(x1, y1, x2, y2, obstacles) {
        // Simple line of sight check using Bresenham's line algorithm
        const dx = Math.abs(x2 - x1);
        const dy = Math.abs(y2 - y1);
        const sx = x1 < x2 ? 1 : -1;
        const sy = y1 < y2 ? 1 : -1;
        let err = dx - dy;
        
        let x = x1;
        let y = y1;
        
        while (x !== x2 || y !== y2) {
            // Check if current position has an obstacle
            for (const obstacle of obstacles) {
                if (x >= obstacle.gridX && x < obstacle.gridX + obstacle.width &&
                    y >= obstacle.gridY && y < obstacle.gridY + obstacle.height) {
                    return true;
                }
            }
            
            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x += sx;
            }
            if (e2 < dx) {
                err += dx;
                y += sy;
            }
        }
        
        return false;
    }
    
    render(ctx) {
        const centerX = this.x + this.gridSize / 2;
        const centerY = this.y + this.gridSize / 2;
        
        if (this.game.teacherImageLoaded && this.game.teacherImage) {
            // Save the current context state
            ctx.save();
            
            // Translate to the center of the teacher
            ctx.translate(centerX, centerY);
            
            // Rotate based on direction (image faces down by default, which is direction 1)
            // 0: right = -90°, 1: down = 0°, 2: left = 90°, 3: up = 180°
            const rotationAngle = (this.direction - 1) * Math.PI / 2;
            ctx.rotate(rotationAngle);
            
            // Draw the teacher image centered and larger
            const imageSize = (this.gridSize - 4) * 2; // Double the size
            ctx.drawImage(this.game.teacherImage, -imageSize/2, -imageSize/2, imageSize, imageSize);
            
            // Restore the context state
            ctx.restore();
        } else {
            // Fallback to rectangle rendering if image isn't loaded
            ctx.fillStyle = '#F44336';
            ctx.fillRect(this.x + 2, this.y + 2, this.gridSize - 4, this.gridSize - 4);
            
            // Draw direction indicator
            ctx.fillStyle = '#D32F2F';
            ctx.beginPath();
            if (this.direction === 0) { // right
                ctx.moveTo(centerX, centerY);
                ctx.lineTo(centerX + 10, centerY - 5);
                ctx.lineTo(centerX + 10, centerY + 5);
            } else if (this.direction === 1) { // down
                ctx.moveTo(centerX, centerY);
                ctx.lineTo(centerX - 5, centerY + 10);
                ctx.lineTo(centerX + 5, centerY + 10);
            } else if (this.direction === 2) { // left
                ctx.moveTo(centerX, centerY);
                ctx.lineTo(centerX - 10, centerY - 5);
                ctx.lineTo(centerX - 10, centerY + 5);
            } else { // up
                ctx.moveTo(centerX, centerY);
                ctx.lineTo(centerX - 5, centerY - 10);
                ctx.lineTo(centerX + 5, centerY - 10);
            }
            ctx.fill();
        }
    }
    
    renderVision(ctx, obstacles) {
        ctx.fillStyle = 'rgba(255, 255, 0, 0.1)';
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
        ctx.lineWidth = 1;
        
        const centerX = this.x + this.gridSize / 2;
        const centerY = this.y + this.gridSize / 2;
        const viewAngle = this.direction * Math.PI / 2;
        const coneAngle = Math.PI / 4; // 45 degrees each side
        const range = this.viewDistance * this.gridSize;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        
        // Draw vision cone
        for (let angle = viewAngle - coneAngle; angle <= viewAngle + coneAngle; angle += 0.1) {
            const endX = centerX + Math.cos(angle) * range;
            const endY = centerY + Math.sin(angle) * range;
            ctx.lineTo(endX, endY);
        }
        
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }
}

// Obstacle class
class Obstacle {
    constructor(gridX, gridY, width, height, gridSize) {
        this.gridX = gridX;
        this.gridY = gridY;
        this.width = width;
        this.height = height;
        this.gridSize = gridSize;
        this.x = gridX * gridSize;
        this.y = gridY * gridSize;
    }
    
    render(ctx) {
        ctx.fillStyle = '#795548';
        ctx.fillRect(this.x, this.y, this.width * this.gridSize, this.height * this.gridSize);
        
        // Draw border
        ctx.strokeStyle = '#5D4037';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width * this.gridSize, this.height * this.gridSize);
    }
}

// Goal class
class Goal {
    constructor(gridX, gridY, gridSize, game) {
        this.gridX = gridX;
        this.gridY = gridY;
        this.gridSize = gridSize;
        this.x = gridX * gridSize;
        this.y = gridY * gridSize;
        this.game = game;
    }
    
    render(ctx) {
        if (this.game.exitImageLoaded && this.game.exitImage) {
            // Draw the exit image
            const imageSize = this.gridSize - 4;
            ctx.drawImage(this.game.exitImage, this.x + 2, this.y + 2, imageSize, imageSize);
        } else {
            // Fallback to original rendering if image isn't loaded
            ctx.fillStyle = '#FF9800';
            ctx.fillRect(this.x + 4, this.y + 4, this.gridSize - 8, this.gridSize - 8);
            
            // Draw exit symbol
            ctx.fillStyle = '#E65100';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('UDGANG', this.x + this.gridSize / 2, this.y + this.gridSize / 2 + 5);
        }
    }
}

// Initialize and start the game when the page loads
window.addEventListener('load', () => {
    const game = new SneakySchoolGame();
    game.start();
});