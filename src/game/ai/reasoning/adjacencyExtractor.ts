import { GameState } from '../../../types'
import { getNeighbors } from '../../boardSystem'
import { AdjacencyInfo } from './types'

/**
 * Extract all adjacency information from revealed tiles
 *
 * Only includes adjacency info from actual reveals (tiles with revealed=true and adjacencyCount set).
 * Does NOT include player effects like:
 * - Eavesdropping (adds adjacencyInfo annotation but doesn't reveal tile)
 * - Tingle (adds clue results but doesn't reveal tile)
 *
 * @param state Current game state
 * @returns Array of adjacency information from all revealed tiles
 */
export function extractAdjacencyInfo(state: GameState): AdjacencyInfo[] {
  const adjacencyInfoList: AdjacencyInfo[] = []

  for (const tile of state.board.tiles.values()) {
    // Only consider tiles that are actually revealed
    if (!tile.revealed) continue
    if (tile.owner === 'empty') continue
    if (!tile.revealedBy) continue
    if (tile.adjacencyCount === null) continue

    // Get adjacent positions according to board's adjacency rule
    const adjacentPositions = getNeighbors(state.board, tile.position)

    adjacencyInfoList.push({
      position: tile.position,
      revealedBy: tile.revealedBy,
      expectedCount: tile.adjacencyCount,
      adjacentPositions
    })
  }

  return adjacencyInfoList
}
