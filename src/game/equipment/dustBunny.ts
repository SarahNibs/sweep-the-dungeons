import { GameState, Tile } from '../../types'
import { calculateAdjacency, removeSpecialTile, canPlayerRevealInnerTile } from '../boardSystem'
import { hasEquipment } from './equipmentUtils'

/**
 * Helper function to reveal a random unrevealed player tile (excluding dirty tiles).
 * Automatically defuses surface mines if present.
 * @returns Object containing updated state, the revealed tile (or null if none available), and copper gained from defusing
 */
function revealRandomPlayerTile(state: GameState): { state: GameState, revealedTile: Tile | null, copperGained: number } {
  // Find all unrevealed player tiles that are not dirty and not inner tiles with unrevealed sanctums
  const unrevealedPlayerTiles = Array.from(state.board.tiles.values()).filter(tile =>
    tile.owner === 'player' &&
    !tile.revealed &&
    !tile.specialTiles.includes('extraDirty') &&
    canPlayerRevealInnerTile(state.board, tile.position)
  )

  if (unrevealedPlayerTiles.length === 0) {
    return { state, revealedTile: null, copperGained: 0 }
  }

  // Select a random player tile
  const randomTile = unrevealedPlayerTiles[Math.floor(Math.random() * unrevealedPlayerTiles.length)]

  // Check if this tile has a surface mine and defuse it first
  let currentState = state
  let copperFromDefusing = 0
  const key = `${randomTile.position.x},${randomTile.position.y}`
  let tileToReveal = randomTile

  if (randomTile.specialTiles.includes('surfaceMine')) {
    const newTiles = new Map(currentState.board.tiles)
    const defusedTile = removeSpecialTile(randomTile, 'surfaceMine')
    newTiles.set(key, defusedTile)
    tileToReveal = defusedTile
    currentState = {
      ...currentState,
      board: {
        ...currentState.board,
        tiles: newTiles
      },
      copper: currentState.copper + 3
    }
    copperFromDefusing = 3
  }

  // Now reveal the tile (with surface mine removed if it had one)
  const newTiles = new Map(currentState.board.tiles)

  // Calculate adjacency count using the board's adjacency rule
  const adjacencyCount = calculateAdjacency(currentState.board, tileToReveal.position, 'player')

  const revealedTile = {
    ...tileToReveal,
    revealed: true,
    revealedBy: 'player' as const,
    adjacencyCount
  }

  newTiles.set(key, revealedTile)

  return {
    state: {
      ...currentState,
      board: {
        ...currentState.board,
        tiles: newTiles
      }
    },
    revealedTile,
    copperGained: copperFromDefusing
  }
}

export function triggerDustBunnyEffect(state: GameState): GameState {
  if (!hasEquipment(state, 'Dust Bunny')) {
    return state
  }

  const { state: newState } = revealRandomPlayerTile(state)
  return newState
}

export function triggerTemporaryBunnyBuffs(state: GameState): GameState {
  if (state.temporaryBunnyBuffs <= 0) {
    return state
  }

  // Reveal tiles for all buffs in a loop
  let currentState = state
  let buffsRemaining = state.temporaryBunnyBuffs

  while (buffsRemaining > 0) {
    const { state: newState, revealedTile } = revealRandomPlayerTile(currentState)

    if (!revealedTile) {
      // No tiles to reveal, consume remaining buffs and exit
      return {
        ...newState,
        temporaryBunnyBuffs: 0
      }
    }

    currentState = newState
    buffsRemaining--
  }

  return {
    ...currentState,
    temporaryBunnyBuffs: 0
  }
}

export function triggerMatedPairEffect(state: GameState): GameState {
  if (!hasEquipment(state, 'Mated Pair')) {
    return state
  }

  const { state: newState } = revealRandomPlayerTile(state)
  return newState
}

export function triggerBabyBunnyEffect(state: GameState): GameState {
  if (!hasEquipment(state, 'Baby Bunny')) {
    return state
  }

  const { state: newState } = revealRandomPlayerTile(state)
  return newState
}
