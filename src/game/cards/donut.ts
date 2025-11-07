import { GameState, Position } from '../../types'
import { positionToKey, addSpecialTile, getNeighbors, getTile } from '../boardSystem'
import { addOwnerSubsetAnnotation } from '../cardEffects'

function getUnrevealedPlayerTiles(state: GameState): { position: Position; tile: import('../../types').Tile }[] {
  const unrevealed: { position: Position; tile: import('../../types').Tile }[] = []
  for (const tile of state.board.tiles.values()) {
    if (!tile.revealed && tile.owner === 'player') {
      unrevealed.push({ position: tile.position, tile })
    }
  }
  return unrevealed
}

/**
 * Donut card: Summon goblin(s) on random unrevealed player tile(s) and annotate as player
 * Base: 1 goblin
 * Enhanced: 2 goblins
 */
export function executeDonutEffect(state: GameState, enhanced: boolean = false): GameState {
  const playerTiles = getUnrevealedPlayerTiles(state)

  if (playerTiles.length === 0) {
    return state
  }

  const numberOfGoblins = enhanced ? 2 : 1
  const tilesToSummon = Math.min(numberOfGoblins, playerTiles.length)


  // Shuffle and pick random tiles
  const shuffled = [...playerTiles].sort(() => Math.random() - 0.5)
  const selectedTiles = shuffled.slice(0, tilesToSummon)

  let currentState = state

  for (const { position, tile } of selectedTiles) {
    // Add goblin to the tile
    const key = positionToKey(position)
    const newTiles = new Map(currentState.board.tiles)
    const tileWithGoblin = addSpecialTile(tile, 'goblin')
    newTiles.set(key, tileWithGoblin)

    currentState = {
      ...currentState,
      board: {
        ...currentState.board,
        tiles: newTiles
      }
    }


    // Annotate the tile as player
    const playerOwnerSubset = new Set<'player' | 'rival' | 'neutral' | 'mine'>(['player'])
    currentState = addOwnerSubsetAnnotation(currentState, position, playerOwnerSubset)

    // Add player adjacency info
    const neighborPositions = getNeighbors(currentState.board, position)
    let playerCount = 0

    for (const neighborPos of neighborPositions) {
      const neighborTile = getTile(currentState.board, neighborPos)
      if (neighborTile && neighborTile.owner === 'player') {
        playerCount++
      }
    }

    const adjacencyInfo = { player: playerCount }

    // Get the current tile with updated annotations
    const tileWithAnnotations = getTile(currentState.board, position)
    if (tileWithAnnotations) {
      // Remove any existing adjacency info annotation
      const existingAnnotations = tileWithAnnotations.annotations.filter(a => a.type !== 'adjacency_info')

      // Add the new adjacency info annotation
      const newAnnotations = [
        ...existingAnnotations,
        {
          type: 'adjacency_info' as const,
          adjacencyInfo
        }
      ]

      // Update the tile with the new annotation
      const newTiles = new Map(currentState.board.tiles)
      const key = positionToKey(position)
      newTiles.set(key, {
        ...tileWithAnnotations,
        annotations: newAnnotations
      })

      currentState = {
        ...currentState,
        board: {
          ...currentState.board,
          tiles: newTiles
        }
      }

    }
  }

  return currentState
}
