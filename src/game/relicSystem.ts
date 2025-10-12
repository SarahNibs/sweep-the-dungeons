import { Relic, RelicOption, GameState } from '../types'
import { advanceToNextLevel, drawCards } from './cardSystem'
import { shouldShowShopReward } from './levelSystem'
import { startShopSelection } from './shopSystem'
import { calculateAdjacency, getNeighbors } from './boardSystem'
import { revealTileWithRelicEffects } from './cardEffects'

import { getAllRelics, createCard } from './gameRepository'

export function createRelicOptions(ownedRelics: Relic[] = []): RelicOption[] {
  const allRelics = getAllRelics()
  
  // Filter out relics the player already owns
  const ownedRelicNames = new Set(ownedRelics.map(relic => relic.name))
  const availableRelics = allRelics.filter(relic => !ownedRelicNames.has(relic.name))
  
  // If we don't have enough unique relics, just use all available
  const shuffled = [...availableRelics].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 3).map(relic => ({ relic }))
}

export function selectRelic(state: GameState, selectedRelic: Relic): GameState {
  const newRelics = [...state.relics, selectedRelic]
  
  let updatedState = {
    ...state,
    relics: newRelics,
    relicOptions: undefined
  }
  
  // Apply special relic effects for Estrogen and Progesterone
  if (selectedRelic.name === 'Estrogen') {
    // Estrogen triggers upgrade display, continuation handled by closeRelicUpgradeDisplay
    return applyEstrogenEffect(updatedState)
  } else if (selectedRelic.name === 'Progesterone') {
    // Progesterone triggers upgrade display, continuation handled by closeRelicUpgradeDisplay
    return applyProgesteroneEffect(updatedState)
  } else {
    // For other relics, set gamePhase to playing and continue normal flow
    updatedState = {
      ...updatedState,
      gamePhase: 'playing' as const
    }
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
  const relicOptions = createRelicOptions(state.relics)
  return {
    ...state,
    gamePhase: 'relic_selection',
    relicOptions
  }
}

export function hasRelic(state: GameState, relicName: string): boolean {
  return state.relics.some(relic => relic.name === relicName)
}

function getEligibleCardsForUpgrade(cards: import('../types').Card[], upgradeType: 'cost_reduction' | 'enhance_effect'): import('../types').Card[] {
  return cards.filter(card => {
    if (upgradeType === 'cost_reduction') {
      // Can only reduce cost if cost > 0 and not already cost-reduced
      return card.cost > 0 && !card.costReduced
    } else {
      // Can only enhance if not already enhanced
      return !card.enhanced
    }
  })
}

function selectRandomCards(cards: import('../types').Card[], count: number): import('../types').Card[] {
  const shuffled = [...cards].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, cards.length))
}

export function applyEstrogenEffect(state: GameState): GameState {
  console.log('💉 ESTROGEN EFFECT - Applying cost reduction to 3 random cards')
  
  // Find eligible cards for cost reduction
  const eligibleCards = getEligibleCardsForUpgrade(state.persistentDeck, 'cost_reduction')
  console.log('💉 ESTROGEN - Eligible cards for cost reduction:', eligibleCards.length)
  
  if (eligibleCards.length === 0) {
    console.log('💉 ESTROGEN - No eligible cards, returning state unchanged')
    return state
  }
  
  // Select up to 3 random cards
  const selectedCards = selectRandomCards(eligibleCards, 3)
  console.log('💉 ESTROGEN - Selected cards for upgrade:', selectedCards.map(c => c.name))
  
  // Apply cost reduction upgrades
  const upgradeResults: { before: import('../types').Card; after: import('../types').Card }[] = []
  let newPersistentDeck = [...state.persistentDeck]
  
  selectedCards.forEach(card => {
    const upgradedCard = createCard(card.name, { costReduced: true, enhanced: card.enhanced })
    const cardIndex = newPersistentDeck.findIndex(c => c.id === card.id)
    
    if (cardIndex !== -1) {
      newPersistentDeck[cardIndex] = upgradedCard
      upgradeResults.push({ before: card, after: upgradedCard })
    }
  })
  
  console.log('💉 ESTROGEN - Applied upgrades to', upgradeResults.length, 'cards')
  
  return {
    ...state,
    persistentDeck: newPersistentDeck,
    gamePhase: 'relic_upgrade_display',
    relicUpgradeResults: upgradeResults
  }
}

export function applyProgesteroneEffect(state: GameState): GameState {
  console.log('💊 PROGESTERONE EFFECT - Applying enhanced effects to 3 random cards')
  
  // Find eligible cards for enhancement
  const eligibleCards = getEligibleCardsForUpgrade(state.persistentDeck, 'enhance_effect')
  console.log('💊 PROGESTERONE - Eligible cards for enhancement:', eligibleCards.length)
  
  if (eligibleCards.length === 0) {
    console.log('💊 PROGESTERONE - No eligible cards, returning state unchanged')
    return state
  }
  
  // Select up to 3 random cards
  const selectedCards = selectRandomCards(eligibleCards, 3)
  console.log('💊 PROGESTERONE - Selected cards for upgrade:', selectedCards.map(c => c.name))
  
  // Apply enhancement upgrades
  const upgradeResults: { before: import('../types').Card; after: import('../types').Card }[] = []
  let newPersistentDeck = [...state.persistentDeck]
  
  selectedCards.forEach(card => {
    const upgradedCard = createCard(card.name, { costReduced: card.costReduced, enhanced: true })
    const cardIndex = newPersistentDeck.findIndex(c => c.id === card.id)
    
    if (cardIndex !== -1) {
      newPersistentDeck[cardIndex] = upgradedCard
      upgradeResults.push({ before: card, after: upgradedCard })
    }
  })
  
  console.log('💊 PROGESTERONE - Applied upgrades to', upgradeResults.length, 'cards')
  
  return {
    ...state,
    persistentDeck: newPersistentDeck,
    gamePhase: 'relic_upgrade_display',
    relicUpgradeResults: upgradeResults
  }
}

export function closeRelicUpgradeDisplay(state: GameState): GameState {
  console.log('📋 CLOSING RELIC UPGRADE DISPLAY')

  const updatedState = {
    ...state,
    gamePhase: 'playing' as const,
    relicUpgradeResults: undefined
  }

  // Check if we're returning to an existing shop session (has shopOptions already)
  if (state.shopOptions) {
    // Return to shop with existing options and purchased items preserved
    return {
      ...updatedState,
      gamePhase: 'shop_selection'
    }
  }

  // Check if this level should show shop rewards after closing display
  if (shouldShowShopReward(state.currentLevelId)) {
    return startShopSelection(updatedState)
  } else {
    // No shop rewards - advance to next level immediately
    return advanceToNextLevel(updatedState)
  }
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
  const allPossibleOwners: Array<'player' | 'rival' | 'neutral' | 'mine'> = ['player', 'rival', 'neutral', 'mine']
  const otherOwners = allPossibleOwners.filter(owner => owner !== actualOwner)
  
  const randomOwnerToExclude = otherOwners[Math.floor(Math.random() * otherOwners.length)]
  
  // Create subset that excludes the randomly chosen owner (but NOT the actual owner)
  const allOwners: Array<'player' | 'rival' | 'neutral' | 'mine'> = ['player', 'rival', 'neutral', 'mine']
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

  // Reveal tiles for all buffs in a loop
  let currentState = state
  let buffsRemaining = state.temporaryBunnyBuffs

  while (buffsRemaining > 0) {
    // Find all unrevealed player tiles that are not dirty
    const unrevealedPlayerTiles = Array.from(currentState.board.tiles.values()).filter(tile =>
      tile.owner === 'player' &&
      !tile.revealed &&
      tile.specialTile !== 'extraDirty'
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

    // Reveal the tile
    const key = `${randomTile.position.x},${randomTile.position.y}`
    const newTiles = new Map(currentState.board.tiles)

    // Calculate adjacency count using the board's adjacency rule
    const adjacencyCount = calculateAdjacency(currentState.board, randomTile.position, 'player')

    newTiles.set(key, {
      ...randomTile,
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

  return {
    ...currentState,
    temporaryBunnyBuffs: 0
  }
}

export function triggerBusyCanaryEffect(state: GameState): GameState {
  if (!hasRelic(state, 'Busy Canary')) {
    return state
  }
  
  let currentState = state
  let mineFound = false
  const maxReveals = 2 // Try at most 2 area reveals
  
  for (let revealAttempt = 0; revealAttempt < maxReveals && !mineFound; revealAttempt++) {
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
          const mineOnlySubset = new Set<'player' | 'rival' | 'neutral' | 'mine'>(['mine'])
          currentState = addBusyCanaryOwnerSubsetAnnotation(currentState, pos, mineOnlySubset)
          mineFound = true
        } else {
          // This is not a mine - exclude mine from possibilities  
          const noMineSubset = new Set<'player' | 'rival' | 'neutral' | 'mine'>(['player', 'rival', 'neutral'])
          currentState = addBusyCanaryOwnerSubsetAnnotation(currentState, pos, noMineSubset)
        }
      }
    }
  }
  
  return currentState
}

function addBusyCanaryOwnerSubsetAnnotation(state: GameState, position: { x: number, y: number }, ownerSubset: Set<'player' | 'rival' | 'neutral' | 'mine'>): GameState {
  const key = `${position.x},${position.y}`
  const tile = state.board.tiles.get(key)
  
  if (!tile) return state
  
  const newTiles = new Map(state.board.tiles)
  
  // Find existing subset annotation if any
  const existingSubsetAnnotation = tile.annotations.find(a => a.type === 'owner_subset')
  const otherAnnotations = tile.annotations.filter(a => 
    a.type !== 'owner_subset' && a.type !== 'safe' && a.type !== 'unsafe' && a.type !== 'rival'
  )
  
  let finalOwnerSubset: Set<'player' | 'rival' | 'neutral' | 'mine'>
  
  if (existingSubsetAnnotation?.ownerSubset) {
    // Combine with existing subset through intersection
    const intersected = new Set<'player' | 'rival' | 'neutral' | 'mine'>()
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
  console.log('🧽 MOP EFFECT DEBUG')
  console.log('  - Has Mop relic:', hasRelic(state, 'Mop'))
  console.log('  - Tiles cleaned count:', tilesCleanedCount)
  console.log('  - Player relics:', state.relics.map(r => r.name))
  
  if (!hasRelic(state, 'Mop') || tilesCleanedCount <= 0) {
    console.log('  - Mop effect not triggered (no relic or no tiles cleaned)')
    return state
  }
  
  console.log(`  - Triggering Mop effect: drawing ${tilesCleanedCount} cards`)
  
  // Draw one card per tile cleaned using centralized draw function
  const result = drawCards(state, tilesCleanedCount)
  
  console.log('  - Mop effect completed')
  return result
}

export function triggerInterceptedNoteEffect(state: GameState): GameState {
  if (!hasRelic(state, 'Intercepted Communications')) {
    return state
  }
  
  console.log('🕵️ Triggering Intercepted Communications effect')
  
  // Find all unrevealed rival tiles
  const unrevealedRivalTiles = Array.from(state.board.tiles.values()).filter(tile =>
    tile.owner === 'rival' && !tile.revealed
  )
  
  if (unrevealedRivalTiles.length === 0) {
    console.log('  - No unrevealed rival tiles found')
    return state
  }
  
  // Pick a random rival tile to reveal
  const randomIndex = Math.floor(Math.random() * unrevealedRivalTiles.length)
  const tileToReveal = unrevealedRivalTiles[randomIndex]
  const position = tileToReveal.position
  
  console.log(`  - Revealing rival tile at (${position.x}, ${position.y})`)
  
  // Reveal the tile using the imported function
  const newState = revealTileWithRelicEffects(state, position, 'rival')
  
  console.log('  - Intercepted Communications effect completed')
  return newState
}

