import { GameState, CardEffect, Position, Tile, TileAnnotation, ClueResult, GameStatusInfo } from '../types'
import { positionToKey, getTile, clearSpecialTileState, revealTileWithResult } from './boardSystem'
import { generatePlayerSolidClue, generatePlayerStretchClue } from './clueSystem'
import { triggerDoubleBroomEffect, checkFrillyDressEffect, triggerMopEffect } from './relicSystem'
import { addStatusEffect, removeStatusEffect } from './gameRepository'

// Shared reveal function that includes relic effects
export function revealTileWithRelicEffects(state: GameState, position: Position, revealer: 'player' | 'enemy'): GameState {
  const revealResult = revealTileWithResult(state.board, position, revealer)
  const newBoard = revealResult.board
  
  let stateWithBoard = {
    ...state,
    board: newBoard
  }
  
  let underwireProtectionConsumed = false
  
  // Handle Underwire protection if player revealed a mine
  if (revealer === 'player' && revealResult.revealed) {
    const tile = getTile(newBoard, position)
    if (tile && tile.owner === 'mine' && state.underwireProtection?.active) {
      // Consume the underwire protection
      const isEnhanced = state.underwireProtection.enhanced
      stateWithBoard = {
        ...stateWithBoard,
        underwireProtection: null,
        underwireUsedThisTurn: !isEnhanced // Only mark for turn end if basic Underwire
      }
      // Remove the status effect
      stateWithBoard = removeStatusEffect(stateWithBoard, 'underwire_protection')
      underwireProtectionConsumed = true
    }
  }
  
  // Check game status after reveal (with potentially updated protection state)
  const gameStatus = checkGameStatus(stateWithBoard, underwireProtectionConsumed)
  
  stateWithBoard = {
    ...stateWithBoard,
    gameStatus
  }
  
  // Apply relic effects only for player reveals
  if (revealer === 'player') {
    // Trigger Double Broom effect if tile was revealed (not just cleaned)
    if (revealResult.revealed) {
      const updatedStateWithBroom = triggerDoubleBroomEffect(stateWithBoard, position)
      stateWithBoard = {
        ...stateWithBoard,
        board: updatedStateWithBroom.board
      }
    }
    
    // Check for Frilly Dress effect and update turn state
    if (revealResult.revealed) {
      const tile = getTile(stateWithBoard.board, position)
      if (tile && checkFrillyDressEffect(stateWithBoard, tile)) {
        stateWithBoard = {
          ...stateWithBoard,
          hasRevealedNeutralThisTurn: true
        }
      }
    }
  }
  
  return stateWithBoard
}

export function getUnrevealedTiles(state: GameState): Tile[] {
  const unrevealed: Tile[] = []
  for (const tile of state.board.tiles.values()) {
    if (!tile.revealed) {
      unrevealed.push(tile)
    }
  }
  return unrevealed
}

export function getUnrevealedTilesByOwner(state: GameState, owner: Tile['owner']): Tile[] {
  return getUnrevealedTiles(state).filter(tile => tile.owner === owner)
}

function combineOwnerSubsets(
  existing: Set<'player' | 'enemy' | 'neutral' | 'mine'>, 
  incoming: Set<'player' | 'enemy' | 'neutral' | 'mine'>
): Set<'player' | 'enemy' | 'neutral' | 'mine'> {
  // Intersection: only owners that are possible according to BOTH sets
  const combined = new Set<'player' | 'enemy' | 'neutral' | 'mine'>()
  
  for (const owner of existing) {
    if (incoming.has(owner)) {
      combined.add(owner)
    }
  }
  
  return combined
}

export function addOwnerSubsetAnnotation(
  state: GameState, 
  position: Position, 
  newOwnerSubset: Set<'player' | 'enemy' | 'neutral' | 'mine'>
): GameState {
  const key = positionToKey(position)
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
    finalOwnerSubset = combineOwnerSubsets(existingSubsetAnnotation.ownerSubset, newOwnerSubset)
  } else {
    // No existing subset, use the new one
    finalOwnerSubset = new Set(newOwnerSubset)
  }
  
  // Only add annotation if the subset is non-empty
  const finalAnnotations = [...otherAnnotations]
  if (finalOwnerSubset.size > 0) {
    finalAnnotations.push({
      type: 'owner_subset',
      ownerSubset: finalOwnerSubset
    })
  }
  
  const annotatedTile: Tile = {
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

export function addTileAnnotation(state: GameState, position: Position, annotation: TileAnnotation): GameState {
  const key = positionToKey(position)
  const tile = state.board.tiles.get(key)
  
  if (!tile) return state
  
  // Use new combining logic for owner_subset annotations
  if (annotation.type === 'owner_subset' && annotation.ownerSubset) {
    return addOwnerSubsetAnnotation(state, position, annotation.ownerSubset)
  }
  
  // Legacy logic for non-subset annotations
  const newTiles = new Map(state.board.tiles)
  let existingAnnotations = [...tile.annotations]
  
  // Handle annotation replacement rules
  if (annotation.type === 'enemy') {
    // Enemy annotations override safety annotations
    existingAnnotations = existingAnnotations.filter(a => a.type !== 'safe' && a.type !== 'unsafe')
  }
  
  const annotatedTile: Tile = {
    ...tile,
    annotations: [...existingAnnotations, annotation]
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

export function addClueResult(state: GameState, position: Position, clueResult: ClueResult): GameState {
  const key = positionToKey(position)
  const tile = state.board.tiles.get(key)
  
  if (!tile) {
    return state
  }
  
  const newTiles = new Map(state.board.tiles)
  
  // Find existing clue_results annotation or create new one
  const existingAnnotations = tile.annotations.filter(a => a.type !== 'clue_results')
  const clueAnnotation = tile.annotations.find(a => a.type === 'clue_results')
  
  const updatedClueResults = clueAnnotation?.clueResults || []
  updatedClueResults.push(clueResult)
  
  
  const newAnnotation: TileAnnotation = {
    type: 'clue_results',
    clueResults: updatedClueResults
  }
  
  const annotatedTile: Tile = {
    ...tile,
    annotations: [...existingAnnotations, newAnnotation]
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

export function executeScoutEffect(state: GameState, target: Position, card?: import('../types').Card): GameState {
  const tile = getTile(state.board, target)
  if (!tile || tile.revealed) return state
  
  let newState = state
  
  // If this is an extraDirty tile, clear the dirty state first
  if (tile.specialTile === 'extraDirty') {
    const key = positionToKey(target)
    const newTiles = new Map(state.board.tiles)
    const cleanedTile = clearSpecialTileState(tile)
    newTiles.set(key, cleanedTile)
    
    newState = {
      ...state,
      board: {
        ...state.board,
        tiles: newTiles
      }
    }
    
    // Trigger Mop effect for cleaning dirt
    newState = triggerMopEffect(newState, 1)
  }
  
  const isSafe = tile.owner === 'player' || tile.owner === 'neutral'
  const ownerSubset = isSafe 
    ? new Set<'player' | 'enemy' | 'neutral' | 'mine'>(['player', 'neutral'])
    : new Set<'player' | 'enemy' | 'neutral' | 'mine'>(['enemy', 'mine'])
  
  const stateWithMainScout = addOwnerSubsetAnnotation(newState, target, ownerSubset)
  
  // Enhanced Spritz: also scout a random adjacent tile
  if (card?.enhanced) {
    const adjacentPositions = [
      { x: target.x - 1, y: target.y },
      { x: target.x + 1, y: target.y },
      { x: target.x, y: target.y - 1 },
      { x: target.x, y: target.y + 1 },
      { x: target.x - 1, y: target.y - 1 },
      { x: target.x + 1, y: target.y - 1 },
      { x: target.x - 1, y: target.y + 1 },
      { x: target.x + 1, y: target.y + 1 }
    ]
    
    const unrevealedAdjacent = adjacentPositions.filter(pos => {
      const adjKey = `${pos.x},${pos.y}`
      const adjTile = stateWithMainScout.board.tiles.get(adjKey)
      return adjTile && !adjTile.revealed && adjTile.owner !== 'empty'
    })
    
    if (unrevealedAdjacent.length > 0) {
      // Pick a random adjacent tile to scout
      const randomAdjacent = unrevealedAdjacent[Math.floor(Math.random() * unrevealedAdjacent.length)]
      const adjTile = getTile(stateWithMainScout.board, randomAdjacent)
      
      if (adjTile) {
        const adjIsSafe = adjTile.owner === 'player' || adjTile.owner === 'neutral'
        const adjOwnerSubset = adjIsSafe 
          ? new Set<'player' | 'enemy' | 'neutral' | 'mine'>(['player', 'neutral'])
          : new Set<'player' | 'enemy' | 'neutral' | 'mine'>(['enemy', 'mine'])
        
        return addOwnerSubsetAnnotation(stateWithMainScout, randomAdjacent, adjOwnerSubset)
      }
    }
  }
  
  return stateWithMainScout
}

export function executeQuantumEffect(state: GameState, targets: Position[]): GameState {
  // Get all valid tiles
  const validTiles = targets
    .map(pos => ({ pos, tile: getTile(state.board, pos) }))
    .filter(({ tile }) => tile && !tile.revealed)
  
  if (validTiles.length === 0) return state
  
  // Determine which is safer (player > neutral > enemy > assassin)
  const getSafety = (tile: Tile): number => {
    switch (tile.owner) {
      case 'player': return 4
      case 'neutral': return 3  
      case 'enemy': return 2
      case 'mine': return 1
      default: return 0
    }
  }
  
  // Find the safest tile(s)
  const tilesWithSafety = validTiles.map(({ pos, tile }) => ({
    pos,
    tile: tile!,
    safety: getSafety(tile!)
  }))
  
  const maxSafety = Math.max(...tilesWithSafety.map(t => t.safety))
  const safestTiles = tilesWithSafety.filter(t => t.safety === maxSafety)
  
  // If multiple tiles have same safety, choose randomly
  const chosenTile = safestTiles[Math.floor(Math.random() * safestTiles.length)]
  
  // Reveal the chosen tile using the shared reveal function that includes relic effects
  const stateAfterReveal = revealTileWithRelicEffects(state, chosenTile.pos, 'player')
  
  // Add annotations to the non-revealed tiles
  const nonRevealedTiles = validTiles.filter(({ pos }) => 
    pos.x !== chosenTile.pos.x || pos.y !== chosenTile.pos.y
  )
  
  // Quantum reveals the safest tile, so unrevealed tiles are AT MOST as safe as revealed tile
  const revealedSafety = chosenTile.safety
  const possibleOwners = new Set<'player' | 'enemy' | 'neutral' | 'mine'>()
  
  // Add all owner types that are at most as safe as the revealed tile
  if (revealedSafety >= 1) possibleOwners.add('mine')   // mine = 1
  if (revealedSafety >= 2) possibleOwners.add('enemy')      // enemy = 2  
  if (revealedSafety >= 3) possibleOwners.add('neutral')    // neutral = 3
  if (revealedSafety >= 4) possibleOwners.add('player')     // player = 4
  
  // Apply annotation to all non-revealed tiles
  let finalState = stateAfterReveal
  for (const { pos } of nonRevealedTiles) {
    finalState = addOwnerSubsetAnnotation(finalState, pos, possibleOwners)
  }
  
  return finalState
}

export function executeReportEffect(state: GameState): GameState {
  const enemyTiles = getUnrevealedTilesByOwner(state, 'enemy')
  
  if (enemyTiles.length === 0) return state
  
  // Pick a random enemy tile
  const randomIndex = Math.floor(Math.random() * enemyTiles.length)
  const targetTile = enemyTiles[randomIndex]
  
  const ownerSubset = new Set<'player' | 'enemy' | 'neutral' | 'mine'>(['enemy'])
  return addOwnerSubsetAnnotation(state, targetTile.position, ownerSubset)
}

export function executeTargetedReportEffect(state: GameState, targetPosition: Position): GameState {
  const ownerSubset = new Set<'player' | 'enemy' | 'neutral' | 'mine'>(['enemy'])
  return addOwnerSubsetAnnotation(state, targetPosition, ownerSubset)
}


export function executeSolidClueEffect(state: GameState): GameState {
  const result = generatePlayerSolidClue(state, state.clueCounter + 1, state.playerClueCounter + 1)
  
  let newState = { 
    ...state, 
    clueCounter: state.clueCounter + 1,
    playerClueCounter: state.playerClueCounter + 1
  }
  
  // Use the clueResultPairs to properly match each ClueResult to its target position
  if (result.clueResultPairs) {
    for (const { clueResult, targetPosition } of result.clueResultPairs) {
      newState = addClueResult(newState, targetPosition, clueResult)
    }
  } else {
    for (const clueResult of result.clueResults) {
      if (clueResult.allAffectedTiles.length > 0) {
        newState = addClueResult(newState, clueResult.allAffectedTiles[0], clueResult)
      }
    }
  }
  
  return newState
}

export function executeStretchClueEffect(state: GameState): GameState {
  const result = generatePlayerStretchClue(state, state.clueCounter + 1, state.playerClueCounter + 1)
  
  let newState = { 
    ...state, 
    clueCounter: state.clueCounter + 1,
    playerClueCounter: state.playerClueCounter + 1
  }
  
  // Use the clueResultPairs to properly match each ClueResult to its target position
  if (result.clueResultPairs) {
    for (const { clueResult, targetPosition } of result.clueResultPairs) {
      newState = addClueResult(newState, targetPosition, clueResult)
    }
  }
  
  return newState
}





export function checkGameStatus(state: GameState, underwireProtectionConsumed: boolean = false): GameStatusInfo {
  const board = state.board
  
  // Count tiles first for potential enemy tiles left calculation
  let playerTilesRevealed = 0
  let totalPlayerTiles = 0
  let enemyTilesRevealed = 0
  let totalEnemyTiles = 0
  
  for (const tile of board.tiles.values()) {
    if (tile.owner === 'player') {
      totalPlayerTiles++
      if (tile.revealed) playerTilesRevealed++
    } else if (tile.owner === 'enemy') {
      totalEnemyTiles++
      if (tile.revealed) enemyTilesRevealed++
    }
  }

  // Check if mine was revealed
  for (const tile of board.tiles.values()) {
    if (tile.revealed && tile.owner === 'mine') {
      if (tile.revealedBy === 'player' && underwireProtectionConsumed) {
        // Player had mine protection that was just consumed - don't end game, just turn
        continue
      }
      
      return {
        status: tile.revealedBy === 'player' ? 'player_lost' : 'player_won',
        reason: tile.revealedBy === 'player' ? 'player_revealed_mine' : 'enemy_revealed_mine',
        enemyTilesLeft: tile.revealedBy === 'enemy' ? totalEnemyTiles - enemyTilesRevealed : undefined
      }
    }
  }
  
  // Check win conditions
  if (playerTilesRevealed === totalPlayerTiles) {
    return {
      status: 'player_won',
      reason: 'all_player_tiles_revealed',
      enemyTilesLeft: totalEnemyTiles - enemyTilesRevealed
    }
  }
  
  if (enemyTilesRevealed === totalEnemyTiles) {
    return {
      status: 'player_lost',
      reason: 'all_enemy_tiles_revealed'
    }
  }
  
  return { status: 'playing' }
}


export function executeCardEffect(state: GameState, effect: CardEffect, card?: import('../types').Card): GameState {
  switch (effect.type) {
    case 'scout':
      return executeScoutEffect(state, effect.target, card)
    case 'quantum':
      return executeQuantumEffect(state, effect.targets)
    case 'report':
      return executeReportEffect(state)
    case 'solid_clue':
      return executeSolidClueEffect(state)
    case 'stretch_clue':
      return executeStretchClueEffect(state)
    case 'energized':
      return executeEnergizedEffect(state, card)
    case 'options':
      return executeOptionsEffect(state, card)
    case 'brush':
      return executeBrushEffect(state, effect.target, card)
    case 'ramble':
      const maxBoost = card?.enhanced ? 4 : 2
      const stateWithRamble = {
        ...state,
        rambleActive: true,
        ramblePriorityBoosts: [...state.ramblePriorityBoosts, maxBoost] // Collect boost values
      }
      // Add ramble status effect
      return addStatusEffect(stateWithRamble, 'ramble_active', card?.enhanced)
    case 'sweep':
      return executeSweepEffect(state, effect.target, card)
    case 'underwire':
      return executeUnderwireEffect(state, card)
    case 'tryst':
      return executeTrystEffect(state, effect.target, card)
    case 'canary':
      return executeCanaryEffect(state, effect.target, card)
    default:
      return state
  }
}

export function requiresTargeting(cardName: string, enhanced?: boolean): boolean {
  if (cardName === 'Tryst') {
    return enhanced || false // Only enhanced Tryst requires targeting
  }
  return cardName === 'Spritz' || cardName === 'Easiest' || cardName === 'Brush' || cardName === 'Sweep' || cardName === 'Canary'
}

export function getTargetingInfo(cardName: string, enhanced?: boolean): { count: number; description: string } | null {
  switch (cardName) {
    case 'Spritz':
      return { count: 1, description: enhanced ? 'Click on an unrevealed tile to scout (also scouts adjacent tile)' : 'Click on an unrevealed tile to scout' }
    case 'Easiest':
      return { count: enhanced ? 3 : 2, description: enhanced ? 'Click on three unrevealed tiles - the safest will be revealed' : 'Click on two unrevealed tiles - the safer will be revealed' }
    case 'Brush':
      return { count: 1, description: enhanced ? 'Click center of 3x3 area to exclude random owners (applies twice)' : 'Click center of 3x3 area to exclude random owners' }
    case 'Sweep':
      return { count: 1, description: enhanced ? 'Click center of 7x7 area to remove all dirt' : 'Click center of 5x5 area to remove all dirt' }
    case 'Tryst':
      return enhanced ? { count: 1, description: 'Click target tile - reveals will be prioritized by distance from it' } : null
    case 'Canary':
      return { count: 1, description: enhanced ? 'Click center of 3x3 area to detect mines' : 'Click center of star area to detect mines' }
    default:
      return null
  }
}

// New card effects
export function executeEnergizedEffect(state: GameState, _card?: import('../types').Card): GameState {
  // Gain 2 energy (no maximum limit)
  // Enhanced version no longer exhausts (handled in cardSystem.ts)
  return {
    ...state,
    energy: state.energy + 2
  }
}

export function executeOptionsEffect(state: GameState, card?: import('../types').Card): GameState {
  // Enhanced: Draw 5 cards, Normal: Draw 3 cards
  const cardCount = card?.enhanced ? 5 : 3
  return drawCards(state, cardCount)
}

function drawCards(state: GameState, count: number): GameState {
  let { deck, hand, discard } = state
  const newHand = [...hand]
  let newDeck = [...deck]
  let newDiscard = [...discard]

  for (let i = 0; i < count; i++) {
    if (newDeck.length === 0) {
      if (newDiscard.length === 0) break
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
  }

  return {
    ...state,
    deck: newDeck,
    hand: newHand,
    discard: newDiscard
  }
}

export function executeBrushEffect(state: GameState, target: Position, card?: import('../types').Card): GameState {
  // Get 3x3 area around target position
  const centerX = target.x
  const centerY = target.y
  
  let currentState = state
  
  // Enhanced Brush applies the effect twice (two separate random exclusions per tile)
  const iterations = card?.enhanced ? 2 : 1
  
  for (let iteration = 0; iteration < iterations; iteration++) {
    const newTiles = new Map(currentState.board.tiles)
    
    // For each tile in 3x3 area
    for (let x = centerX - 1; x <= centerX + 1; x++) {
      for (let y = centerY - 1; y <= centerY + 1; y++) {
        const pos = { x, y }
        const key = positionToKey(pos)
        const tile = newTiles.get(key)
        
        // Only affect unrevealed tiles that are within board bounds
        if (tile && !tile.revealed) {
          // Pick one of the three non-owners at random to exclude
          const allOwners: ('player' | 'enemy' | 'neutral' | 'mine')[] = ['player', 'enemy', 'neutral', 'mine']
          const nonOwners = allOwners.filter(owner => owner !== tile.owner)
          
          if (nonOwners.length > 0) {
            // Pick 1 random owner to exclude from possibilities
            const excludedOwner = nonOwners[Math.floor(Math.random() * nonOwners.length)]
            const possibleOwners = new Set(allOwners.filter(owner => owner !== excludedOwner))
            
            // Add or update owner subset annotation
            const existingSubsetAnnotation = tile.annotations.find(a => a.type === 'owner_subset')
            const otherAnnotations = tile.annotations.filter(a => a.type !== 'owner_subset')
            
            let finalOwnerSet = possibleOwners
            if (existingSubsetAnnotation && existingSubsetAnnotation.ownerSubset) {
              // Combine with existing subset (intersection)
              finalOwnerSet = new Set()
              for (const owner of existingSubsetAnnotation.ownerSubset) {
                if (possibleOwners.has(owner)) {
                  finalOwnerSet.add(owner)
                }
              }
            }
            
            const newAnnotations: TileAnnotation[] = [
              ...otherAnnotations,
              {
                type: 'owner_subset',
                ownerSubset: finalOwnerSet
              }
            ]
            
            const updatedTile = {
              ...tile,
              annotations: newAnnotations
            }
            
            newTiles.set(key, updatedTile)
          }
        }
      }
    }
    
    currentState = {
      ...currentState,
      board: {
        ...currentState.board,
        tiles: newTiles
      }
    }
  }
  
  return currentState
}

export function executeSweepEffect(state: GameState, target: Position, card?: import('../types').Card): GameState {
  const newTiles = new Map(state.board.tiles)
  let tilesCleanedCount = 0
  
  // Enhanced: 7x7 area (-3 to +3), Normal: 5x5 area (-2 to +2)
  const range = card?.enhanced ? 3 : 2
  
  // Clear dirt in the specified area around the target position
  for (let dx = -range; dx <= range; dx++) {
    for (let dy = -range; dy <= range; dy++) {
      const x = target.x + dx
      const y = target.y + dy
      const key = `${x},${y}`
      const tile = newTiles.get(key)
      
      // Only process tiles that exist and have extraDirty special tile
      if (tile && tile.specialTile === 'extraDirty') {
        const updatedTile = clearSpecialTileState(tile)
        newTiles.set(key, updatedTile)
        tilesCleanedCount++
      }
    }
  }
  
  let finalState = {
    ...state,
    board: {
      ...state.board,
      tiles: newTiles
    }
  }
  
  // Trigger Mop effect for all cleaned tiles
  finalState = triggerMopEffect(finalState, tilesCleanedCount)
  
  return finalState
}

export function executeUnderwireEffect(state: GameState, card?: import('../types').Card): GameState {
  // Activate mine protection for this level
  const stateWithProtection = {
    ...state,
    underwireProtection: {
      active: true,
      enhanced: card?.enhanced || false
    }
  }
  // Add underwire status effect
  return addStatusEffect(stateWithProtection, 'underwire_protection', card?.enhanced)
}

function manhattanDistance(pos1: Position, pos2: Position): number {
  return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y)
}

export function executeTrystEffect(state: GameState, target?: Position, card?: import('../types').Card): GameState {
  // First, enemy reveals one of their tiles at random
  let currentState = state
  
  const enemyTiles = getUnrevealedTilesByOwner(state, 'enemy')
  if (enemyTiles.length > 0) {
    let chosenEnemyTile: import('../types').Tile
    
    if (card?.enhanced && target) {
      // Enhanced version: prioritize by Manhattan distance from target
      const tilesWithDistance = enemyTiles.map(tile => ({
        tile,
        distance: manhattanDistance(tile.position, target)
      }))
      
      // Find minimum distance
      const minDistance = Math.min(...tilesWithDistance.map(t => t.distance))
      const closestTiles = tilesWithDistance.filter(t => t.distance === minDistance)
      
      // Random tiebreaker among tiles at same distance
      chosenEnemyTile = closestTiles[Math.floor(Math.random() * closestTiles.length)].tile
    } else {
      // Basic version: completely random
      chosenEnemyTile = enemyTiles[Math.floor(Math.random() * enemyTiles.length)]
    }
    
    // Reveal the enemy tile
    currentState = revealTileWithRelicEffects(currentState, chosenEnemyTile.position, 'enemy')
  }
  
  // Then, player reveals one of their tiles at random  
  const playerTiles = getUnrevealedTilesByOwner(currentState, 'player')
  if (playerTiles.length > 0) {
    let chosenPlayerTile: import('../types').Tile
    
    if (card?.enhanced && target) {
      // Enhanced version: prioritize by Manhattan distance from target
      const tilesWithDistance = playerTiles.map(tile => ({
        tile,
        distance: manhattanDistance(tile.position, target)
      }))
      
      // Find minimum distance
      const minDistance = Math.min(...tilesWithDistance.map(t => t.distance))
      const closestTiles = tilesWithDistance.filter(t => t.distance === minDistance)
      
      // Random tiebreaker among tiles at same distance
      chosenPlayerTile = closestTiles[Math.floor(Math.random() * closestTiles.length)].tile
    } else {
      // Basic version: completely random
      chosenPlayerTile = playerTiles[Math.floor(Math.random() * playerTiles.length)]
    }
    
    // Reveal the player tile (triggering relic effects)
    currentState = revealTileWithRelicEffects(currentState, chosenPlayerTile.position, 'player')
  }
  
  return currentState
}

export function executeCanaryEffect(state: GameState, target: Position, card?: import('../types').Card): GameState {
  if (!target) return state
  
  let currentState = state
  let mineFound = false
  
  // Get tiles to check based on enhanced status
  const tilesToCheck: Position[] = []
  
  if (card?.enhanced) {
    // Enhanced: 3x3 area
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        tilesToCheck.push({
          x: target.x + dx,
          y: target.y + dy
        })
      }
    }
  } else {
    // Basic: star pattern (Manhattan distance 1)
    tilesToCheck.push(target) // Center
    tilesToCheck.push({ x: target.x, y: target.y - 1 }) // North
    tilesToCheck.push({ x: target.x, y: target.y + 1 }) // South  
    tilesToCheck.push({ x: target.x - 1, y: target.y }) // West
    tilesToCheck.push({ x: target.x + 1, y: target.y }) // East
  }
  
  // Check each tile and add appropriate annotation
  for (const pos of tilesToCheck) {
    const key = positionToKey(pos)
    const tile = currentState.board.tiles.get(key)
    
    // Only process unrevealed tiles that exist on the board
    if (tile && !tile.revealed && tile.owner !== 'empty') {
      if (tile.owner === 'mine') {
        // This is a mine - exclude everything else (only mine possible)
        const mineOnlySubset = new Set<'player' | 'enemy' | 'neutral' | 'mine'>(['mine'])
        currentState = addOwnerSubsetAnnotation(currentState, pos, mineOnlySubset)
        mineFound = true
      } else {
        // This is not a mine - exclude mine from possibilities  
        const noMineSubset = new Set<'player' | 'enemy' | 'neutral' | 'mine'>(['player', 'enemy', 'neutral'])
        currentState = addOwnerSubsetAnnotation(currentState, pos, noMineSubset)
      }
    }
  }
  
  // If any mine was found, mark card to exhaust
  if (mineFound) {
    currentState = {
      ...currentState,
      shouldExhaustLastCard: true
    }
  }
  
  return currentState
}