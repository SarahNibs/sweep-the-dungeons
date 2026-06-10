import { GameState } from '../../../types'

/**
 * Select a random tile from those with maximum intent points
 * This is the default tile selection strategy for simple AIs
 */
export function selectTileByMaxPoints(
  state: GameState,
  rivalIntentPoints: { [key: string]: number }
): import('../../../types').Tile | null {
  if (state.debugFlags.debugLogging) {
    console.log(`[AI-SELECTION] selectTileByMaxPoints called with ${Object.keys(rivalIntentPoints).length} points`)
  }

  // Filter to only unrevealed tiles with points
  const unrevealedTilesWithPoints: { tile: import('../../../types').Tile, points: number }[] = []
  for (const [key, points] of Object.entries(rivalIntentPoints)) {
    const tile = state.board.tiles.get(key)
    if (tile && !tile.revealed) {
      unrevealedTilesWithPoints.push({ tile, points })
    }
  }

  if (unrevealedTilesWithPoints.length === 0) {
    if (state.debugFlags.debugLogging) {
      console.log(`[AI-SELECTION] No unrevealed tiles with intent points, returning null`)
    }
    return null
  }

  // Find the maximum point value from unrevealed tiles only
  const maxPoints = Math.max(...unrevealedTilesWithPoints.map(t => t.points))
  if (state.debugFlags.debugLogging) {
    console.log(`[AI-SELECTION] Max points (unrevealed only): ${maxPoints}`)
  }

  // Get all unrevealed tiles with max points
  const tilesWithMaxPoints = unrevealedTilesWithPoints
    .filter(t => t.points === maxPoints)
    .map(t => t.tile)

  if (tilesWithMaxPoints.length === 0) {
    if (state.debugFlags.debugLogging) {
      console.log(`[AI-SELECTION] No unrevealed tiles with max points, returning null`)
    }
    return null
  }

  if (state.debugFlags.debugLogging) {
    console.log(
      `[AI-SELECTION] Found ${tilesWithMaxPoints.length} tiles with ${maxPoints} points:`,
      tilesWithMaxPoints.map(t => `(${t.position.x},${t.position.y})`).join(', ')
    )
  }

  // Select one uniformly at random
  const selectedTile = tilesWithMaxPoints[Math.floor(Math.random() * tilesWithMaxPoints.length)]
  if (state.debugFlags.debugLogging) {
    console.log(`[AI-SELECTION] Selected tile (${selectedTile.position.x},${selectedTile.position.y})`)
  }

  return selectedTile
}
