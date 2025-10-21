import { Position, Tile } from '../../../types'

/**
 * Ownership possibility flags for each tile
 */
export interface TileOwnershipFlags {
  player: boolean
  rival: boolean
  neutral: boolean
  mine: boolean
}

/**
 * Results from exclusion/guarantee analysis
 */
export interface ExclusionAnalysis {
  // Tiles that are guaranteed to be rival
  guaranteedRivals: Tile[]
  // Position keys of tiles ruled out as rival
  ruledOutRivals: Set<string>
  // Flags for all tiles (revealed and unrevealed)
  flags: Map<string, TileOwnershipFlags>
}

/**
 * Counterfactual board assignment for Monte Carlo simulation
 */
export interface CounterfactualAssignment {
  // Map from position key to assigned owner
  assignments: Map<string, 'player' | 'rival' | 'neutral' | 'mine'>
  // Set of position keys that were counterfactually assigned (not revealed/guaranteed)
  counterfactualPositions: Set<string>
}

/**
 * Tension information for hill climbing
 */
export interface TensionInfo {
  // Map from position key to tension value (only counterfactual tiles)
  tensions: Map<string, number>
  totalTension: number
}

/**
 * Adjacency information from a revealed tile
 */
export interface AdjacencyInfo {
  // Position of the tile with adjacency information
  position: Position
  // Who revealed this tile (determines which owner type is counted)
  revealedBy: 'player' | 'rival'
  // Expected count of adjacent tiles of revealer's owner type
  expectedCount: number
  // Adjacent tile positions
  adjacentPositions: Position[]
}

/**
 * Aggregated results from Monte Carlo simulation
 */
export interface MonteCarloResults {
  // For each tile position key, count how many times it was assigned each owner
  ownerCounts: Map<string, {
    player: number
    rival: number
    neutral: number
    mine: number
  }>
}

/**
 * Priority breakdown for a tile
 */
export interface TilePriority {
  tile: Tile
  priority: number
  breakdown: {
    basePriority: number
    rivalBonus: number
    minePenalty: number
    noClueMinePenalty: number
  }
}
