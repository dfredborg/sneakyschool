# SneakySchool

A top-down 2D stealth game where you play as a student sneaking through a school at night, avoiding being caught by patrolling teachers.

## Game Features

- **Stealth Gameplay**: Avoid the teacher's vision cone to stay undetected
- **Multiple Levels**: Progress through different school layouts
- **JSON-Based Level System**: Easily configurable levels with custom layouts and AI paths
- **Teacher AI**: Teachers follow predefined patrol routes with realistic vision cones
- **Grid-Based Movement**: Smooth character movement on a grid system

## How to Play

### Controls
- **WASD** or **Arrow Keys**: Move the player
- **R**: Restart current level
- **N**: Skip to next level (debug mode)

### Objective
- Navigate from your starting position (green square) to the EXIT (orange square)
- Avoid being seen by the teacher (red square with yellow vision cone)
- Use obstacles (brown rectangles) to hide and plan your route

## Technical Implementation

### Architecture
- **HTML5 Canvas**: For rendering the game
- **Vanilla JavaScript**: Game engine with modular class structure
- **JSON Level Format**: Configurable level data for easy level creation

### Level JSON Format
```json
{
    "name": "Level Name",
    "width": 25,
    "height": 18,
    "player": {"x": 1, "y": 1},
    "goal": {"x": 23, "y": 16},
    "obstacles": [
        {"x": 5, "y": 3, "width": 2, "height": 4}
    ],
    "teacher": {
        "startX": 8,
        "startY": 2,
        "path": [
            {"x": 8, "y": 2, "wait": 1000},
            {"x": 12, "y": 2, "wait": 500}
        ],
        "speed": 0.02,
        "viewDistance": 4
    }
}
```

### Game Components
- **Player**: Green square with smooth grid-based movement
- **Teacher**: Red square with AI patrol behavior and vision cone
- **Obstacles**: Brown rectangles representing school furniture/walls
- **Goal**: Orange EXIT square marking the level completion point

## Running the Game

1. Open `index.html` in a web browser
2. Or serve the files using a local web server:
   ```bash
   python3 -m http.server 8000
   # Then visit http://localhost:8000
   ```

## Level Design

The game includes three sample levels:
1. **Level 1 - Tutorial**: Simple layout to learn the mechanics
2. **Level 2 - The Hallway**: Corridor-based level with strategic hiding spots
3. **Level 3 - The Maze**: Complex maze requiring careful navigation

Each level demonstrates different aspects of the stealth gameplay and can be easily modified by editing the corresponding JSON files in the `levels/` directory.