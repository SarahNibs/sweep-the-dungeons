import { Relic, RelicOption, GameState } from '../types'
import { advanceToNextLevel } from './cardSystem'
import { shouldShowShopReward } from './levelSystem'
import { startShopSelection } from './shopSystem'
import { calculateAdjacency, getNeighbors } from './boardSystem'

import { getAllRelics } from './gameRepository'

export function createRelicOptions(): RelicOption[] {
  const allRelics = getAllRelics()
  
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
  
  // Check if this level should show shop rewards after relic selection
  if (shouldShowShopReward(state.currentLevelId)) {
    return startShopSelection(updatedState)
  } else {
    // No shop rewards - advance to next level immediately
    return advanceToNextLevel(updatedState)
  }
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
  
  // Find unrevealed adjacent tiles using the board's adjacency rule
  const adjacentPositions = getNeighbors(state.board, revealedPosition)
  
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
  
  // Apply single owner exclusion to each selected tile
  let newState = state
  selectedTiles.forEach(pos => {
    newState = applySingleOwnerExclusion(newState, pos)
  })
  
  return newState
}

function applySingleOwnerExclusion(state: GameState, position: { x: number, y: number }): GameState {
  const key = `${position.x},${position.y}`
  const tile = state.board.tiles.get(key)
  
  if (!tile || tile.revealed) {
    return state
  }
  
  // Find the actual owner of this tile
  const actualOwner = tile.owner
  
  // Pick a random owner from the OTHER three possible owners (exclude the actual owner)
  const allPossibleOwners: Array<'player' | 'enemy' | 'neutral' | 'mine'> = ['player', 'enemy', 'neutral', 'mine']
  const otherOwners = allPossibleOwners.filter(owner => owner !== actualOwner)
  
  const randomOwnerToExclude = otherOwners[Math.floor(Math.random() * otherOwners.length)]
  
  // Create subset that excludes the randomly chosen owner (but NOT the actual owner)
  const allOwners: Array<'player' | 'enemy' | 'neutral' | 'mine'> = ['player', 'enemy', 'neutral', 'mine']
  const newOwnerSubset = new Set(allOwners.filter(owner => owner !== randomOwnerToExclude))
  
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
  
  // Calculate adjacency count using the board's adjacency rule
  const adjacencyCount = calculateAdjacency(state.board, randomTile.position, 'player')
  
  newTiles.set(key, {
    ...randomTile,
    revealed: true,
    revealedBy: 'player',
    adjacencyCount
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

export function triggerTemporaryBunnyBuffs(state: GameState): GameState {
  if (state.temporaryBunnyBuffs <= 0) {
    return state
  }
  
  // Find all unrevealed player tiles that are not dirty
  const unrevealedPlayerTiles = Array.from(state.board.tiles.values()).filter(tile => 
    tile.owner === 'player' && 
    !tile.revealed && 
    tile.specialTile !== 'extraDirty'
  )
  
  if (unrevealedPlayerTiles.length === 0) {
    // No tiles to reveal, just consume the buff
    return {
      ...state,
      temporaryBunnyBuffs: state.temporaryBunnyBuffs - 1
    }
  }
  
  // Select a random player tile
  const randomTile = unrevealedPlayerTiles[Math.floor(Math.random() * unrevealedPlayerTiles.length)]
  
  // Reveal the tile
  const key = `${randomTile.position.x},${randomTile.position.y}`
  const newTiles = new Map(state.board.tiles)
  
  // Calculate adjacency count using the board's adjacency rule
  const adjacencyCount = calculateAdjacency(state.board, randomTile.position, 'player')
  
  newTiles.set(key, {
    ...randomTile,
    revealed: true,
    revealedBy: 'player',
    adjacencyCount
  })
  
  return {
    ...state,
    board: {
      ...state.board,
      tiles: newTiles
    },
    temporaryBunnyBuffs: state.temporaryBunnyBuffs - 1
  }
}

export function triggerBusyCanaryEffect(state: GameState): GameState {
  if (!hasRelic(state, 'Busy Canary')) {
    return state
  }
  
  let currentState = state
  let mineFound = false
  let attempts = 0
  const maxAttempts = 50 // Safety limit to prevent infinite loops
  
  while (!mineFound && attempts < maxAttempts) {
    attempts++
    
    // Get all tiles on the board
    const allTiles = Array.from(currentState.board.tiles.values()).filter(tile => 
      tile.owner !== 'empty' && !tile.revealed
    )
    
    if (allTiles.length === 0) {
      break // No tiles to scan
    }
    
    // Pick a random tile as center
    const randomTile = allTiles[Math.floor(Math.random() * allTiles.length)]
    const centerPosition = randomTile.position
    
    // Apply enhanced Canary effect (3x3 area)
    const tilesToCheck: { x: number, y: number }[] = []
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        tilesToCheck.push({
          x: centerPosition.x + dx,
          y: centerPosition.y + dy
        })
      }
    }
    
    // Check each tile and add appropriate annotation
    for (const pos of tilesToCheck) {
      const key = `${pos.x},${pos.y}`
      const tile = currentState.board.tiles.get(key)
      
      // Only process unrevealed tiles that exist on the board
      if (tile && !tile.revealed && tile.owner !== 'empty') {
        if (tile.owner === 'mine') {
          // This is a mine - exclude everything else (only mine possible)
          const mineOnlySubset = new Set<'player' | 'enemy' | 'neutral' | 'mine'>(['mine'])
          currentState = addBusyCanaryOwnerSubsetAnnotation(currentState, pos, mineOnlySubset)
          mineFound = true
        } else {
          // This is not a mine - exclude mine from possibilities  
          const noMineSubset = new Set<'player' | 'enemy' | 'neutral' | 'mine'>(['player', 'enemy', 'neutral'])
          currentState = addBusyCanaryOwnerSubsetAnnotation(currentState, pos, noMineSubset)
        }
      }
    }
  }
  
  return currentState
}

function addBusyCanaryOwnerSubsetAnnotation(state: GameState, position: { x: number, y: number }, ownerSubset: Set<'player' | 'enemy' | 'neutral' | 'mine'>): GameState {
  const key = `${position.x},${position.y}`
  const tile = state.board.tiles.get(key)
  
  if (!tile) return state
  
  const newTiles = new Map(state.board.tiles)
  
  // Find existing subset annotation if any
  const existingSubsetAnnotation = tile.annotations.find(a => a.type === 'owner_subset')
  const otherAnnotations = tile.annotations.filter(a => 
    a.type !== 'owner_subset' && a.type !== 'safe' && a.type !== 'unsafe' && a.type !== 'enemy'
  )
  
  let finalOwnerSubset: Set<'player' | 'enemy' | 'neutral' | 'mine'>
  
  if (existingSubsetAnnotation?.ownerSubset) {
    // Combine with existing subset through intersection
    const intersected = new Set<'player' | 'enemy' | 'neutral' | 'mine'>()
    for (const owner of ownerSubset) {
      if (existingSubsetAnnotation.ownerSubset.has(owner)) {
        intersected.add(owner)
      }
    }
    finalOwnerSubset = intersected
  } else {
    // No existing subset, use the new one
    finalOwnerSubset = new Set(ownerSubset)
  }
  
  // Only add annotation if the subset is non-empty
  const finalAnnotations = [...otherAnnotations]
  if (finalOwnerSubset.size > 0) {
    finalAnnotations.push({
      type: 'owner_subset',
      ownerSubset: finalOwnerSubset
    })
  }
  
  const annotatedTile = {
    ...tile,
    annotations: finalAnnotations
  }
  
  newTiles.set(key, annotatedTile)
  
  return {
    ...state,
    board: {
      ...state.board,
      tiles: newTiles
    }
  }
}

export function triggerMopEffect(state: GameState, tilesCleanedCount: number): GameState {
  if (!hasRelic(state, 'Mop') || tilesCleanedCount <= 0) {
    return state
  }
  
  // Draw one card per tile cleaned
  let currentState = state
  for (let i = 0; i < tilesCleanedCount; i++) {
    const { deck, hand, discard } = currentState
    let newHand = [...hand]
    let newDeck = [...deck]  
    let newDiscard = [...discard]

    if (newDeck.length === 0) {
      if (newDiscard.length === 0) {
        // No cards to draw, break early
        break
      }
      // Reshuffle discard into deck
      const shuffled = [...newDiscard]
      for (let j = shuffled.length - 1; j > 0; j--) {
        const k = Math.floor(Math.random() * (j + 1))
        ;[shuffled[j], shuffled[k]] = [shuffled[k], shuffled[j]]
      }
      newDeck = shuffled
      newDiscard = []
    }
    
    if (newDeck.length > 0) {
      const drawnCard = newDeck.pop()!
      newHand.push(drawnCard)
    }

    currentState = {
      ...currentState,
      deck: newDeck,
      hand: newHand,
      discard: newDiscard
    }
  }
  
  return currentState
}