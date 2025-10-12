# Rival AI System Architecture Plan

## Current AI Analysis

### Current Architecture
The existing rival AI system is centralized in `src/game/rivalAI.ts` with these key components:
- **Single AI Strategy**: One hardcoded algorithm using clue-based priority scoring
- **Dual Clue System**: Generates both visible (X marks) and hidden clues for AI decisions
- **Direct Integration**: AI logic directly called from `store.ts` in `processRivalTurnWithDualClues()`
- **Special Behavior Support**: Handles `rivalNeverMines` flag but no AI personality variations

### Key Refactoring Needs
1. **Tight Coupling**: AI logic is directly imported and called from store
2. **No Abstraction**: Single hardcoded strategy with no interface for alternatives
3. **Limited Configuration**: Only supports boolean flags, not AI personality types
4. **No Turn-Level Variation**: AI behavior is static per level, not per turn
5. **Embedded Logic**: Priority calculation and tile selection mixed together

## Proposed Architecture

### 1. AI Interface Layer
Create a clean abstraction between game logic and AI implementations:

```typescript
// src/game/ai/AIController.ts
interface RivalAI {
  readonly name: string
  readonly description: string
  readonly icon: string
  
  // Core AI decision making
  selectTilesToReveal(
    state: GameState, 
    hiddenClues: ClueResult[],
    context: AIContext
  ): Tile[]
  
  // Optional: Custom clue generation behavior
  generateClues?(state: GameState): RivalClueSet
  
  // Optional: Turn-specific behavior modifiers
  getTurnModifiers?(state: GameState, turnNumber: number): AIModifiers
}

interface AIContext {
  levelConfig: LevelConfig
  turnNumber: number
  specialBehaviors: SpecialBehaviors
}

interface AIModifiers {
  aggressiveness: number    // 0-1 scale affecting risk tolerance
  priorityBoost: number     // Additional random factor
  avoidMines: boolean       // Override for mine avoidance
}
```

### 2. AI Implementation Types

- **NoGuessAI**: Current algorithm
- **ConservativeAI**: Makes deductions based on revealed adjacency numbers
- **ReasoningAI**: Makes deductions and reasonable guesses based on revealed adjacency numbers

### 3. Directory Structure
```
src/game/ai/
├── AIController.ts          # Main interface and controller
├── AITypes.ts               # Type definitions and interfaces
├── implementations/
│   ├── NoGuessAI.ts         # Current implementation: just clues
│   ├── ConservativeAI.ts    # Clues but also deductions
│   └── ReasoningAI.ts       # Clues, deductions, induction
├── utils/
│   ├── aiCommon.ts         # Shared utility functions
│   ├── priorityScoring.ts  # Refactored priority calculation
│   └── clueAnalysis.ts     # Adjacency information analysis
└── AIRegistry.ts           # Registration and factory for AI types
```

### 4. Configuration Integration

#### Level-Based AI Assignment
```typescript
// In LevelConfig
interface LevelConfig {
  // ... existing fields
  aiConfig?: {
    aiType: string           // e.g., "conservative", "informed", "random"
    aiParameters?: Record<string, any>  // AI-specific configuration
    turnVariation?: boolean  // Allow per-turn AI switching
  }
}
```

#### Per-Turn AI Variation
```typescript
// Support changing AI mid-level for dynamic difficulty
interface GameState {
  currentRivalAI: string     // Current AI type name
  aiTurnHistory: string[]    // Track AI changes for UI/debugging
}
```

### 5. Status Effect System Integration

#### AI Indicator Status Effects
```typescript
// Add to StatusEffect types
type StatusEffect = {
  // ... existing types
  | 'rival_ai_type'          // Shows current AI personality
  | 'rival_ai_adaptive'      // Shows adaptive difficulty state
}

// Example status effects
"NoGuess Rival"   // 🛡️ "Rival plays defensively this level"
"Conservative Rival"     // ⚔️ "Rival takes more risks this level"  
"Reasoning Rival"       // 🧠 "Rival uses revealed adjacency info"
```

### 6. Controller Implementation

#### AIController Responsibilities
1. **AI Selection**: Choose appropriate AI based on level config
2. **Context Building**: Prepare all information AI needs for decisions
3. **Result Processing**: Handle AI decisions and apply to game state
4. **Status Effects**: Manage AI-related status indicators
5. **Debugging**: Provide consistent logging/debugging interface

#### Integration Points
```typescript
// Replace direct rivalAI import in store.ts
import { AIController } from './game/ai/AIController'

// In processRivalTurn
const aiController = new AIController()
const rivalTurnResult = aiController.processRivalTurn(state)
```

### 7. Backward Compatibility

#### Migration Strategy
1. **Phase 1**: Create interface wrapper around existing `rivalAI.ts` code
2. **Phase 2**: Refactor existing logic into `NoGuessAI` implementation
3. **Phase 3**: Add new AI types while keeping default behavior identical
4. **Phase 4**: Update level configs to specify AI types

#### Default Behavior Preservation
- Levels without `aiConfig` use `NoGuessAI` (current algorithm)
- All existing special behaviors (`rivalNeverMines`, etc.) remain functional
- No changes to clue generation system unless AI overrides it

## Implementation Benefits

### For Players
- **Variety**: Different AI personalities create unique challenges
- **Progression**: AI difficulty can scale with level
- **Transparency**: Status effects clearly communicate AI behavior
- **Strategy**: Players can adapt tactics based on AI type

### For Development
- **Modularity**: Easy to add new AI types without touching core game logic
- **Testing**: Each AI can be tested independently
- **Debugging**: Clear separation between AI decisions and game mechanics
- **Performance**: AI complexity can be tuned per implementation

### For Balance
- **Granular Control**: Fine-tune difficulty through AI parameters
- **Special Challenges**: Boss levels can use unique AI behaviors

## Next Steps

1. **Create base interfaces** (`AIController.ts`, `AITypes.ts`)
2. **Implement wrapper** around existing AI as `NoGuessAI`
3. **Add AI selection logic** to level initialization
4. **Create status effect system** for AI indicators
6. **Build intelligent AI** (`ConservativeAI`) with adjacency analysis
7. **Add level config support** for AI type specification
8. **Create adaptive difficulty system** for dynamic AI scaling

This architecture provides a solid foundation for rich AI variety while maintaining backward compatibility and clear separation of concerns.