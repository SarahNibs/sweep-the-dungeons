import { GameState, Position, Tile, ClueResult } from '../types'

export interface ClueParams {
  cardType: 'solid_clue' | 'stretch_clue' | 'enemy_clue'
  clueOrder: number
  clueRowPosition: number
}


export interface ClueGenerationResult {
  clueResults: ClueResult[]
  remainingTiles: Tile[]
  clueResultPairs?: { clueResult: ClueResult, targetPosition: Position }[]
}

export function selectTilesForClue(
  availableTiles: Tile[], 
  count: number
): Tile[] {
  if (availableTiles.length <= count) {
    return [...availableTiles]
  }
  
  const shuffled = [...availableTiles]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  
  return shuffled.slice(0, count)
}



export function calculateStrengthForTile(
  tile: Tile,
  bagDraws: Tile[]
): number {
  // Simple counting: how many times this tile was drawn from the bag
  return bagDraws.filter(drawnTile => 
    drawnTile.position.x === tile.position.x && drawnTile.position.y === tile.position.y
  ).length
}

export function generateClueFromBag(
  selectedTiles: Tile[],
  guaranteedTiles: Tile[],
  bag: Tile[],
  totalDraws: number,
  params: ClueParams,
  skipGuaranteedTiles: boolean = false
): ClueGenerationResult {
  
  const drawnTiles: Tile[] = []
  
  // Add guaranteed draws first (unless Ramble is active)
  if (!skipGuaranteedTiles) {
    drawnTiles.push(...guaranteedTiles)
  }
  
  // Draw remaining tiles randomly from bag
  const bagCopy = [...bag]
  const guaranteedCount = skipGuaranteedTiles ? 0 : guaranteedTiles.length
  const remainingDraws = totalDraws - guaranteedCount
  
  for (let i = 0; i < Math.min(remainingDraws, bagCopy.length); i++) {
    const randomIndex = Math.floor(Math.random() * bagCopy.length)
    const drawnTile = bagCopy[randomIndex]
    drawnTiles.push(drawnTile)
    bagCopy.splice(randomIndex, 1)
  }
  
  // Count pips per tile
  const pipCounts = new Map<string, number>()
  for (const drawnTile of drawnTiles) {
    const key = `${drawnTile.position.x},${drawnTile.position.y}`
    pipCounts.set(key, (pipCounts.get(key) || 0) + 1)
  }
  
  
  // Create clue results with tile-specific information
  const clueResults: ClueResult[] = []
  const affectedPositions: Position[] = []
  
  // Collect all affected positions first
  for (const [posKey, pipCount] of pipCounts) {
    if (pipCount > 0) {
      const [x, y] = posKey.split(',').map(Number)
      affectedPositions.push({ x, y })
    }
  }
  
  const clueId = crypto.randomUUID()
  
  // Create ClueResults - return each as a {clueResult, targetPosition} pair
  const clueResultPairs: { clueResult: ClueResult, targetPosition: Position }[] = []
  
  for (const [posKey, pipCount] of pipCounts) {
    if (pipCount > 0) {
      const [x, y] = posKey.split(',').map(Number)
      const targetPosition = { x, y }
      
      const clueResult: ClueResult = {
        id: clueId,
        cardType: params.cardType,
        strengthForThisTile: pipCount,
        allAffectedTiles: [...affectedPositions],
        clueOrder: params.clueOrder,
        clueRowPosition: params.clueRowPosition
      }
      
      clueResults.push(clueResult)
      clueResultPairs.push({ clueResult, targetPosition })
    }
  }
  
  
  return {
    clueResults,
    remainingTiles: selectedTiles,
    clueResultPairs  // Include the position mapping
  }
}

export function generatePlayerSolidClue(
  state: GameState,
  clueOrder: number,
  clueRowPosition: number
): ClueGenerationResult {
  const unrevealedTiles = Array.from(state.board.tiles.values())
    .filter(tile => !tile.revealed)
  const playerTiles = unrevealedTiles.filter(tile => tile.owner === 'player')
  
  // Choose 2 player tiles
  const chosenPlayerTiles = selectTilesForClue(playerTiles, 2)
  
  // Choose 6 other random tiles
  const remainingTiles = unrevealedTiles.filter(tile => 
    !chosenPlayerTiles.some(chosen => 
      chosen.position.x === tile.position.x && chosen.position.y === tile.position.y
    )
  )
  const chosenRandomTiles = selectTilesForClue(remainingTiles, 6)
  
  // Create bag: 12 copies of each player tile + 4 copies of each random tile
  const bag: Tile[] = []
  for (const tile of chosenPlayerTiles) {
    for (let i = 0; i < 12; i++) {
      bag.push(tile)
    }
  }
  for (const tile of chosenRandomTiles) {
    for (let i = 0; i < 4; i++) {
      bag.push(tile)
    }
  }
  
  // Guarantee first 2 draws are from chosen player tiles
  const guaranteedTiles = [...chosenPlayerTiles]
  
  const params: ClueParams = {
    cardType: 'solid_clue',
    clueOrder,
    clueRowPosition
  }
  
  return generateClueFromBag([...chosenPlayerTiles, ...chosenRandomTiles], guaranteedTiles, bag, 10, params)
}

export function generatePlayerStretchClue(
  state: GameState,
  clueOrder: number,
  clueRowPosition: number
): ClueGenerationResult {
  const unrevealedTiles = Array.from(state.board.tiles.values())
    .filter(tile => !tile.revealed)
  const playerTiles = unrevealedTiles.filter(tile => tile.owner === 'player')
  
  // Choose 5 player tiles
  const chosenPlayerTiles = selectTilesForClue(playerTiles, 5)
  
  // Choose 14 other random tiles
  const remainingTiles = unrevealedTiles.filter(tile => 
    !chosenPlayerTiles.some(chosen => 
      chosen.position.x === tile.position.x && chosen.position.y === tile.position.y
    )
  )
  const chosenRandomTiles = selectTilesForClue(remainingTiles, 14)
  
  // Create bag: 4 copies of each player tile + 2 copies of each random tile
  const bag: Tile[] = []
  for (const tile of chosenPlayerTiles) {
    for (let i = 0; i < 4; i++) {
      bag.push(tile)
    }
  }
  for (const tile of chosenRandomTiles) {
    for (let i = 0; i < 2; i++) {
      bag.push(tile)
    }
  }
  
  // Guarantee first 3 draws are from chosen player tiles (not all 5)
  const guaranteedTiles = chosenPlayerTiles.slice(0, 3)
  
  const params: ClueParams = {
    cardType: 'stretch_clue',
    clueOrder,
    clueRowPosition
  }
  
  return generateClueFromBag([...chosenPlayerTiles, ...chosenRandomTiles], guaranteedTiles, bag, 10, params)
}

export function generateEnemyClueWithSharedSetup(
  chosenEnemyTiles: Tile[],
  chosenRandomTiles: Tile[],
  clueOrder: number,
  clueRowPosition: number
): ClueGenerationResult {
  // Create bag: 12 copies of each enemy tile + 4 copies of each random tile
  const bag: Tile[] = []
  for (const tile of chosenEnemyTiles) {
    for (let i = 0; i < 12; i++) {
      bag.push(tile)
    }
  }
  for (const tile of chosenRandomTiles) {
    for (let i = 0; i < 4; i++) {
      bag.push(tile)
    }
  }
  
  // Guarantee first 2 draws are from chosen enemy tiles
  const guaranteedTiles = [...chosenEnemyTiles]
  
  const params: ClueParams = {
    cardType: 'enemy_clue',
    clueOrder,
    clueRowPosition
  }
  
  return generateClueFromBag([...chosenEnemyTiles, ...chosenRandomTiles], guaranteedTiles, bag, 10, params)
}

export function prepareEnemyClueSetup(state: GameState): {
  chosenEnemyTiles: Tile[]
  chosenRandomTiles: Tile[]
} {
  const unrevealedTiles = Array.from(state.board.tiles.values())
    .filter(tile => !tile.revealed)
  const enemyTiles = unrevealedTiles.filter(tile => tile.owner === 'enemy')
  
  // Choose 2 enemy tiles
  const chosenEnemyTiles = selectTilesForClue(enemyTiles, 2)
  
  // Choose 6 other random tiles
  const remainingTiles = unrevealedTiles.filter(tile => 
    !chosenEnemyTiles.some(chosen => 
      chosen.position.x === tile.position.x && chosen.position.y === tile.position.y
    )
  )
  const chosenRandomTiles = selectTilesForClue(remainingTiles, 6)
  
  return { chosenEnemyTiles, chosenRandomTiles }
}