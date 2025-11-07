import { GameState } from '../../types'
import { calculateAdjacency, removeSpecialTile } from '../boardSystem'
import { hasEquipment } from './equipmentUtils'

export function triggerDustBunnyEffect(state: GameState): GameState {
  if (!hasEquipment(state, 'Dust Bunny')) {
    return state
  }

  // Find all unrevealed player tiles that are not dirty
  const unrevealedPlayerTiles = Array.from(state.board.tiles.values()).filter(tile =>
    tile.owner === 'player' &&
    !tile.revealed &&
    !tile.specialTiles.includes('extraDirty')
  )

  if (unrevealedPlayerTiles.length === 0) {
    return state
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

  newTiles.set(key, {
    ...tileToReveal,
    revealed: true,
    revealedBy: 'player',
    adjacencyCount
  })

  if (copperFromDefusing > 0) {
  }

  return {
    ...currentState,
    board: {
      ...currentState.board,
      tiles: newTiles
    }
  }
}

export function triggerTemporaryBunnyBuffs(state: GameState): GameState {
  if (state.temporaryBunnyBuffs <= 0) {
    return state
  }

  // Reveal tiles for all buffs in a loop
  let currentState = state
  let buffsRemaining = state.temporaryBunnyBuffs
  let totalCopperFromDefusing = 0

  while (buffsRemaining > 0) {
    // Find all unrevealed player tiles that are not dirty
    const unrevealedPlayerTiles = Array.from(currentState.board.tiles.values()).filter(tile =>
      tile.owner === 'player' &&
      !tile.revealed &&
      !tile.specialTiles.includes('extraDirty')
    )

    if (unrevealedPlayerTiles.length === 0) {
      // No tiles to reveal, consume remaining buffs and exit
      return {
        ...currentState,
        temporaryBunnyBuffs: 0
      }
    }

    // Select a random player tile
    const randomTile = unrevealedPlayerTiles[Math.floor(Math.random() * unrevealedPlayerTiles.length)]

    // Check if this tile has a surface mine and defuse it first
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
      totalCopperFromDefusing += 3
    }

    // Now reveal the tile (with surface mine removed if it had one)
    const newTiles = new Map(currentState.board.tiles)

    // Calculate adjacency count using the board's adjacency rule
    const adjacencyCount = calculateAdjacency(currentState.board, tileToReveal.position, 'player')

    newTiles.set(key, {
      ...tileToReveal,
      revealed: true,
      revealedBy: 'player',
      adjacencyCount
    })

    currentState = {
      ...currentState,
      board: {
        ...currentState.board,
        tiles: newTiles
      }
    }

    buffsRemaining--
  }

  if (totalCopperFromDefusing > 0) {
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

  // Find all unrevealed player tiles that are not dirty
  const unrevealedPlayerTiles = Array.from(state.board.tiles.values()).filter(tile =>
    tile.owner === 'player' &&
    !tile.revealed &&
    !tile.specialTiles.includes('extraDirty')
  )

  if (unrevealedPlayerTiles.length === 0) {
    return state
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

  newTiles.set(key, {
    ...tileToReveal,
    revealed: true,
    revealedBy: 'player',
    adjacencyCount
  })

  if (copperFromDefusing > 0) {
  }

  return {
    ...currentState,
    board: {
      ...currentState.board,
      tiles: newTiles
    }
  }
}

export function triggerBabyBunnyEffect(state: GameState): GameState {
  if (!hasEquipment(state, 'Baby Bunny')) {
    return state
  }

  // Find all unrevealed player tiles that are not dirty
  const unrevealedPlayerTiles = Array.from(state.board.tiles.values()).filter(tile =>
    tile.owner === 'player' &&
    !tile.revealed &&
    !tile.specialTiles.includes('extraDirty')
  )

  if (unrevealedPlayerTiles.length === 0) {
    return state
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

  newTiles.set(key, {
    ...tileToReveal,
    revealed: true,
    revealedBy: 'player',
    adjacencyCount
  })

  if (copperFromDefusing > 0) {
  }

  return {
    ...currentState,
    board: {
      ...currentState.board,
      tiles: newTiles
    }
  }
}
