import { Relic, RelicOption, GameState } from '../types'
import { advanceToNextLevel } from './cardSystem'

export function createRelic(name: string, description: string, hoverText: string): Relic {
  return {
    id: crypto.randomUUID(),
    name,
    description,
    hoverText
  }
}

export function createRelicOptions(): RelicOption[] {
  const allRelics = [
    createRelic(
      'Double Broom', 
      'brush some nearby tiles when cleaning',
      'Double Broom: whenever you reveal a tile, apply the Brush effect to two random unrevealed adjacent tiles'
    ),
    createRelic(
      'Dust Bunny',
      'animal companion who helps you clean', 
      'Dust Bunny: when you start a new level, you immediately reveal one of your non-dirty tiles at random, getting adjacency info just as if you revealed it normally'
    ),
    createRelic(
      'Frilly Dress',
      'your counterpart sometimes watches you clean rather than cleaning themselves',
      'Frilly Dress: the first time you reveal a neutral tile on your first turn of any level, your turn does not end'
    )
  ]
  
  // Shuffle the relics and take 3
  const shuffled = [...allRelics].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 3).map(relic => ({ relic }))
}

export function selectRelic(state: GameState, selectedRelic: Relic): GameState {
  const newRelics = [...state.relics, selectedRelic]
  
  const updatedState = {
    ...state,
    relics: newRelics,
    gamePhase: 'playing' as const,
    relicOptions: undefined
  }
  
  // Advance to next level with the selected relic
  return advanceToNextLevel(updatedState)
}

export function startRelicSelection(state: GameState): GameState {
  const relicOptions = createRelicOptions()
  return {
    ...state,
    gamePhase: 'relic_selection',
    relicOptions
  }
}

export function hasRelic(state: GameState, relicName: string): boolean {
  return state.relics.some(relic => relic.name === relicName)
}

// Relic effect implementations
export function triggerDoubleBroomEffect(state: GameState, revealedPosition: { x: number, y: number }): GameState {
  if (!hasRelic(state, 'Double Broom')) {
    return state
  }
  
  // Find unrevealed adjacent tiles
  const adjacentPositions = [
    { x: revealedPosition.x - 1, y: revealedPosition.y },
    { x: revealedPosition.x + 1, y: revealedPosition.y },
    { x: revealedPosition.x, y: revealedPosition.y - 1 },
    { x: revealedPosition.x, y: revealedPosition.y + 1 },
    { x: revealedPosition.x - 1, y: revealedPosition.y - 1 },
    { x: revealedPosition.x + 1, y: revealedPosition.y - 1 },
    { x: revealedPosition.x - 1, y: revealedPosition.y + 1 },
    { x: revealedPosition.x + 1, y: revealedPosition.y + 1 }
  ]
  
  const unrevealedAdjacent = adjacentPositions.filter(pos => {
    const key = `${pos.x},${pos.y}`
    const tile = state.board.tiles.get(key)
    return tile && !tile.revealed && tile.owner !== 'empty'
  })
  
  if (unrevealedAdjacent.length === 0) {
    return state
  }
  
  // Select up to 2 random adjacent tiles
  const shuffled = [...unrevealedAdjacent].sort(() => Math.random() - 0.5)
  const selectedTiles = shuffled.slice(0, Math.min(2, shuffled.length))
  
  // Apply brush effect to each selected tile
  let newState = state
  selectedTiles.forEach(pos => {
    newState = applyBrushEffectToTile(newState, pos)
  })
  
  return newState
}

function applyBrushEffectToTile(state: GameState, position: { x: number, y: number }): GameState {
  const key = `${position.x},${position.y}`
  const tile = state.board.tiles.get(key)
  
  if (!tile || tile.revealed) {
    return state
  }
  
  // Create a subset annotation that excludes a random owner
  const possibleOwners: Array<'player' | 'enemy' | 'neutral' | 'mine'> = ['player', 'enemy', 'neutral', 'mine']
  const randomOwnerToExclude = possibleOwners[Math.floor(Math.random() * possibleOwners.length)]
  
  const newOwnerSubset = new Set(possibleOwners.filter(owner => owner !== randomOwnerToExclude))
  
  const existingSubsetAnnotation = tile.annotations.find(a => a.type === 'owner_subset')
  
  let newAnnotations
  if (existingSubsetAnnotation && existingSubsetAnnotation.ownerSubset) {
    // Intersect with existing subset
    const intersectedSubset = new Set(
      Array.from(newOwnerSubset).filter(owner => existingSubsetAnnotation.ownerSubset!.has(owner))
    )
    newAnnotations = tile.annotations.map(a =>
      a.type === 'owner_subset'
        ? { ...a, ownerSubset: intersectedSubset }
        : a
    )
  } else {
    // Create new subset annotation
    newAnnotations = [
      ...tile.annotations,
      {
        type: 'owner_subset' as const,
        ownerSubset: newOwnerSubset
      }
    ]
  }
  
  const newTiles = new Map(state.board.tiles)
  newTiles.set(key, {
    ...tile,
    annotations: newAnnotations
  })
  
  return {
    ...state,
    board: {
      ...state.board,
      tiles: newTiles
    }
  }
}

export function triggerDustBunnyEffect(state: GameState): GameState {
  if (!hasRelic(state, 'Dust Bunny')) {
    return state
  }
  
  // Find all unrevealed player tiles that are not dirty
  const unrevealedPlayerTiles = Array.from(state.board.tiles.values()).filter(tile => 
    tile.owner === 'player' && 
    !tile.revealed && 
    tile.specialTile !== 'extraDirty'
  )
  
  if (unrevealedPlayerTiles.length === 0) {
    return state
  }
  
  // Select a random player tile
  const randomTile = unrevealedPlayerTiles[Math.floor(Math.random() * unrevealedPlayerTiles.length)]
  
  // Reveal the tile
  const key = `${randomTile.position.x},${randomTile.position.y}`
  const newTiles = new Map(state.board.tiles)
  
  // Calculate adjacency count for this tile
  const adjacentPlayerTiles = [
    { x: randomTile.position.x - 1, y: randomTile.position.y },
    { x: randomTile.position.x + 1, y: randomTile.position.y },
    { x: randomTile.position.x, y: randomTile.position.y - 1 },
    { x: randomTile.position.x, y: randomTile.position.y + 1 },
    { x: randomTile.position.x - 1, y: randomTile.position.y - 1 },
    { x: randomTile.position.x + 1, y: randomTile.position.y - 1 },
    { x: randomTile.position.x - 1, y: randomTile.position.y + 1 },
    { x: randomTile.position.x + 1, y: randomTile.position.y + 1 }
  ].filter(pos => {
    const adjKey = `${pos.x},${pos.y}`
    const adjTile = state.board.tiles.get(adjKey)
    return adjTile && adjTile.owner === 'player'
  }).length
  
  newTiles.set(key, {
    ...randomTile,
    revealed: true,
    revealedBy: 'player',
    adjacencyCount: adjacentPlayerTiles
  })
  
  return {
    ...state,
    board: {
      ...state.board,
      tiles: newTiles
    }
  }
}

export function checkFrillyDressEffect(state: GameState, revealedTile: { owner: string }): boolean {
  if (!hasRelic(state, 'Frilly Dress')) {
    return false
  }
  
  // Check if this is first turn and first neutral reveal
  return state.isFirstTurn && 
         !state.hasRevealedNeutralThisTurn && 
         revealedTile.owner === 'neutral'
}