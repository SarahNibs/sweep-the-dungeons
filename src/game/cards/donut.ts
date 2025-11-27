import { GameState, Position } from '../../types'
import { positionToKey, addSpecialTile, hasSpecialTile } from '../boardSystem'
import { addOwnerSubsetAnnotation } from '../cardEffects'
import { destroyTile } from '../destroyTileSystem'

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
 * Prioritizes tiles without goblins; if all have goblins, just annotates without adding a second goblin
 */
export function executeDonutEffect(state: GameState, enhanced: boolean = false): GameState {
  const allPlayerTiles = getUnrevealedPlayerTiles(state)

  if (allPlayerTiles.length === 0) {
    return state
  }

  const numberOfGoblins = enhanced ? 2 : 1

  // Separate tiles into those without goblins (priority) and those with goblins
  const tilesWithoutGoblins = allPlayerTiles.filter(({ tile }) => !hasSpecialTile(tile, 'goblin'))
  const tilesWithGoblins = allPlayerTiles.filter(({ tile }) => hasSpecialTile(tile, 'goblin'))

  // Select tiles: prioritize those without goblins
  const selectedTiles: Array<{ position: Position; tile: import('../../types').Tile; hasGoblin: boolean }> = []

  // First, try to fill from tiles without goblins
  const shuffledWithout = [...tilesWithoutGoblins].sort(() => Math.random() - 0.5)
  for (let i = 0; i < Math.min(numberOfGoblins, shuffledWithout.length); i++) {
    selectedTiles.push({ ...shuffledWithout[i], hasGoblin: false })
  }

  // If we still need more, use tiles with goblins (just annotate, don't add second goblin)
  if (selectedTiles.length < numberOfGoblins && tilesWithGoblins.length > 0) {
    const shuffledWith = [...tilesWithGoblins].sort(() => Math.random() - 0.5)
    const needed = numberOfGoblins - selectedTiles.length
    for (let i = 0; i < Math.min(needed, shuffledWith.length); i++) {
      selectedTiles.push({ ...shuffledWith[i], hasGoblin: true })
    }
  }

  let currentState = state

  for (const { position, tile, hasGoblin } of selectedTiles) {
    const key = positionToKey(position)

    // If tile already has a goblin, just annotate it as player, don't add another goblin
    if (hasGoblin) {
      // Annotate the tile as player
      const playerOwnerSubset = new Set<'player' | 'rival' | 'neutral' | 'mine'>(['player'])
      currentState = addOwnerSubsetAnnotation(currentState, position, playerOwnerSubset)
      continue
    }

    // Check if tile has a surface mine before adding goblin
    const hasMine = hasSpecialTile(tile, 'surfaceMine')

    // Add goblin to the tile
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
      // Explosion: use destroyTile to properly update adjacency info and annotations
      currentState = {
        ...currentState,
        board: destroyTile(currentState.board, position)
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
