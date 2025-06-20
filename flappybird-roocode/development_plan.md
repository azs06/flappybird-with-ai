# Flappy Bird Clone Development Plan

## 1. Core Mechanics

### Bird Physics
- **Gravity**: Constant acceleration (`0.5px/frame²`) applied each frame
- **Jump**: Instant velocity change (`-10px/frame`) on spacebar/touch
- **Position Update**:
  ```javascript
  bird.velocity += GRAVITY;
  bird.y += bird.velocity;
  ```

### Obstacle Generation
- **Pipe Class**:
  ```javascript
  class Pipe {
    constructor() {
      this.x = canvas.width;
      this.gapY = Math.random() * (canvas.height - GAP_SIZE - 100) + 50;
      this.width = PIPE_WIDTH;
      this.passed = false;
    }
  }
  ```
- **Generation Timer**: New pipe every `150` frames

### Collision Detection
- **AABB (Axis-Aligned Bounding Box)**:
  ```javascript
  function checkCollision(rect1, rect2) {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    );
  }
  ```
- **Collision Checks**: Bird vs pipes, ground (canvas bottom), sky (canvas top)

### Score Tracking
- **Increment**: When bird passes pipe center
- **Storage**: `localStorage` for high scores

## 2. Game Architecture

### Canvas Setup
```javascript
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 400;
canvas.height = 600;
```

### State Management
```javascript
const states = {
  START: 0,
  PLAYING: 1,
  GAME_OVER: 2
};
let currentState = states.START;
```

### Animation Loop
```javascript
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);
```

### Event Handling
```javascript
// Keyboard
document.addEventListener('keydown', e => {
  if (e.code === 'Space') handleJump();
});

// Touch
canvas.addEventListener('touchstart', handleJump);
```

## 3. Visual Implementation

### Sprite Positioning
- **Bird**: Centered vertically at start (`x: 50px, y: canvas.height/2`)
- **Pipes**: 
  - Top pipe: `(x, 0, width, gapY)`
  - Bottom pipe: `(x, gapY + GAP_SIZE, width, canvas.height)`

### Animations
- **Bird Flap**: Sprite sheet cycling every 5 frames
- **Pipe Movement**: `pipe.x -= PIPE_SPEED` each frame

### UI Elements
- **Score Display**: Top-right corner
- **Game Over Screen**: Centered with restart button

## 4. Audio Integration
```html
<audio id="jumpSound" src="sounds/jump.mp3"></audio>
<audio id="scoreSound" src="sounds/point.mp3"></audio>
<audio id="hitSound" src="sounds/hit.mp3"></audio>
```
```javascript
function playSound(id) {
  document.getElementById(id).currentTime = 0;
  document.getElementById(id).play();
}
```

## 5. Optimization & Testing

### Object Pooling
- **Pipe Recycling**: Reuse off-screen pipes instead of new instances

### Responsive Scaling
```javascript
window.addEventListener('resize', () => {
  canvas.width = Math.min(window.innerWidth, 400);
  canvas.height = Math.min(window.innerHeight, 600);
});
```

### Edge Cases
- Rapid restart handling
- High score persistence
- Touch vs keyboard input parity

## 6. Deployment
- **Browser Build**: Single HTML file with inline JS/CSS
- **Local Execution**:
  ```bash
  open index.html  # macOS
  start index.html # Windows
  xdg-open index.html # Linux