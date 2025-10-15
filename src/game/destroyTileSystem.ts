import { Board, Tile, Position, TileAnnotation } from '../types'
import { getTile, positionToKey, getNeighbors, calculateAdjacency } from './boardSystem'

/**
 * Destroy a tile, making it behave like an empty tile for all game purposes:
 * - Changes owner to 'empty'
 * - Keeps 'destroyed' marker for visual feedback
 * - Recalculates adjacencies for all neighboring revealed tiles
 * - Removes tile from all clue annotations
 */
export function destroyTile(board: Board, position: Position): Board {
  const tile = getTile(board, position)

  if (!tile) {
    return board
  }

  // Allow destroying empty tiles if they have special properties (like lairs)
  // But skip if already destroyed or truly empty
  if (tile.owner === 'empty') {
    const hasDestroyableSpecialTile = tile.specialTiles.some(st =>
      st === 'lair' || st === 'goblin' || st === 'extraDirty'
    )
    if (!hasDestroyableSpecialTile) {
      return board
    }
  }

  console.log(`💥 DESTROYING TILE at (${position.x}, ${position.y}), owner was: ${tile.owner}`)

  const newTiles = new Map(board.tiles)

  // Mark tile as destroyed and change owner to empty
  const destroyedTile: Tile = {
    ...tile,
    owner: 'empty',
    revealed: false, // Destroyed tiles are not revealed
    revealedBy: null,
    adjacencyCount: null,
    specialTiles: ['destroyed'], // Replace all special tiles with destroyed marker
    annotations: [] // Clear all annotations
  }

  newTiles.set(positionToKey(position), destroyedTile)

  // Create board with destroyed tile
  let updatedBoard: Board = {
    ...board,
    tiles: newTiles
  }

  // Recalculate adjacencies for all neighboring revealed tiles
  const neighbors = getNeighbors(board, position)
  for (const neighborPos of neighbors) {
    const neighbor = getTile(updatedBoard, neighborPos)
    if (neighbor && neighbor.revealed && neighbor.revealedBy) {
      // Recalculate adjacency count
      const newAdjacencyCount = calculateAdjacency(updatedBoard, neighborPos, neighbor.revealedBy)

      const updatedNeighbor: Tile = {
        ...neighbor,
        adjacencyCount: newAdjacencyCount
      }

      const updatedTiles = new Map(updatedBoard.tiles)
      updatedTiles.set(positionToKey(neighborPos), updatedNeighbor)
      updatedBoard = {
        ...updatedBoard,
        tiles: updatedTiles
      }

      console.log(`  - Updated adjacency for neighbor at (${neighborPos.x}, ${neighborPos.y}): ${neighbor.adjacencyCount} -> ${newAdjacencyCount}`)
    }
  }

  // Remove destroyed tile from all clue annotations across the board
  updatedBoard = removeFromClueAnnotations(updatedBoard, position)

  console.log(`✅ TILE DESTROYED at (${position.x}, ${position.y})`)
  return updatedBoard
}

/**
 * Remove a destroyed tile from all clue annotations on the board
 */
function removeFromClueAnnotations(board: Board, destroyedPosition: Position): Board {
  const newTiles = new Map(board.tiles)
  let changedCount = 0

  for (const [key, tile] of board.tiles) {
    const clueAnnotation = tile.annotations.find(a => a.type === 'clue_results')

    if (clueAnnotation && clueAnnotation.clueResults) {
      // Check if any clue results include the destroyed tile
      let hasDestroyedTile = false
      for (const clueResult of clueAnnotation.clueResults) {
        if (clueResult.allAffectedTiles.some(pos =>
          pos.x === destroyedPosition.x && pos.y === destroyedPosition.y
        )) {
          hasDestroyedTile = true
          break
        }
      }

      if (hasDestroyedTile) {
        // Update clue results to remove destroyed tile
        const updatedClueResults = clueAnnotation.clueResults.map(clueResult => {
          const updatedAffectedTiles = clueResult.allAffectedTiles.filter(pos =>
            !(pos.x === destroyedPosition.x && pos.y === destroyedPosition.y)
          )

          // Recalculate strength for this tile based on remaining affected tiles
          const tilePos = tile.position
          const isThisTileAffected = updatedAffectedTiles.some(pos =>
            pos.x === tilePos.x && pos.y === tilePos.y
          )

          return {
            ...clueResult,
            allAffectedTiles: updatedAffectedTiles,
            strengthForThisTile: isThisTileAffected ? clueResult.strengthForThisTile : 0
          }
        }).filter(clueResult => clueResult.strengthForThisTile > 0) // Remove clues that no longer affect this tile

        if (updatedClueResults.length > 0) {
          // Update annotations with filtered clue results
          const otherAnnotations = tile.annotations.filter(a => a.type !== 'clue_results')
          const updatedAnnotations: TileAnnotation[] = [
            ...otherAnnotations,
            {
              type: 'clue_results',
              clueResults: updatedClueResults
            }
          ]

          const updatedTile: Tile = {
            ...tile,
            annotations: updatedAnnotations
          }

          newTiles.set(key, updatedTile)
          changedCount++
        } else {
          // No clues remain for this tile, remove clue annotation entirely
          const otherAnnotations = tile.annotations.filter(a => a.type !== 'clue_results')
          const updatedTile: Tile = {
            ...tile,
            annotations: otherAnnotations
          }

          newTiles.set(key, updatedTile)
          changedCount++
        }
      }
    }
  }

  if (changedCount > 0) {
    console.log(`  - Removed destroyed tile from clue annotations on ${changedCount} tiles`)
  }

  return {
    ...board,
    tiles: newTiles
  }
}
