# Rival AI System Implementation Plan

## Stage 1: Foundation & Interface Layer
**Goal**: Create the basic architecture without changing existing behavior
**Success Criteria**: Existing AI works through new interface layer
**Tests**: All existing tests pass, AI behavior unchanged

### Tasks
1. **Create base types and interfaces**
   - `src/game/ai/AITypes.ts` - Core interfaces (RivalAI, AIContext, AIModifiers)
   - `src/game/ai/AIController.ts` - Main controller class
   - Add AI-related status effect types to `src/types.ts`

2. **Create AI registry system**
   - `src/game/ai/AIRegistry.ts` - Factory for creating AI instances
   - Registration system for available AI types
   - Default AI selection logic

3. **Implement wrapper around existing AI**
   - `src/game/ai/implementations/NoGuessAI.ts` - Wraps current `rivalAI.ts` logic
   - Extract and refactor priority calculation into `src/game/ai/utils/priorityScoring.ts`
   - Move clue-related utilities to `src/game/ai/utils/aiCommon.ts`

4. **Update game integration**
   - Modify `store.ts` to use AIController instead of direct rivalAI import
   - Add AI status effect creation during level initialization
   - Ensure backward compatibility with existing level configs

**Status**: Complete

---

## Stage 2: Simple AI Variant
**Goal**: Stress test architecture by adding one new AI variant
**Success Criteria**: New AI variant can be used in levels easily and architecture supports easy expansion
**Tests**: Each AI type produces different tile selection patterns

### Tasks
1. **Implement RandomAI**
   - `src/game/ai/implementations/RandomAI.ts` - Pure random selection with special behavior respect
   - Useful for testing and as a difficulty floor

2. **Add level configuration support**
   - Extend `LevelConfig` interface to include `aiConfig` field
   - Update level initialization to respect AI type specifications
   - Create status effects for each AI type

3. **Create AI selection UI**
   - Debug panel or cheat system to test different AI types
   - Status effect tooltips explaining current AI behavior

**Status**: Complete

---

## Stage 3: Intelligent AI Implementation
**Goal**: Create AI that makes strategic decisions based on revealed information
**Success Criteria**: AI demonstrates understanding of adjacency numbers and board state
**Tests**: AI makes provably optimal decisions in controlled scenarios

### Tasks
1. **Implement ConservativeAI with Constraint Propagation** ✓
   - `src/game/ai/implementations/ConservativeAI.ts` - Iterative constraint propagation system
   - **Ownership flags**: Each tile tracks which owners (player/rival/neutral/mine) are possible
   - **Initialization**: Revealed tiles know their owner, unrevealed tiles start with all possibilities
   - **Constraint propagation**: Iterates through ALL revealed tiles (both player and rival)
     - If adjacency satisfied: rule out revealer from all other adjacent tiles
     - If revealed + could-be = required: all could-be tiles must be revealer
     - **Key insight**: Player adjacency info helps rule out rival tiles!
       - If player tile shows "8 adjacent player tiles" with 8 revealed, other adjacent tiles can't be player → might be rival
       - If some tiles are guaranteed player, they definitely aren't rival → avoid them
   - **Fixed-point iteration**: Repeats until no flags change (convergence)
   - **Decision making**:
     - Prioritize guaranteed rival tiles (only rival flag set)
     - Skip tiles ruled out as rival (rival flag false)
     - Fall back to clue priority for ambiguous tiles
   - **Re-application**: After each reveal, re-runs full constraint propagation
   - Comprehensive debugging showing iterations, flag changes, and reasoning

2. **Unified constraint system** ✓
   - Combined rivalNeverMines with constraint propagation framework
   - Extensible for future owner-based deductions

3. **Advanced AI behaviors** (Deferred to Stage 4)
   - `src/game/ai/implementations/ReasoningAI.ts` - Same as Conservative but uses probability too

**Status**: Complete (Ready for testing)

---

## Stage 4: Dynamic AI System
**Goal**: Support changing AI behavior mid-level
**Success Criteria**: AI can switch personalities between turns
**Tests**: Difficulty scaling works as intended, per-turn AI changes function correctly

### Tasks
1. **Per-turn AI variation**
   - Support for changing AI type between turns within a level
   - Status effect updates when AI changes
   - Smooth transitions between AI personalities

2. **Special event AI**
   - Boss-level AI with unique behaviors
   - Event-triggered AI changes (e.g., "rival gets desperate when losing")
   - Contextual AI responses to game state

**Status**: Not Started

---

## Stage 5: Polish & Integration
**Goal**: Complete the AI system with full level integration and player feedback
**Success Criteria**: AI system is fully functional across all levels with clear player communication
**Tests**: Full game playthrough with varied AI experiences

### Tasks
1. **Complete level configuration**
   - Update all level configs with appropriate AI types
   - Design AI progression curve across the campaign
   - Balance testing for each AI type

2. **Enhanced status effects**
   - Rich tooltips explaining AI behavior
   - Visual indicators for AI state changes
   - Player feedback for AI decision reasoning

4. **Documentation and testing**
   - Comprehensive AI behavior documentation
   - Unit tests for each AI implementation
   - Integration tests for AI system as a whole

**Status**: Not Started

---

## Technical Implementation Notes

### File Organization
```
src/game/ai/
├── AIController.ts         # Main controller
├── AITypes.ts              # Interfaces and types
├── AIRegistry.ts           # AI factory and registration
├── implementations/
│   ├── RandomAI.ts         # Random selection
│   ├── NoGuessAI.ts        # Current algorithm wrapper
│   ├── ConservativeAI.ts   # Adjacency-aware
│   └── ReasoningAI.ts      # Probability-aware
└── utils/
    ├── aiCommon.ts         # Shared utilities
    ├── priorityScoring.ts  # Refactored scoring
    └── clueAnalysis.ts     # Adjacency analysis
```

### Integration Points
- **store.ts**: Replace `processRivalTurnWithDualClues` call with AIController
- **cardSystem.ts**: Add AI status effects during level initialization
- **types.ts**: Extend StatusEffect and LevelConfig for AI support
- **Level configs**: Use `specialBehaviors.rivalAI` to specify AI type (e.g., `"rivalAI": "conservative"`)

### Backward Compatibility
- Default to NoGuessAI for levels without `specialBehaviors.rivalAI`
- Preserve all existing special behaviors (rivalNeverMines, adjacencyRule, etc.)
- Maintain current clue generation system as default
- No breaking changes to existing game mechanics
- Old `aiConfig` field is deprecated but still in types for future use

### Performance Considerations
- Lazy loading for complex AI implementations

This plan provides a clear path from current state to full AI system implementation while maintaining stability and backward compatibility throughout the process.