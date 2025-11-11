import { GameState, Position } from '../../types'
import { positionToKey, addSpecialTile, hasSpecialTile } from '../boardSystem'
import { addOwnerSubsetAnnotation, updateNeighborAdjacencyInfo } from '../cardEffects'

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
    // Check if tile has a surface mine before adding goblin
    const hasMine = hasSpecialTile(tile, 'surfaceMine')

    // Add goblin to the tile
    const key = positionToKey(position)
    let newTiles = new Map(currentState.board.tiles)
    const tileWithGoblin = addSpecialTile(tile, 'goblin')
    newTiles.set(key, tileWithGoblin)

    currentState = {
      ...currentState,
      board: {
        ...currentState.board,
        tiles: newTiles
      }
    }

    // Check if goblin + surface mine collision
    if (hasMine) {
      // Explosion: remove goblin and mine, add destroyed, change to empty
      newTiles = new Map(currentState.board.tiles)
      const currentTile = newTiles.get(key)!
      const explodedSpecialTiles = currentTile.specialTiles.filter(
        s => s !== 'goblin' && s !== 'surfaceMine'
      )
      explodedSpecialTiles.push('destroyed')

      const originalOwner = currentTile.owner

      newTiles.set(key, {
        ...currentTile,
        owner: 'empty',
        specialTiles: explodedSpecialTiles,
        surfaceMineState: undefined // Clear surface mine state
      })

      currentState = {
        ...currentState,
        board: {
          ...currentState.board,
          tiles: newTiles
        }
      }

      // Update adjacency for neighbors if owner changed
      if (originalOwner !== 'empty') {
        currentState = updateNeighborAdjacencyInfo(currentState, position)
      }

      // Skip annotation logic for exploded tiles
      continue
    }

    // Annotate the tile as player
    const playerOwnerSubset = new Set<'player' | 'rival' | 'neutral' | 'mine'>(['player'])
    currentState = addOwnerSubsetAnnotation(currentState, position, playerOwnerSubset)
  }

  return currentState
}
