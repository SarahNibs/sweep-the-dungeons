import { GameState, CardEffect, Position, Tile, TileAnnotation, ClueResult } from '../types'
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

export function addTileAnnotation(state: GameState, position: Position, annotation: TileAnnotation): GameState {
  const key = positionToKey(position)
  const tile = state.board.tiles.get(key)
  
  if (!tile) return state
  
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
  const annotation: TileAnnotation = {
    type: isSafe ? 'safe' : 'unsafe'
  }
  
  return addTileAnnotation(state, target, annotation)
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
      case 'assassin': return 1
      default: return 0
    }
  }
  
  const safety1 = getSafety(tile1)
  const safety2 = getSafety(tile2)
  
  const saferPos = safety1 >= safety2 ? pos1 : pos2
  
  // Reveal the safer tile using the proper reveal function
  const newBoard = revealTile(state.board, saferPos, 'player')
  
  return {
    ...state,
    board: newBoard
  }
}

export function executeReportEffect(state: GameState): GameState {
  const enemyTiles = getUnrevealedTilesByOwner(state, 'enemy')
  
  if (enemyTiles.length === 0) return state
  
  // Pick a random enemy tile
  const randomIndex = Math.floor(Math.random() * enemyTiles.length)
  const targetTile = enemyTiles[randomIndex]
  
  const annotation: TileAnnotation = { type: 'enemy' }
  return addTileAnnotation(state, targetTile.position, annotation)
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
  let newState = { ...state, clueCounter: currentClueOrder }
  
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
      clueOrder: currentClueOrder
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