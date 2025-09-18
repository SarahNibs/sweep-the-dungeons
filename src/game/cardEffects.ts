import { GameState, CardEffect, Position, Tile, TileAnnotation, ClueResult, GameStatusInfo } from '../types'
import { positionToKey, getTile, revealTile, clearSpecialTileState } from './boardSystem'
import { generatePlayerSolidClue, generatePlayerStretchClue } from './clueSystem'

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

export function executeScoutEffect(state: GameState, target: Position): GameState {
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
  }
  
  const isSafe = tile.owner === 'player' || tile.owner === 'neutral'
  const ownerSubset = isSafe 
    ? new Set<'player' | 'enemy' | 'neutral' | 'mine'>(['player', 'neutral'])
    : new Set<'player' | 'enemy' | 'neutral' | 'mine'>(['enemy', 'mine'])
  
  return addOwnerSubsetAnnotation(newState, target, ownerSubset)
}

export function executeQuantumEffect(state: GameState, targets: [Position, Position]): GameState {
  const [pos1, pos2] = targets
  const tile1 = getTile(state.board, pos1)
  const tile2 = getTile(state.board, pos2)
  
  if (!tile1 || !tile2 || tile1.revealed || tile2.revealed) return state
  
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
  
  const safety1 = getSafety(tile1)
  const safety2 = getSafety(tile2)
  
  let saferPos: Position
  
  if (safety1 === safety2) {
    // Same safety level (same owner), choose randomly
    saferPos = Math.random() < 0.5 ? pos1 : pos2
  } else {
    // Different safety levels, choose safer one
    saferPos = safety1 > safety2 ? pos1 : pos2
  }
  
  // Reveal the chosen tile using the proper reveal function
  const newBoard = revealTile(state.board, saferPos, 'player')
  
  // Use proper game status checking like regular reveals
  const gameStatus = checkGameStatus({
    ...state,
    board: newBoard
  })
  
  // Add annotation to the non-revealed tile
  const nonRevealedPos = saferPos === pos1 ? pos2 : pos1
  const revealedTile = saferPos === pos1 ? tile1 : tile2
  
  // Quantum reveals the safer tile, so unrevealed tile is AT MOST as safe as revealed tile
  const revealedSafety = getSafety(revealedTile)
  const possibleOwners = new Set<'player' | 'enemy' | 'neutral' | 'mine'>()
  
  // Add all owner types that are at most as safe as the revealed tile
  if (revealedSafety >= 1) possibleOwners.add('mine')   // mine = 1
  if (revealedSafety >= 2) possibleOwners.add('enemy')      // enemy = 2  
  if (revealedSafety >= 3) possibleOwners.add('neutral')    // neutral = 3
  if (revealedSafety >= 4) possibleOwners.add('player')     // player = 4
  
  const stateWithAnnotation = addOwnerSubsetAnnotation({
    ...state,
    board: newBoard,
    gameStatus
  }, nonRevealedPos, possibleOwners)
  
  return stateWithAnnotation
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





export function checkGameStatus(state: GameState): GameStatusInfo {
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
      return executeScoutEffect(state, effect.target)
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
      return executeBrushEffect(state, effect.target)
    case 'ramble':
      const maxBoost = card?.enhanced ? 4 : 2
      return {
        ...state,
        rambleActive: true,
        ramblePriorityBoost: Math.random() * maxBoost // Enhanced: 0-4, Normal: 0-2
      }
    case 'sweep':
      return executeSweepEffect(state, effect.target, card)
    default:
      return state
  }
}

export function requiresTargeting(cardName: string): boolean {
  return cardName === 'Spritz' || cardName === 'Easiest' || cardName === 'Brush' || cardName === 'Sweep'
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

export function executeBrushEffect(state: GameState, target: Position): GameState {
  // Get 3x3 area around target position
  const centerX = target.x
  const centerY = target.y
  
  const newTiles = new Map(state.board.tiles)
  
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
  
  return {
    ...state,
    board: {
      ...state.board,
      tiles: newTiles
    }
  }
}

export function executeSweepEffect(state: GameState, target: Position, card?: import('../types').Card): GameState {
  const newTiles = new Map(state.board.tiles)
  
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
      }
    }
  }
  
  return {
    ...state,
    board: {
      ...state.board,
      tiles: newTiles
    }
  }
}