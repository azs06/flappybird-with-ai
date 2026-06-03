# 🎮 Flappy Bird Clone

A modern web-based Flappy Bird clone built with HTML5 Canvas and Vanilla JavaScript.

## 🚀 Features

- **Smooth 60fps gameplay** with requestAnimationFrame
- **Responsive design** supporting mobile and desktop
- **Touch and keyboard controls** (spacebar to jump, tap to jump)
- **Physics-based bird movement** with gravity and jump mechanics
- **Procedural pipe generation** with random heights
- **Score tracking** with local high score storage
- **Multiple game states** (menu, playing, game over)
- **Sound effects** and background music
- **Cross-browser compatibility** (Chrome, Firefox, Safari, Edge)

## 🎯 How to Play

1. **Desktop**: Press spacebar to make the bird jump
2. **Mobile**: Tap anywhere on the screen to jump
3. Navigate through the pipes without hitting them
4. Score points by passing through pipe gaps
5. Try to beat your high score!

## 🛠️ Technical Specifications

- **Canvas Size**: 400x600px (responsive scaling)
- **Target Performance**: 60 FPS
- **Technologies**: HTML5 Canvas, Vanilla JavaScript ES6+, CSS3, Web Audio API
- **Physics**: Gravity-based movement with collision detection

## 📁 Project Structure

```
flappy-bird-clone/
├── index.html          # Main HTML file
├── README.md           # This file
├── src/
│   ├── js/
│   │   ├── game.js     # Main game class
│   │   ├── bird.js     # Bird physics & animation
│   │   ├── pipes.js    # Obstacle generation
│   │   ├── physics.js  # Collision detection
│   │   ├── audio.js    # Sound management
│   │   └── constants.js # Game settings
│   └── css/
│       └── styles.css  # Styling and responsive design
└── assets/
    ├── images/         # Game sprites and graphics
    └── sounds/         # Audio files
```

## 🚀 Getting Started

1. Clone or download this repository
2. Open `index.html` in a modern web browser
3. Start playing!

No build process or dependencies required - just open and play!

## 🎨 Game Physics

- **Gravity**: 0.5 pixels/frame²
- **Jump Velocity**: -8 pixels/frame
- **Terminal Velocity**: 8 pixels/frame
- **Pipe Gap**: 120 pixels
- **Pipe Speed**: 2 pixels/frame

## 📱 Browser Support

- Chrome 70+
- Firefox 65+
- Safari 12+
- Edge 79+

## 🏆 Development

This game was built following modern web development practices with a focus on:
- Performance optimization
- Clean, maintainable code
- Responsive design
- Cross-platform compatibility

Built with ❤️ using Vanilla JavaScript and HTML5 Canvas.
