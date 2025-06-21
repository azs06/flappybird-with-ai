# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a collection of Flappy Bird game implementations created by different AI tools to compare their code generation capabilities. Each subdirectory contains a complete Flappy Bird clone implementation using HTML, CSS, and JavaScript.

## Directory Structure

- `flappybird-augment/` - Augment implementation (most polished)
- `flappybird-claude-code/` - Claude Code implementation  
- `flappybird-claude-vscode/` - Claude VSCode implementation
- `flappybird-cursor/` - Cursor implementation
- `flappybird-windsurf/` - Windsurf implementation
- `flappybird-cline/` - Cline implementation
- `flappybird-gpt-4o/` - GPT-4o implementation
- `flappybird-gemini-*` - Various Gemini implementations
- `flappybird-roocode/` - RooCode implementation
- `flappybird-trae/` - Trae implementation
- Individual HTML files for web-based AI implementations

## Common Architecture Patterns

### File Structure (Vanilla JS implementations)
- `index.html` - Main HTML with canvas element
- `style.css` or `styles/style.css` - Game styling and responsive design
- `game.js` - Main game loop and state management
- `bird.js` - Bird physics and movement
- `pipe.js` or `pipes.js` - Pipe generation and collision
- `assets/` - Images and sounds (some implementations use programmatic graphics)

### Modular Structure (Advanced implementations)
Some implementations use a more modular approach:
- `scripts/` directory with separate modules:
  - `game.js` - Main game controller
  - `bird.js` - Bird class
  - `pipe.js` - Pipe class  
  - `collision.js` - Collision detection
  - `input.js` - Input handling
  - `score.js` - Score management
  - `assets.js` - Asset loading
  - `background.js` - Background rendering

## Core Game Components

### Bird Physics
- Gravity simulation with jump mechanics
- Collision detection with pipes and boundaries
- Smooth animation using requestAnimationFrame

### Pipe System  
- Procedural generation with random heights
- Horizontal scrolling movement
- Gap management for difficulty

### Game States
- Start screen
- Playing state  
- Game over screen
- Score tracking with localStorage persistence

## Development Commands

Since these are static HTML/CSS/JS games, no build process is required:

### Running locally
```bash
# For any implementation, simply open index.html in a browser
# Or use a local server:
python -m http.server 8000
# Then visit http://localhost:8000/flappybird-[implementation]/
```

### Testing
No automated tests are present. Testing is done manually by:
1. Opening the game in multiple browsers
2. Testing touch controls on mobile devices
3. Verifying 60fps performance
4. Checking collision detection accuracy

## Key Technical Considerations

### Performance
- All implementations target 60fps using requestAnimationFrame
- Efficient collision detection algorithms
- Canvas optimization techniques

### Responsive Design
- Mobile-first approach with touch controls
- Responsive canvas sizing
- Cross-browser compatibility

### Browser Support
- Modern browsers (Chrome 70+, Firefox 65+, Safari 12+, Edge 79+)
- HTML5 Canvas and ES6+ JavaScript features
- Web Audio API for sound (where implemented)

## Quality Comparison Notes

Based on the readme.md analysis:
- **Augment** - Most polished implementation with comprehensive features
- **Claude Code** - High quality, clean implementation  
- **Cursor** - Good instruction following and plan-based development
- **Cline with xAI** - Solid implementation with good spec documentation
- **Gemini Web/Code Assist** - Functional but with some issues in Copilot version

## File Locations for Reference

- Main readme: `readme.md` - Contains detailed AI tool comparison
- Best implementation: `flappybird-augment/` - Most comprehensive with deployment docs
- Planning examples: `flappybird-claude-code/PLAN.md`, `flappybird-cursor/development-plan.md`