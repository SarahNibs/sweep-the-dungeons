import { GameState, CardEffect, Position, Tile, TileAnnotation, ClueResult, GameStatusInfo } from '../types'
import { positionToKey, getTile, revealTile } from './boardSystem'

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
  
  if (!tile) return state
  
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
  
  const isSafe = tile.owner === 'player' || tile.owner === 'neutral'
  const ownerSubset = isSafe 
    ? new Set<'player' | 'enemy' | 'neutral' | 'mine'>(['player', 'neutral'])
    : new Set<'player' | 'enemy' | 'neutral' | 'mine'>(['enemy', 'mine'])
  
  return addOwnerSubsetAnnotation(state, target, ownerSubset)
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
    board: newBoard
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

interface ClueParameters {
  cardType: 'solid_clue' | 'stretch_clue'
  chosenPlayerTiles: number          // How many player tiles to choose initially
  guaranteedPlayerTiles: number      // How many of the chosen player tiles get guaranteed draws
  randomTilesForBag: number
  totalPips: number
  playerTileBagCopies: number
  randomTileBagCopies: number
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function executeParameterizedClueEffect(state: GameState, params: ClueParameters): GameState {
  const unrevealedTiles = getUnrevealedTiles(state)
  const playerTiles = unrevealedTiles.filter(tile => tile.owner === 'player')
  
  if (unrevealedTiles.length === 0) return state
  
  // Step 1: Randomly choose player tiles (fix slice bug!)
  const shuffledPlayerTiles = shuffleArray(playerTiles)
  const chosenPlayerTiles = shuffledPlayerTiles.slice(0, params.chosenPlayerTiles)
  
  // Step 2: Randomly choose remaining tiles for bag (fix slice bug!)
  const remainingTiles = unrevealedTiles.filter(tile => 
    !chosenPlayerTiles.some(chosen => 
      chosen.position.x === tile.position.x && chosen.position.y === tile.position.y
    )
  )
  const shuffledRemainingTiles = shuffleArray(remainingTiles)
  const chosenRandomTiles = shuffledRemainingTiles.slice(0, params.randomTilesForBag)
  
  const picked: Tile[] = []
  
  // Step 3: Guarantee draws from first N chosen player tiles
  const guaranteedDraws = Math.min(params.guaranteedPlayerTiles, chosenPlayerTiles.length)
  for (let i = 0; i < guaranteedDraws; i++) {
    picked.push(chosenPlayerTiles[i])
  }
  
  // Step 4: Create the bag with chosen tiles
  const bag: Tile[] = []
  
  // Add chosen player tiles to bag
  for (const tile of chosenPlayerTiles) {
    const copies = chosenPlayerTiles.length < params.chosenPlayerTiles ? 
      Math.floor((params.playerTileBagCopies * params.chosenPlayerTiles) / chosenPlayerTiles.length) : 
      params.playerTileBagCopies
    for (let j = 0; j < copies; j++) {
      bag.push(tile)
    }
  }
  
  // Add random tiles to bag
  for (const tile of chosenRandomTiles) {
    const copies = chosenRandomTiles.length < params.randomTilesForBag ?
      Math.floor((params.randomTileBagCopies * params.randomTilesForBag) / chosenRandomTiles.length) :
      params.randomTileBagCopies
    for (let j = 0; j < copies; j++) {
      bag.push(tile)
    }
  }
  
  // Step 5: Draw remaining items randomly from bag
  const bagCopy = [...bag]
  const remainingDraws = params.totalPips - guaranteedDraws
  
  for (let i = 0; i < Math.min(remainingDraws, bagCopy.length); i++) {
    const randomIndex = Math.floor(Math.random() * bagCopy.length)
    picked.push(bagCopy[randomIndex])
    bagCopy.splice(randomIndex, 1)
  }
  
  // Count occurrences and create clue result
  const counts = new Map<string, number>()
  for (const tile of picked) {
    const key = positionToKey(tile.position)
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  
  const affectedTiles: Position[] = []
  for (const [posKey, count] of counts) {
    if (count > 0) {
      affectedTiles.push({ 
        x: parseInt(posKey.split(',')[0]), 
        y: parseInt(posKey.split(',')[1]) 
      })
    }
  }
  
  // Create clue results for each affected tile
  const clueId = crypto.randomUUID()
  const currentClueOrder = state.clueCounter + 1
  const currentPlayerClueRow = state.playerClueCounter + 1
  let newState = { 
    ...state, 
    clueCounter: currentClueOrder,
    playerClueCounter: currentPlayerClueRow
  }
  
  for (const [posKey, count] of counts) {
    const position = { 
      x: parseInt(posKey.split(',')[0]), 
      y: parseInt(posKey.split(',')[1]) 
    }
    const tileClueResult: ClueResult = {
      id: clueId,
      cardType: params.cardType,
      strengthForThisTile: count,
      allAffectedTiles: affectedTiles,
      clueOrder: currentClueOrder,
      clueRowPosition: currentPlayerClueRow
    }
    newState = addClueResult(newState, position, tileClueResult)
  }
  
  return newState
}

export function executeSolidClueEffect(state: GameState): GameState {
  return executeParameterizedClueEffect(state, {
    cardType: 'solid_clue',
    chosenPlayerTiles: 2,           // Choose 2 player tiles
    guaranteedPlayerTiles: 2,       // Guarantee all 2 chosen tiles
    randomTilesForBag: 6,
    totalPips: 10,
    playerTileBagCopies: 12,
    randomTileBagCopies: 4
  })
}

export function executeStretchClueEffect(state: GameState): GameState {
  return executeParameterizedClueEffect(state, {
    cardType: 'stretch_clue',
    chosenPlayerTiles: 5,           // Choose 5 player tiles
    guaranteedPlayerTiles: 3,       // Guarantee only 3 of the 5 chosen tiles
    randomTilesForBag: 14,
    totalPips: 10,
    playerTileBagCopies: 4,
    randomTileBagCopies: 2
  })
}

export function executeEnemyClueEffect(state: GameState): GameState {
  const unrevealedTiles = getUnrevealedTiles(state)
  const enemyTiles = unrevealedTiles.filter(tile => tile.owner === 'enemy')
  
  if (unrevealedTiles.length === 0) return state
  
  // Enemy clue parameters (similar to Solid Clue but for enemy tiles)
  const chosenEnemyTiles = 2
  const guaranteedEnemyTiles = 2
  const randomTilesForBag = 6
  const totalPips = 10
  const enemyTileBagCopies = 12
  const randomTileBagCopies = 4
  
  // Step 1: Randomly choose enemy tiles
  const shuffledEnemyTiles = shuffleArray(enemyTiles)
  const chosenEnemyTilesArray = shuffledEnemyTiles.slice(0, chosenEnemyTiles)
  
  // Step 2: Randomly choose remaining tiles for bag
  const remainingTiles = unrevealedTiles.filter(tile => 
    !chosenEnemyTilesArray.some(chosen => 
      chosen.position.x === tile.position.x && chosen.position.y === tile.position.y
    )
  )
  const shuffledRemainingTiles = shuffleArray(remainingTiles)
  const chosenRandomTiles = shuffledRemainingTiles.slice(0, randomTilesForBag)
  
  const picked: Tile[] = []
  
  // Step 3: Guarantee draws from chosen enemy tiles
  const guaranteedDraws = Math.min(guaranteedEnemyTiles, chosenEnemyTilesArray.length)
  for (let i = 0; i < guaranteedDraws; i++) {
    picked.push(chosenEnemyTilesArray[i])
  }
  
  // Step 4: Create the bag with chosen tiles
  const bag: Tile[] = []
  
  // Add chosen enemy tiles to bag
  for (const tile of chosenEnemyTilesArray) {
    const copies = chosenEnemyTilesArray.length < chosenEnemyTiles ? 
      Math.floor((enemyTileBagCopies * chosenEnemyTiles) / chosenEnemyTilesArray.length) : 
      enemyTileBagCopies
    for (let j = 0; j < copies; j++) {
      bag.push(tile)
    }
  }
  
  // Add random tiles to bag
  for (const tile of chosenRandomTiles) {
    const copies = chosenRandomTiles.length < randomTilesForBag ?
      Math.floor((randomTileBagCopies * randomTilesForBag) / chosenRandomTiles.length) :
      randomTileBagCopies
    for (let j = 0; j < copies; j++) {
      bag.push(tile)
    }
  }
  
  // Step 5: Draw remaining items randomly from bag
  const bagCopy = [...bag]
  const remainingDraws = totalPips - guaranteedDraws
  
  for (let i = 0; i < Math.min(remainingDraws, bagCopy.length); i++) {
    const randomIndex = Math.floor(Math.random() * bagCopy.length)
    picked.push(bagCopy[randomIndex])
    bagCopy.splice(randomIndex, 1)
  }
  
  // Count occurrences and create clue result
  const counts = new Map<string, number>()
  for (const tile of picked) {
    const key = positionToKey(tile.position)
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  
  const affectedTiles: Position[] = []
  for (const [posKey, count] of counts) {
    if (count > 0) {
      affectedTiles.push({ 
        x: parseInt(posKey.split(',')[0]), 
        y: parseInt(posKey.split(',')[1]) 
      })
    }
  }
  
  // Create enemy clue results for each affected tile
  const clueId = crypto.randomUUID()
  const currentClueOrder = state.clueCounter + 1
  const currentEnemyClueRow = state.enemyClueCounter + 1
  let newState = { 
    ...state, 
    clueCounter: currentClueOrder,
    enemyClueCounter: currentEnemyClueRow
  }
  
  for (const [posKey, count] of counts) {
    const position = { 
      x: parseInt(posKey.split(',')[0]), 
      y: parseInt(posKey.split(',')[1]) 
    }
    const tileClueResult: ClueResult = {
      id: clueId,
      cardType: 'enemy_clue',
      strengthForThisTile: count,
      allAffectedTiles: affectedTiles,
      clueOrder: currentClueOrder,
      clueRowPosition: currentEnemyClueRow
    }
    newState = addClueResult(newState, position, tileClueResult)
  }
  
  return newState
}

interface TilePriority {
  tile: Tile
  priorityScore: number
  enemyPips: number
  playerPips: number
  mostRecentEnemyClue: number
  totalEnemyPips: number
}

function calculateTilePriority(tile: Tile, _state: GameState): TilePriority {
  // Get all clue results for this tile
  const clueAnnotation = tile.annotations.find(a => a.type === 'clue_results')
  const clueResults = clueAnnotation?.clueResults || []
  
  // Calculate enemy and player pips
  let enemyPips = 0
  let playerPips = 0
  let mostRecentEnemyClue = 0
  let totalEnemyPips = 0
  
  for (const clue of clueResults) {
    if (clue.cardType === 'enemy_clue') {
      enemyPips += clue.strengthForThisTile
      totalEnemyPips += clue.strengthForThisTile
      mostRecentEnemyClue = Math.max(mostRecentEnemyClue, clue.strengthForThisTile)
    } else {
      playerPips += clue.strengthForThisTile
    }
  }
  
  // Priority calculation: enemy pips - max(0, player pips - 1)
  const priorityScore = enemyPips - Math.max(0, playerPips - 1)
  
  return {
    tile,
    priorityScore,
    enemyPips,
    playerPips,
    mostRecentEnemyClue,
    totalEnemyPips
  }
}

function sortTilesByPriority(tiles: Tile[], state: GameState): Tile[] {
  const tilePriorities = tiles.map(tile => calculateTilePriority(tile, state))
  
  // Sort by priority rules with tiebreaking
  tilePriorities.sort((a, b) => {
    // Primary: highest priority score
    if (a.priorityScore !== b.priorityScore) {
      return b.priorityScore - a.priorityScore
    }
    
    // Tiebreaker 1: most enemy pips from most recent enemy clue
    if (a.mostRecentEnemyClue !== b.mostRecentEnemyClue) {
      return b.mostRecentEnemyClue - a.mostRecentEnemyClue
    }
    
    // Tiebreaker 2: most enemy pips total
    if (a.totalEnemyPips !== b.totalEnemyPips) {
      return b.totalEnemyPips - a.totalEnemyPips
    }
    
    // Tiebreaker 3: random (maintain original order for equal elements)
    return Math.random() - 0.5
  })
  
  return tilePriorities.map(tp => tp.tile)
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

export function selectEnemyTilesToReveal(state: GameState): Tile[] {
  const unrevealedTiles = getUnrevealedTiles(state)
  
  // Sort tiles by priority
  const sortedTiles = sortTilesByPriority(unrevealedTiles, state)
  
  const tilesToReveal: Tile[] = []
  
  for (const tile of sortedTiles) {
    tilesToReveal.push(tile)
    
    // Stop if we reveal a tile that's not the enemy's
    if (tile.owner !== 'enemy') {
      break
    }
  }
  
  return tilesToReveal
}

export function executeCardEffect(state: GameState, effect: CardEffect): GameState {
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
    default:
      return state
  }
}

export function requiresTargeting(cardName: string): boolean {
  return cardName === 'Scout' || cardName === 'Quantum'
}

export function getTargetingInfo(cardName: string): { count: number; description: string } | null {
  switch (cardName) {
    case 'Scout':
      return { count: 1, description: 'Click on an unrevealed tile to scout' }
    case 'Quantum':
      return { count: 2, description: 'Click on two unrevealed tiles - the safer will be revealed' }
    default:
      return null
  }
}