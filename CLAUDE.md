# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"Sweep The Dungeons" is a single-player roguelike deckbuilder that combines Minesweeper-style grid mechanics with card-based information gathering. Players use cards to gather imperfect information about a grid, then make calculated risks revealing tiles while building their deck to reduce future uncertainty.

## Technology Stack

- **Frontend**: React 18+ with TypeScript
- **State Management**: Zustand 
- **Styling**: Tailwind CSS
- **Animation**: Framer Motion
- **Build Tool**: Vite
- **Deployment**: Static build for itch.io hosting

## Architecture Principles

### Event-Driven Architecture
The game uses an event queue system to handle all game state changes:
- All state mutations go through the event queue
- Prevents race conditions during animations
- Enables replay/undo functionality
- Clean separation between action triggers and state updates

### State Management Structure
```typescript
interface GameState {
  board: Board;           // Grid with tiles and adjacency data
  deck: Card[];          // Player's deck
  hand: Card[];          // Current hand
  energy: number;        // Turn resource
  phase: GamePhase;      // Turn state management
  ui: UIState;           // Separate UI state
}
```

### Core Game Mechanics

#### Adjacency Rule (Critical)
When any tile is revealed, the number shown equals adjacent tiles of the **revealer's team**:
- Player reveals their tile → count shows adjacent player tiles
- Enemy reveals their tile → count shows adjacent enemy tiles
- This asymmetric information system is the core puzzle mechanic

#### Tile Types
- **Player tiles** (8-10): Must reveal all to complete floor
- **Enemy tiles** (7-9): Safe to identify but not reveal
- **Neutral tiles** (5-8): Safe but ends turn
- **Instant Assassin** (1-3): Ends run immediately

#### Starting Cards
- **CLUE-2** (Cost 2): Probabilistic bag-based tile marking
- **CLUE-2** (Cost 2): Probabilistic bag-based tile marking
- **CLUE-5** (Cost 2): Probabilistic bag-based tile marking
- **SCOUT** (Cost 1): Reveals if tile is safe/dangerous
- **SCOUT** (Cost 1): Reveals if tile is safe/dangerous
- **SCOUT** (Cost 1): Reveals if tile is safe/dangerous
- **SCOUT** (Cost 1): Reveals if tile is safe/dangerous
- **ELIMINATION** (Cost 1): Marks random enemy tile
- **ELIMINATION** (Cost 1): Marks random enemy tile
- **QUANTUM CHOICE** (Cost 1): Auto-reveals safer of 2 chosen tiles

## Development Guidelines

### Implementation Priority (v0.1)
1. 6×5 board generation with tile ratios
2. Adjacency calculation system (per-revealer team)
3. Turn management (draw 5, gain 3 energy, reveal sequence)
4. Starting deck implementation
5. Win/loss conditions
6. Basic annotation UI (pips, safe/dangerous markers)

### Board Generation Rules
- Support seeding for consistent testing
- Recommended Floor 1 ratios: Player 9, Enemy 8, Neutral 6, Assassin 1

### UI/UX Requirements
- Fast input with hotkeys for common actions
- Clear visual hierarchy for annotations
- Information density: show turn history, energy, deck count
- Language-free annotation system using visual markers

### State Duplication Strategy
The architecture supports creating immutable state copies for:
- Simulation of hypothetical actions
- AI assistance calculations
- Reveal probability analysis
- Counterfactual analysis without affecting main game state

### File Structure (Planned)
```
src/
├── components/          # React components
│   ├── game/           # Game-specific UI
│   ├── cards/          # Card system UI
│   └── common/         # Reusable components
├── store/              # Zustand stores
├── game/               # Core game logic
│   ├── models/         # Data structures
│   ├── systems/        # Game systems
│   └── events/         # Event handlers
├── utils/              # Utility functions
└── constants/          # Game configuration
```

## Important Design Constraints

- Client-side only (no backend dependencies)
- All game state must be serializable
- Game logic completely separate from UI state
- Performance: cache expensive calculations (adjacency, probabilities)
- Animations should be fast enough for rapid play but clear for comprehension

## Testing Philosophy

The game should balance challenge with fairness:
- Occasional forced guesses are intended
- 50/50s should become 70/30s through good deckbuilding
- "Unfair" losses should trace to earlier decisions
- Players should clear Floor 1 consistently after 2-3 attempts

## Current Status

This is a pre-implementation project with comprehensive design documentation. The codebase currently contains only design documents (`game_draft.txt` and `tech_draft.txt`) that define the complete game mechanics and technical architecture.