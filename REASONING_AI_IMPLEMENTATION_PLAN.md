# Reasoning AI Implementation Plan

## Overview
This document outlines the step-by-step implementation plan for the Reasoning AI, breaking down the complex algorithm into manageable tasks.

## Architecture Decisions

### 1. Code Organization
- Create dedicated `src/game/ai/reasoning/` directory for reasoning-specific logic
- Keep `ReasoningAI.ts` in `src/game/ai/implementations/` alongside other AI implementations
- Separate concerns: each major algorithm component in its own file

### 2. Reusability
- Extract exclusion logic from ConservativeAI into shared utility
- Both ConservativeAI and ReasoningAI can use the same exclusion logic
- Other future AIs can also benefit from this shared logic

### 3. Testability
- Pure functions wherever possible (no side effects)
- Each component takes inputs and returns outputs
- Easy to unit test each piece independently

### 4. Performance
- Use Map/Set for O(1) lookups
- Cache adjacency relationships during board setup
- Early termination conditions (0 tension, guaranteed tiles)

## Task Breakdown

### PHASE 1: Foundation & Setup (4 tasks)

#### Task 1.1: Create directory structure
**Files to create:**
- `src/game/ai/reasoning/types.ts`
- `src/game/ai/reasoning/utils.ts`

**Content:**
- Type definitions for all data structures
- Utility functions (position key conversion, counting, etc.)

**Acceptance criteria:**
- All types from spec are defined
- Basic utilities compile without errors

---

#### Task 1.2: Extract exclusion logic from ConservativeAI
**Files to create:**
- `src/game/ai/reasoning/exclusionLogic.ts`

**Files to modify:**
- `src/game/ai/implementations/ConservativeAI.ts` (refactor to use extracted logic)

**Content:**
- Extract the logic that determines excluded/guaranteed tiles
- Make it a standalone function that both AIs can use
- Function signature: `analyzeExclusionsAndGuarantees(state: GameState): ExclusionAnalysis`

**Acceptance criteria:**
- Conservative AI still works exactly as before
- Exclusion logic is reusable
- Type checker passes

---

#### Task 1.3: Implement adjacency info extractor
**Files to create:**
- `src/game/ai/reasoning/adjacencyExtractor.ts`

**Content:**
- Function to extract all adjacency information from the board
- Only from actual reveals (not player effects like Eavesdropping)
- Returns: position, owner type being counted, expected count

**Acceptance criteria:**
- Correctly identifies all tiles with adjacency info
- Filters out player effect annotations
- Handles both standard and manhattan-2 adjacency rules

---

#### Task 1.4: Implement possibility checker
**Files to create:**
- `src/game/ai/reasoning/possibilityChecker.ts`

**Content:**
- Function to determine which owners are "possible" for each unrevealed tile
- Takes into account:
  - Excluded tiles from analysis
  - Guaranteed tiles from analysis
  - Game constraints (remaining counts)
- Returns: Map<position, Set<owner>>

**Acceptance criteria:**
- Correctly marks excluded tiles as having 0 possibilities
- Guaranteed tiles have exactly 1 possibility
- Other tiles have 1-4 possibilities based on constraints

---

### PHASE 2: Random Assignment (2 tasks)

#### Task 2.1: Implement random assignment algorithm
**Files to create:**
- `src/game/ai/reasoning/randomAssignment.ts`

**Content:**
- Function to create a valid random assignment of all unrevealed tiles
- Algorithm:
  1. Start with revealed/guaranteed tiles
  2. Randomly shuffle unrevealed tile positions
  3. Assign remaining rival count to random possibly-rival positions
  4. Assign remaining player count to random possibly-player positions
  5. Assign remaining mine count to random possibly-mine positions
  6. Assign remaining neutral count to random possibly-neutral positions
- Returns: CounterfactualAssignment

**Acceptance criteria:**
- Total counts match remaining counts exactly
- All assignments respect possibility constraints
- Counterfactual positions tracked correctly

---

#### Task 2.2: Test random assignment
**Files to create:**
- Test cases in implementation file or separate test file

**Content:**
- Test with various board states
- Verify counts are correct
- Verify constraints are respected
- Verify randomness (run multiple times, get different results)

**Acceptance criteria:**
- All test cases pass
- No invalid assignments generated

---

### PHASE 3: Tension System (3 tasks)

#### Task 3.1: Implement tension calculation - over-counting case
**Files to create:**
- `src/game/ai/reasoning/tensionCalculator.ts`

**Content:**
- Function to calculate tension for over-counting case
- Given: tile with adjacency info, current assignment
- When: actual adjacent count > expected count
- Distribute tension:
  - 3/4 to adjacent tiles of SAME owner (counterfactual only)
  - 1/8 to adjacent tiles of OTHER owners (counterfactual only)
  - 1/8 to non-adjacent tiles of DIFFERENT owners (counterfactual only)

**Acceptance criteria:**
- Tension distribution sums to diff
- Only counterfactual tiles receive tension
- Edge cases handled (no tiles in a category)

---

#### Task 3.2: Implement tension calculation - under-counting case
**Files to modify:**
- `src/game/ai/reasoning/tensionCalculator.ts`

**Content:**
- Function to calculate tension for under-counting case
- When: actual adjacent count < expected count
- Distribute tension:
  - 3/4 to adjacent tiles of DIFFERENT owner (counterfactual only)
  - 1/8 to adjacent tiles of SAME owner (counterfactual only)
  - 1/8 to non-adjacent tiles of SAME owner (counterfactual only)

**Acceptance criteria:**
- Tension distribution sums to diff
- Only counterfactual tiles receive tension
- Edge cases handled

---

#### Task 3.3: Implement full tension calculation
**Files to modify:**
- `src/game/ai/reasoning/tensionCalculator.ts`

**Content:**
- Main function: `calculateTension(assignment, adjacencyInfo, board)`
- Iterate over all adjacency info
- Sum tensions from all sources
- Return TensionInfo with per-tile tensions and total

**Acceptance criteria:**
- Correctly aggregates tension from multiple sources
- Total tension equals sum of individual tensions
- Test with known adjacency mismatches

---

### PHASE 4: Hill Climbing (3 tasks)

#### Task 4.1: Implement swap operation
**Files to create:**
- `src/game/ai/reasoning/hillClimber.ts`

**Content:**
- Function to perform one swap:
  1. Sort counterfactual tiles by tension
  2. Pick random from top 5
  3. Find highest-tension tile with different owner
  4. Swap their owners
- Returns: new CounterfactualAssignment

**Acceptance criteria:**
- Swap preserves total counts
- Only counterfactual tiles can be swapped
- Edge cases handled (< 5 tiles, no different owner)

---

#### Task 4.2: Implement hill climbing iteration
**Files to modify:**
- `src/game/ai/reasoning/hillClimber.ts`

**Content:**
- Main function: `hillClimb(initialAssignment, adjacencyInfo, board)`
- Loop up to 100 times:
  1. Calculate tension
  2. If tension is 0, stop
  3. Perform swap
  4. Continue
- Returns: final CounterfactualAssignment

**Acceptance criteria:**
- Stops at 0 tension or 100 steps
- Tension generally decreases (not guaranteed, but usually)
- Final assignment is valid

---

#### Task 4.3: Test hill climbing
**Files to modify:**
- Add test cases

**Content:**
- Test with boards that have obvious tensions
- Verify tension decreases
- Test early termination
- Test 100-step limit

**Acceptance criteria:**
- Converges on simple cases
- Doesn't infinite loop
- Respects step limit

---

### PHASE 5: Monte Carlo (2 tasks)

#### Task 5.1: Implement Monte Carlo runner
**Files to create:**
- `src/game/ai/reasoning/monteCarloRunner.ts`

**Content:**
- Function: `runMonteCarloSimulation(state, exclusionAnalysis, adjacencyInfo)`
- Run 20 iterations:
  1. Create random assignment
  2. Run hill climbing
  3. Record final owner assignments
- Aggregate results across iterations
- Returns: MonteCarloResults

**Acceptance criteria:**
- Runs exactly 20 iterations
- Results aggregated correctly
- Each tile has counts summing to 20

---

#### Task 5.2: Test Monte Carlo
**Files to modify:**
- Add test cases

**Content:**
- Test on simple boards with known properties
- Verify counts sum to 20
- Verify statistical properties (e.g., guaranteed tile always assigned correct owner)

**Acceptance criteria:**
- All counts correct
- Guaranteed tiles have count 20 for their owner
- Excluded tiles have count 0 for excluded owner

---

### PHASE 6: Priority Calculation (3 tasks)

#### Task 6.1: Extract base priority (clue pips)
**Files to create:**
- `src/game/ai/reasoning/priorityCalculator.ts`

**Content:**
- Function to extract base priority from clue pips
- Includes:
  - Rival clue pips for each tile
  - Ramble bonuses (applied to ALL tiles)
  - Eyeshadow bonuses (applied to ALL tiles)
- Returns: Map<position, basePriority>

**Acceptance criteria:**
- Correctly sums clue pips per tile
- Ramble/Eyeshadow applied universally
- Handles no clues (all 0 priority)

---

#### Task 6.2: Implement priority adjustments
**Files to modify:**
- `src/game/ai/reasoning/priorityCalculator.ts`

**Content:**
- Function to calculate rival bonus: `log₂((rival_count + bias) / (20 + denom_bias))`
- Function to calculate mine penalty: `(1/3) * log₂((mine_count + bias) / (20 + denom_bias))`
- Function to check no-clue mine penalty: -0.3 if mine with no rival pips this turn

**Acceptance criteria:**
- Formulas match spec exactly
- Bias terms prevent division by zero
- Handles edge cases (count = 0, count = 20)

---

#### Task 6.3: Implement final priority calculation
**Files to modify:**
- `src/game/ai/reasoning/priorityCalculator.ts`

**Content:**
- Main function: `calculatePriorities(state, monteCarloResults, cluePipsThisTurn)`
- For each unrevealed, not-excluded, not-guaranteed tile:
  - Compute base + rival bonus - mine penalty + no-clue mine penalty
- Returns: sorted array of TilePriority

**Acceptance criteria:**
- All components combined correctly
- Sorted by priority (highest first)
- Breakdown available for debugging

---

### PHASE 7: Integration (3 tasks)

#### Task 7.1: Implement ReasoningAI class
**Files to create:**
- `src/game/ai/implementations/ReasoningAI.ts`

**Content:**
- Implement RivalAI interface
- Orchestrate all phases:
  1. Exclusion analysis
  2. Early exit if guaranteed tiles
  3. Monte Carlo simulation
  4. Priority calculation
  5. Tile selection
- Match ConservativeAI interface and structure

**Acceptance criteria:**
- Implements all required methods
- Returns valid tile to reveal
- Handles edge cases (no tiles, all excluded, etc.)

---

#### Task 7.2: Update AIRegistry
**Files to modify:**
- `src/game/ai/AIRegistry.ts`

**Content:**
- Change 'reasoning' from ConservativeAI to ReasoningAI
- Import ReasoningAI

**Acceptance criteria:**
- Registry creates ReasoningAI when requested
- Type checker passes

---

#### Task 7.3: End-to-end testing
**Files to create/modify:**
- Test in-game on various levels

**Content:**
- Test with debug command to set AI type
- Verify AI makes reasonable decisions
- Compare with conservative AI on same boards

**Acceptance criteria:**
- AI reveals valid tiles
- Decisions seem reasonable
- No crashes or errors

---

## Implementation Order

Execute tasks in phases, in order:
1. Phase 1 (Foundation) - Tasks 1.1 → 1.2 → 1.3 → 1.4
2. Phase 2 (Random Assignment) - Tasks 2.1 → 2.2
3. Phase 3 (Tension) - Tasks 3.1 → 3.2 → 3.3
4. Phase 4 (Hill Climbing) - Tasks 4.1 → 4.2 → 4.3
5. Phase 5 (Monte Carlo) - Tasks 5.1 → 5.2
6. Phase 6 (Priority) - Tasks 6.1 → 6.2 → 6.3
7. Phase 7 (Integration) - Tasks 7.1 → 7.2 → 7.3

## Rollback Plan

If implementation takes too long or encounters blockers:
1. Keep 'reasoning' mapped to ConservativeAI in registry
2. Complete implementation incrementally
3. Switch registry once confident in implementation

## Success Criteria

- [ ] All phases completed
- [ ] Type checker passes
- [ ] In-game testing successful
- [ ] AI makes reasonable decisions
- [ ] No regressions in other AI types
