# Reasoning AI Specification

## Overview
The Reasoning AI uses Monte Carlo simulation with hill climbing to make probabilistic decisions about which rival tiles to reveal, combining constraint-based logic with statistical simulation.

## Algorithm Flow

### Phase 1: Initial Constraint Analysis
Use conservative AI logic to identify:
- **Excluded tiles**: Tiles that cannot be rival (based on clues and game state)
- **Guaranteed rival tiles**: Tiles that must be rival

**Early exit**: If guaranteed rival tiles exist, reveal one immediately (skip Monte Carlo).

### Phase 2: Monte Carlo Simulation (20 iterations)

For each of 20 independent iterations:

#### Step 2.1: Random Board Assignment
- For each unrevealed tile, determine which owners are "possible" based on game constraints
- Randomly assign tiles to match remaining counts:
  - Rival tiles: Assign to possibly-rival unrevealed positions
  - Player tiles: Assign to possibly-player unrevealed positions
  - Mine tiles: Assign to possibly-mine unrevealed positions
  - Neutral tiles: Assign to possibly-neutral unrevealed positions

#### Step 2.2: Hill Climbing (up to 100 steps, or until 0 tension)

For each hill climbing step:

##### Step 2.2.1: Calculate Tension
For each tile with adjacency information (from actual reveals, NOT player effects like Eavesdropping/Tingle):
- Compare actual adjacent tile count (in counterfactual assignment) to expected count
- If **mismatch exists**:
  - Let `diff = |actual_count - expected_count|`
  - Distribute tension differently based on over/under:

**Case A: Over-counting** (actual > expected)
Example: 5 adjacent player tiles when info says 3 (diff = 2)
- **3/4 of diff** → spread equally across adjacent tiles of the SAME owner type (counterfactually-assigned only)
  - In example: 2 * 3/4 = 1.5 tension split among 5 adjacent player tiles = 0.3 each
- **1/8 of diff** → spread equally across OTHER adjacent tiles (counterfactually-assigned only)
- **1/8 of diff** → spread equally across all non-adjacent tiles of DIFFERENT owner types (counterfactually-assigned only)

**Case B: Under-counting** (actual < expected)
Example: 1 adjacent rival tile when info says 3 (diff = 2)
- **3/4 of diff** → spread equally across adjacent tiles of DIFFERENT owner types (counterfactually-assigned only)
- **1/8 of diff** → spread equally across adjacent tiles of SAME owner type (counterfactually-assigned only)
- **1/8 of diff** → spread equally across all non-adjacent tiles of SAME owner type (counterfactually-assigned only)

**Important**: Only counterfactually-assigned tiles receive tension (not revealed/guaranteed tiles).

##### Step 2.2.2: Swap Step
1. Sort all counterfactually-assigned tiles by tension (highest first)
2. Pick a random tile from the top 5
3. Find the highest-tension tile with a DIFFERENT owner
4. Swap their counterfactual owner assignments
5. Recalculate tension

##### Step 2.2.3: Termination Check
- Stop if total tension reaches 0
- Stop if 100 steps completed
- Otherwise continue to next step

#### Step 2.3: Record Results
For each unrevealed, not-excluded, not-guaranteed tile:
- Record which owner it was assigned in this final configuration

### Phase 3: Priority Calculation

For each unrevealed, not-excluded, not-guaranteed tile:

1. **Base priority** = rival clue pips for this tile
   - Include Ramble bonus (applies to ALL tiles, not just those with pips)
   - Include Eyeshadow bonus (applies to ALL tiles, not just those with pips)
   - Include any other future effects (applied to ALL tiles)

2. **Rival bonus** = `log₂((rival_count + rival_bias) / (20 + denom_bias))`
   - `rival_count` = # times tile was assigned rival in 20 iterations
   - `rival_bias` = (# rival tiles left / 100) + 0.001
   - `denom_bias` = (# total unrevealed tiles / 100) + 0.001

3. **Mine penalty** = `(1/3) * log₂((mine_count + mine_bias) / (20 + denom_bias))`
   - `mine_count` = # times tile was assigned mine in 20 iterations
   - `mine_bias` = (# mine tiles left / 100) + 0.001
   - `denom_bias` = (# total unrevealed tiles / 100) + 0.001

4. **No-clue mine penalty** = -0.3 if:
   - Tile is actually a mine (ground truth)
   - AND tile did NOT receive rival clue pips THIS turn

**Final priority** = base_priority + rival_bonus - mine_penalty + no_clue_mine_penalty

### Phase 4: Tile Selection
- Sort all tiles by final priority (highest first)
- Reveal the highest priority tile

## Key Design Principles

1. **Only counterfactually-assigned tiles matter for tension/swapping**
   - Revealed tiles are fixed
   - Guaranteed tiles are fixed
   - Only the "guessed" tiles can create tension and be swapped

2. **Adjacency info sources**
   - Tiles revealed by player or rival (show adjacency counts)
   - NOT from player effects like Eavesdropping (gives info but not revealed)
   - NOT from Tingle (marks tiles but doesn't reveal them)

3. **Priority effects apply broadly**
   - Ramble/Eyeshadow bonuses apply to ALL tiles
   - Not just tiles with clue pips

4. **Bias terms prevent division by zero and extreme log values**
   - Small constants ensure numerical stability
   - Scale with remaining tiles for context-sensitivity

## Data Structures

```typescript
interface CounterfactualAssignment {
  // Map from position key to assigned owner
  assignments: Map<string, 'player' | 'rival' | 'neutral' | 'mine'>
  // Set of position keys that were counterfactually assigned (not revealed/guaranteed)
  counterfactualPositions: Set<string>
}

interface TensionInfo {
  // Map from position key to tension value (only counterfactual tiles)
  tensions: Map<string, number>
  totalTension: number
}

interface MonteCarloResults {
  // For each tile, count how many times it was assigned each owner
  ownerCounts: Map<string, {
    player: number
    rival: number
    neutral: number
    mine: number
  }>
}

interface TilePriority {
  position: Position
  priority: number
  breakdown: {
    basePriority: number
    rivalBonus: number
    minePenalty: number
    noClueMinePenalty: number
  }
}
```

## File Structure

```
src/game/ai/implementations/ReasoningAI.ts
src/game/ai/reasoning/
  ├── types.ts                    # Type definitions
  ├── exclusionLogic.ts           # Extract excluded/guaranteed tiles
  ├── possibilityChecker.ts       # Check which owners are possible per tile
  ├── randomAssignment.ts         # Create random valid board assignment
  ├── tensionCalculator.ts        # Calculate tension from adjacency mismatches
  ├── hillClimber.ts              # Hill climbing algorithm
  ├── monteCarloRunner.ts         # Run 20 independent hill climbing iterations
  ├── priorityCalculator.ts       # Calculate final priorities
  └── utils.ts                    # Shared utilities
```

## Implementation Phases

### Phase 1: Foundation (Types & Utilities)
- Define all types
- Create utility functions (position keys, counting, etc.)
- Extract exclusion logic from ConservativeAI

### Phase 2: Board Assignment
- Implement possibility checker (which owners are valid per tile)
- Implement random assignment algorithm
- Test with various board states

### Phase 3: Tension System
- Implement tension calculation from adjacency info
- Handle over-counting and under-counting cases
- Test tension distribution logic

### Phase 4: Hill Climbing
- Implement single swap step
- Implement full hill climbing iteration (up to 100 steps)
- Test convergence behavior

### Phase 5: Monte Carlo
- Implement runner for 20 iterations
- Aggregate results across iterations
- Test statistical properties

### Phase 6: Priority Calculation
- Implement base priority extraction (clue pips + bonuses)
- Implement rival bonus calculation
- Implement mine penalty calculation
- Test priority ranking

### Phase 7: Integration
- Create ReasoningAI class implementing RivalAI interface
- Orchestrate all phases
- Update AIRegistry
- End-to-end testing

## Testing Strategy

1. **Unit tests** for each component:
   - Possibility checker with various constraints
   - Random assignment produces valid boards
   - Tension calculation matches spec
   - Hill climbing reduces tension
   - Priority calculation uses correct formulas

2. **Integration tests**:
   - Full algorithm on known board states
   - Compare decisions with conservative AI
   - Verify performance (should be fast enough for turn-based play)

3. **Edge cases**:
   - No unrevealed tiles
   - All tiles excluded
   - Guaranteed tiles exist
   - Zero tension immediately
   - Extreme clue pip distributions

## Performance Considerations

- 20 iterations × 100 hill climbing steps = 2000 total configurations
- Each configuration needs tension calculation across all adjacency info
- Consider caching adjacency relationships
- Consider early termination when tension plateaus
