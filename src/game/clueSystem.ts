import { GameState, Position, Tile, ClueResult, Board } from '../types'
import { getNeighbors, positionToKey } from './boardSystem'

export interface ClueParams {
  cardType: 'imperious_instructions' | 'vague_instructions' | 'rival_clue' | 'sarcastic_instructions'
  enhanced: boolean
  clueOrder: number
  clueRowPosition: number
  isAntiClue?: boolean // For sarcastic orders red dots
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
  console.log(`[CLUE-GEN] selectTilesForClue: ${availableTiles.length} available tiles, selecting ${count}`)

  if (availableTiles.length <= count) {
    console.log(`[CLUE-GEN] Returning all ${availableTiles.length} tiles (not enough to shuffle)`)
    return [...availableTiles]
  }

  const shuffled = [...availableTiles]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  const selected = shuffled.slice(0, count)
  console.log(`[CLUE-GEN] Selected ${selected.length} tiles:`, selected.map(t => `(${t.position.x},${t.position.y})`))

  return selected
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

/**
 * Get positions that should be excluded from clues based on revealed adjacency information.
 * When a revealed tile shows adjacencyCount=0, all adjacent tiles are definitively NOT
 * of the revealer's type.
 */
export function getExcludedPositionsByAdjacency(
  board: Board,
  targetType: 'player' | 'rival'
): Set<string> {
  const excludedKeys = new Set<string>()

  console.log(`[CLUE-GEN] getExcludedPositionsByAdjacency for targetType=${targetType}`)

  // Iterate through all revealed tiles
  for (const tile of board.tiles.values()) {
    if (!tile.revealed || tile.adjacencyCount !== 0) {
      continue
    }

    // If this tile shows 0 adjacent of the revealer's type, all neighbors are NOT that type
    const shouldExclude =
      (targetType === 'player' && tile.revealedBy === 'player') ||
      (targetType === 'rival' && tile.revealedBy === 'rival')

    if (shouldExclude) {
      const neighbors = getNeighbors(board, tile.position)
      console.log(`[CLUE-GEN] Tile (${tile.position.x},${tile.position.y}) has adjacency=0, excluding ${neighbors.length} neighbors from ${targetType} clues`)
      for (const neighborPos of neighbors) {
        excludedKeys.add(positionToKey(neighborPos))
      }
    }
  }

  console.log(`[CLUE-GEN] Total excluded positions: ${excludedKeys.size}`)
  return excludedKeys
}

function buildBagWithAdjustments(
  tiles: Tile[],
  copiesPerTile: number,
  targetOwner: 'player' | 'rival',
  targetTiles: Tile[]
): Tile[] {
  console.log(`[CLUE-GEN] buildBagWithAdjustments: ${tiles.length} tiles, ${copiesPerTile} copies each, targetOwner=${targetOwner}, ${targetTiles.length} target tiles`)

  const bag: Tile[] = []
  const targetTilePositions = new Set(
    targetTiles.map(tile => `${tile.position.x},${tile.position.y}`)
  )

  const bagComposition: { [key: string]: number } = {}

  for (const tile of tiles) {
    let actualCopies = copiesPerTile
    const tileKey = `${tile.position.x},${tile.position.y}`
    const isTargetTile = targetTilePositions.has(tileKey)

    if (!isTargetTile) {
      // This is a spoiler tile - apply spoiler rules
      if (tile.owner === 'mine') {
        actualCopies -= 1 // Mines get -1 instance (existing rule)
      }
      if (tile.owner === targetOwner) {
        actualCopies -= 1 // Spoiler tiles with same owner as target get -1 instance (new rule)
      }
    }

    // Ensure minimum of 0 copies
    actualCopies = Math.max(0, actualCopies)

    for (let i = 0; i < actualCopies; i++) {
      bag.push(tile)
    }

    if (actualCopies > 0) {
      bagComposition[`(${tile.position.x},${tile.position.y})[${tile.owner}]`] = actualCopies
    }
  }

  console.log(`[CLUE-GEN] Bag composition (${bag.length} total):`, bagComposition)
  return bag
}

export function generateClueFromBag(
  selectedTiles: Tile[],
  guaranteedTiles: Tile[],
  bag: Tile[],
  totalDraws: number,
  params: ClueParams
): ClueGenerationResult {

  console.log(`[CLUE-GEN] generateClueFromBag: ${totalDraws} draws from bag of ${bag.length}, ${guaranteedTiles.length} guaranteed, cardType=${params.cardType}`)

  const drawnTiles: Tile[] = []

  // Add guaranteed draws first
  drawnTiles.push(...guaranteedTiles)
  if (guaranteedTiles.length > 0) {
    console.log(`[CLUE-GEN] Guaranteed tiles:`, guaranteedTiles.map(t => `(${t.position.x},${t.position.y})`))
  }

  // Create bag copy and remove ONE instance of each guaranteed tile
  const bagCopy = [...bag]
  for (const guaranteedTile of guaranteedTiles) {
    const indexToRemove = bagCopy.indexOf(guaranteedTile)
    if (indexToRemove !== -1) {
      bagCopy.splice(indexToRemove, 1)
    }
  }

  const remainingDraws = totalDraws - guaranteedTiles.length

  for (let i = 0; i < Math.min(remainingDraws, bagCopy.length); i++) {
    const randomIndex = Math.floor(Math.random() * bagCopy.length)
    const drawnTile = bagCopy[randomIndex]
    drawnTiles.push(drawnTile)
    bagCopy.splice(randomIndex, 1)
  }

  console.log(`[CLUE-GEN] Drew ${drawnTiles.length} tiles total from bag`)

  // Count pips per tile
  const pipCounts = new Map<string, number>()
  for (const drawnTile of drawnTiles) {
    const key = `${drawnTile.position.x},${drawnTile.position.y}`
    pipCounts.set(key, (pipCounts.get(key) || 0) + 1)
  }

  console.log(`[CLUE-GEN] Pip distribution:`, Object.fromEntries(pipCounts))
  
  
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
        enhanced: params.enhanced,
        strengthForThisTile: pipCount,
        allAffectedTiles: [...affectedPositions],
        clueOrder: params.clueOrder,
        clueRowPosition: params.clueRowPosition,
        isAntiClue: params.isAntiClue
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

export function generatePlayerImperiousInstructions(
  state: GameState,
  clueOrder: number,
  clueRowPosition: number,
  enhanced: boolean = false
): ClueGenerationResult {
  console.log(`\n[CLUE-GEN] ========== generatePlayerImperiousInstructions (${enhanced ? 'enhanced' : 'basic'}) ==========`)

  // Get positions to exclude based on adjacency info
  const excludedPositions = getExcludedPositionsByAdjacency(state.board, 'player')

  const unrevealedTiles = Array.from(state.board.tiles.values())
    .filter(tile => !tile.revealed && tile.owner !== 'empty')
    .filter(tile => !excludedPositions.has(positionToKey(tile.position)))
  const playerTiles = unrevealedTiles.filter(tile => tile.owner === 'player')

  console.log(`[CLUE-GEN] Available tiles: ${unrevealedTiles.length} total, ${playerTiles.length} player tiles`)

  // Choose 2 player tiles
  const chosenPlayerTiles = selectTilesForClue(playerTiles, 2)

  // Choose 6 other random tiles
  // For enhanced Imperious, exclude mines from "other random tiles"
  const remainingTiles = unrevealedTiles.filter(tile => {
    // Exclude already chosen player tiles
    const isChosenPlayer = chosenPlayerTiles.some(chosen =>
      chosen.position.x === tile.position.x && chosen.position.y === tile.position.y
    )
    if (isChosenPlayer) return false

    // For enhanced, also exclude mines
    if (enhanced && tile.owner === 'mine') return false

    return true
  })
  const chosenRandomTiles = selectTilesForClue(remainingTiles, 6)

  console.log(`[CLUE-GEN] Chosen 2 player tiles:`, chosenPlayerTiles.map(t => `(${t.position.x},${t.position.y})`))
  console.log(`[CLUE-GEN] Chosen 6 random tiles:`, chosenRandomTiles.map(t => `(${t.position.x},${t.position.y})[${t.owner}]`))

  // Create bag: 12 copies of each player tile + 4 copies of each random tile (with spoiler adjustments)
  const bag: Tile[] = [
    ...buildBagWithAdjustments(chosenPlayerTiles, 12, 'player', chosenPlayerTiles),
    ...buildBagWithAdjustments(chosenRandomTiles, 4, 'player', chosenPlayerTiles)
  ]

  // Guarantee first 2 draws are from chosen player tiles
  const guaranteedTiles = [...chosenPlayerTiles]

  const params: ClueParams = {
    cardType: 'imperious_instructions',
    enhanced,
    clueOrder,
    clueRowPosition
  }

  return generateClueFromBag([...chosenPlayerTiles, ...chosenRandomTiles], guaranteedTiles, bag, 10, params)
}

export function generatePlayerVagueInstructions(
  state: GameState,
  clueOrder: number,
  clueRowPosition: number,
  enhanced: boolean = false
): ClueGenerationResult {
  console.log(`\n[CLUE-GEN] ========== generatePlayerVagueInstructions (${enhanced ? 'enhanced' : 'basic'}) ==========`)

  // Get positions to exclude based on adjacency info
  const excludedPositions = getExcludedPositionsByAdjacency(state.board, 'player')

  const unrevealedTiles = Array.from(state.board.tiles.values())
    .filter(tile => !tile.revealed && tile.owner !== 'empty')
    .filter(tile => !excludedPositions.has(positionToKey(tile.position)))
  const playerTiles = unrevealedTiles.filter(tile => tile.owner === 'player')

  console.log(`[CLUE-GEN] Available tiles: ${unrevealedTiles.length} total, ${playerTiles.length} player tiles`)

  // Choose 5 player tiles
  const chosenPlayerTiles = selectTilesForClue(playerTiles, 5)

  // Choose 14 other random tiles
  const remainingTiles = unrevealedTiles.filter(tile =>
    !chosenPlayerTiles.some(chosen =>
      chosen.position.x === tile.position.x && chosen.position.y === tile.position.y
    )
  )
  const chosenRandomTiles = selectTilesForClue(remainingTiles, 14)

  console.log(`[CLUE-GEN] Chosen 5 player tiles:`, chosenPlayerTiles.map(t => `(${t.position.x},${t.position.y})`))
  console.log(`[CLUE-GEN] Chosen 14 random tiles:`, chosenRandomTiles.map(t => `(${t.position.x},${t.position.y})[${t.owner}]`))

  // Create bag: 4 copies of each player tile + 2 copies of each random tile (with spoiler adjustments)
  const bag: Tile[] = [
    ...buildBagWithAdjustments(chosenPlayerTiles, 4, 'player', chosenPlayerTiles),
    ...buildBagWithAdjustments(chosenRandomTiles, 2, 'player', chosenPlayerTiles)
  ]

  // Guarantee first 3 draws are from chosen player tiles (5 if enhanced)
  const guaranteedTiles = chosenPlayerTiles.slice(0, enhanced ? 5 : 3)
  console.log(`[CLUE-GEN] Guaranteed tiles: ${guaranteedTiles.length} (${enhanced ? 'enhanced: all 5' : 'basic: first 3'})`)
  
  const params: ClueParams = {
    cardType: 'vague_instructions',
    enhanced,
    clueOrder,
    clueRowPosition
  }

  return generateClueFromBag([...chosenPlayerTiles, ...chosenRandomTiles], guaranteedTiles, bag, 10, params)
}

export function generateRivalClueWithSharedSetup(
  chosenRivalTiles: Tile[],
  chosenRandomTiles: Tile[],
  clueOrder: number,
  clueRowPosition: number,
  enhanced: boolean = false
): ClueGenerationResult {
  // Create bag: 12 copies of each rival tile + 4 copies of each random tile (with spoiler adjustments)
  const bag: Tile[] = [
    ...buildBagWithAdjustments(chosenRivalTiles, 12, 'rival', chosenRivalTiles),
    ...buildBagWithAdjustments(chosenRandomTiles, 4, 'rival', chosenRivalTiles)
  ]
  
  // DEBUG: Log clue generation details
  
  // Guarantee first 2 draws are from chosen rival tiles
  const guaranteedTiles = [...chosenRivalTiles]
  
  const params: ClueParams = {
    cardType: 'rival_clue',
    enhanced,
    clueOrder,
    clueRowPosition
  }

  return generateClueFromBag([...chosenRivalTiles, ...chosenRandomTiles], guaranteedTiles, bag, 10, params)
}

export function prepareRivalClueSetup(state: GameState): {
  chosenRivalTiles: Tile[]
  chosenRandomTiles: Tile[]
} {
  console.log(`\n[RIVAL-CLUE] ========== prepareRivalClueSetup ==========`)

  // Get positions to exclude based on adjacency info
  const excludedPositions = getExcludedPositionsByAdjacency(state.board, 'rival')

  const unrevealedTiles = Array.from(state.board.tiles.values())
    .filter(tile => !tile.revealed && tile.owner !== 'empty')
    .filter(tile => !excludedPositions.has(positionToKey(tile.position)))
  const rivalTiles = unrevealedTiles.filter(tile => tile.owner === 'rival')

  console.log(`[RIVAL-CLUE] Available tiles: ${unrevealedTiles.length} total, ${rivalTiles.length} rival tiles`)

  // Choose 2 rival tiles
  const chosenRivalTiles = selectTilesForClue(rivalTiles, 2)

  // Choose 6 other random tiles
  const remainingTiles = unrevealedTiles.filter(tile =>
    !chosenRivalTiles.some(chosen =>
      chosen.position.x === tile.position.x && chosen.position.y === tile.position.y
    )
  )
  const chosenRandomTiles = selectTilesForClue(remainingTiles, 6)

  console.log(`[RIVAL-CLUE] Chosen 2 rival tiles:`, chosenRivalTiles.map(t => `(${t.position.x},${t.position.y})`))
  console.log(`[RIVAL-CLUE] Chosen 6 random tiles:`, chosenRandomTiles.map(t => `(${t.position.x},${t.position.y})[${t.owner}]`))

  return { chosenRivalTiles, chosenRandomTiles }
}