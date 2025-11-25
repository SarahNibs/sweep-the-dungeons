import { Board, Tile, Position, TileAnnotation } from '../types'
import { getTile, positionToKey, getNeighbors, calculateAdjacency, hasSpecialTile } from './boardSystem'

/**
 * Recalculate adjacency_info annotations for all tiles that have them.
 * This is needed when neighbor relationships change (e.g., sanctum destruction).
 */
function recalculateAdjacencyInfoAnnotations(board: Board): Board {
  const newTiles = new Map(board.tiles)

  // Find all tiles with adjacency_info annotations
  for (const [key, tile] of board.tiles) {
    const adjacencyAnnotation = tile.annotations.find(a => a.type === 'adjacency_info')

    if (adjacencyAnnotation?.adjacencyInfo) {
      // Recalculate adjacency info using current neighbor relationships
      const neighborPositions = getNeighbors(board, tile.position)

      const adjacencyInfo: { player?: number; neutral?: number; rival?: number; mine?: number } = {}
      let playerCount = 0
      let neutralCount = 0
      let rivalCount = 0
      let mineCount = 0

      for (const neighborPos of neighborPositions) {
        const neighborTile = getTile(board, neighborPos)
        if (neighborTile) {
          switch (neighborTile.owner) {
            case 'player':
              playerCount++
              break
            case 'neutral':
              neutralCount++
              break
            case 'rival':
              rivalCount++
              break
            case 'mine':
              mineCount++
              break
          }
        }
      }

      // Only set values that were in the original annotation (preserve enhanced vs non-enhanced info)
      if (adjacencyAnnotation.adjacencyInfo.player !== undefined) adjacencyInfo.player = playerCount
      if (adjacencyAnnotation.adjacencyInfo.neutral !== undefined) adjacencyInfo.neutral = neutralCount
      if (adjacencyAnnotation.adjacencyInfo.rival !== undefined) adjacencyInfo.rival = rivalCount
      if (adjacencyAnnotation.adjacencyInfo.mine !== undefined) adjacencyInfo.mine = mineCount

      // Update the annotation
      const otherAnnotations = tile.annotations.filter(a => a.type !== 'adjacency_info')
      const updatedAnnotations: TileAnnotation[] = [
        ...otherAnnotations,
        {
          type: 'adjacency_info',
          adjacencyInfo
        }
      ]

      newTiles.set(key, {
        ...tile,
        annotations: updatedAnnotations
      })
    }
  }

  return {
    ...board,
    tiles: newTiles
  }
}

/**
 * Release inner tiles connected to a sanctum when the sanctum is destroyed.
 * Removes the destroyed sanctum from each inner tile's connections.
 * Only fully releases the tile if it has no remaining sanctum connections.
 * Returns the updated board and list of fully released positions for adjacency recalculation.
 */
function releaseInnerTilesForSanctum(board: Board, sanctumPos: Position): { board: Board, releasedPositions: Position[] } {
  const releasedPositions: Position[] = []
  const newTiles = new Map(board.tiles)

  // Find all tiles connected to this sanctum
  for (const tile of board.tiles.values()) {
    if (tile.innerTile && tile.connectedSanctums && tile.connectedSanctums.length > 0) {
      // Check if this tile is connected to the destroyed sanctum
      const isConnectedToSanctum = tile.connectedSanctums.some(pos =>
        pos.x === sanctumPos.x && pos.y === sanctumPos.y
      )

      if (isConnectedToSanctum) {
        // Remove only this sanctum from the connections
        const remainingConnections = tile.connectedSanctums.filter(pos =>
          !(pos.x === sanctumPos.x && pos.y === sanctumPos.y)
        )

        // Only fully release if no sanctums remain
        const stillInner = remainingConnections.length > 0

        const updatedTile: Tile = {
          ...tile,
          innerTile: stillInner,
          connectedSanctums: remainingConnections
        }
        newTiles.set(positionToKey(tile.position), updatedTile)

        // Only mark as released if fully losing inner status
        if (!stillInner) {
          releasedPositions.push(tile.position)
        }
      }
    }
  }

  return {
    board: { ...board, tiles: newTiles },
    releasedPositions
  }
}

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

  // If destroying a sanctum, release all connected inner tiles first
  let releasedInnerTilePositions: Position[] = []
  if (hasSpecialTile(tile, 'sanctum')) {
    const releaseResult = releaseInnerTilesForSanctum(board, position)
    board = releaseResult.board
    releasedInnerTilePositions = releaseResult.releasedPositions
  }

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

    }
  }

  // Remove destroyed tile from all clue annotations across the board
  updatedBoard = removeFromClueAnnotations(updatedBoard, position)

  // Recalculate adjacency_info annotations (tile counts changed due to destruction)
  updatedBoard = recalculateAdjacencyInfoAnnotations(updatedBoard)

  // If we released inner tiles (sanctum destruction), recalculate adjacencies for revealed tiles near released tiles
  if (releasedInnerTilePositions.length > 0) {
    const tilesToUpdate = new Set<string>()

    // Find all revealed tiles that are now neighbors with released tiles
    for (const releasedPos of releasedInnerTilePositions) {
      const neighbors = getNeighbors(updatedBoard, releasedPos)
      for (const neighborPos of neighbors) {
        const neighbor = getTile(updatedBoard, neighborPos)
        if (neighbor && neighbor.revealed && neighbor.adjacencyCount !== null && neighbor.revealedBy) {
          tilesToUpdate.add(positionToKey(neighborPos))
        }
      }
    }

    // Recalculate adjacency for affected tiles
    for (const tileKey of tilesToUpdate) {
      const [x, y] = tileKey.split(',').map(Number)
      const pos = { x, y }
      const tile = getTile(updatedBoard, pos)
      if (tile && tile.revealed && tile.revealedBy) {
        const newAdjacencyCount = calculateAdjacency(updatedBoard, pos, tile.revealedBy)
        const updatedTile: Tile = {
          ...tile,
          adjacencyCount: newAdjacencyCount
        }
        const updatedTiles = new Map(updatedBoard.tiles)
        updatedTiles.set(tileKey, updatedTile)
        updatedBoard = {
          ...updatedBoard,
          tiles: updatedTiles
        }
      }
    }
  }

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
  }

  return {
    ...board,
    tiles: newTiles
  }
}
