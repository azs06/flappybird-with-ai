# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a browser-based Flappy Bird clone implemented using vanilla HTML5, CSS3, and JavaScript. The game runs entirely in the browser using HTML5 Canvas for rendering.

## Development Commands

**Running the game:**
```bash
# Serve locally using Python (recommended)
python -m http.server 8000
# Or using Node.js
npx serve .
# Then visit http://localhost:8000
```

**No build tools:** This project uses no build system, bundlers, or package managers. Files are served directly.

**No testing framework:** There are no automated tests in this project.

## Architecture

**Game Loop Pattern:** The core architecture follows a standard game loop using `requestAnimationFrame()` for 60fps rendering.

**Key Components:**
- **Bird physics system** (`script.js:47-58`): Gravity-based movement with lift mechanics
- **Pipe generation** (`script.js:61-65`): Procedural obstacle creation every 150 frames
- **Collision detection** (`script.js:72-77`): AABB collision between bird and pipes
- **Game state management**: Global variables for `gameOver`, `gameStarted`, and `score`

**Data Flow:**
1. Input (spacebar) → State change (bird velocity/game start)
2. Physics update → Collision detection → Game state update
3. Canvas clearing → Object rendering → UI drawing

**Canvas Coordinate System:** 288x512 pixels with origin (0,0) at top-left

## Code Structure

**Single-file architecture:** All game logic is in `script.js` with no modules or external dependencies.

**Game entities:**
- `bird` object: Contains position, physics properties, and dimensions
- `pipes` array: Dynamic list of pipe obstacles with collision properties
- Game state variables: `score`, `gameOver`, `gameStarted`, `pipeLoc`

**Key Functions:**
- `gameLoop()`: Main update-render cycle
- Event listener for spacebar input handling

## Development Notes

- Game uses immediate mode rendering (canvas cleared each frame)
- Pipe generation occurs every 150 frame intervals
- Bird lift value is -15, gravity is 0.6 per frame
- Pipe gap is fixed at 100 pixels
- Score increments when bird passes between pipe pairs

## AI Agent Collaboration

This project supports collaboration between Claude Code and Gemini CLI for enhanced development workflows.

### Gemini CLI Access
```bash
# Basic usage
gemini -p "Your prompt here"

# Include all project files in context
gemini -a -p "Analyze entire project"

# Sandbox mode for safe experimentation
gemini -s -p "Test new features safely"

# Auto-accept mode for automated workflows
gemini -y -p "Fix all issues automatically"
```

### Collaboration Patterns

**1. Delegated Specialization:**
- Claude Code: File operations, testing, git management, tool integration
- Gemini: Creative design, research, advanced reasoning, visual improvements

**2. Pipeline Workflows:**
```bash
# Example improvement pipeline:
1. Claude Code: Analyze codebase, identify improvement areas
2. Gemini: Design solutions and improvements
3. Claude Code: Implement changes, run tests, manage files
4. Gemini: Review and optimize results
```

**3. Complementary Tasks:**
- **Design & UX**: Gemini excels at visual design suggestions and user experience improvements
- **Implementation**: Claude Code handles file system operations and code integration
- **Research**: Gemini can research best practices and modern patterns
- **Testing**: Claude Code manages test execution and validation

**4. Context Handoff:**
- Maintain project state and file context in Claude Code
- Pass focused context to Gemini for specific tasks
- Integrate results back into codebase systematically

### Recommended Workflows

**Code Quality Pipeline:**
```bash
1. Claude Code: "Run analysis and identify issues"
2. Gemini: "Fix specific issues: [issue list]" 
3. Claude Code: "Validate fixes and integrate changes"
```

**Feature Development:**
```bash
1. Gemini: "Design new feature architecture"
2. Claude Code: "Implement based on design"
3. Gemini: "Review and suggest optimizations"
```

**Visual/UX Improvements:**
```bash
1. Gemini: "Suggest visual design improvements"
2. Claude Code: "Implement design changes"
3. Both: "Iterate on improvements"
```

This multi-agent approach leverages the strengths of both AI systems for more effective development workflows.