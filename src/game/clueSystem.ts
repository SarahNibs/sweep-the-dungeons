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
      if (tile.owner === 'mine' && targetOwner === 'rival') {
        actualCopies -= 1 // Mines get an additional -1 instance for rival clues (new rule)
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
  if (state.debugFlags.debugLogging) {
    console.log(`\n[CLUE-GEN] ========== generatePlayerImperiousInstructions (${enhanced ? 'enhanced' : 'basic'}) ==========`)
  }

  // Get positions to exclude based on adjacency info
  const excludedPositions = getExcludedPositionsByAdjacency(state.board, 'player')

  const unrevealedTiles = Array.from(state.board.tiles.values())
    .filter(tile => !tile.revealed && tile.owner !== 'empty')
    .filter(tile => !excludedPositions.has(positionToKey(tile.position)))
  const playerTiles = unrevealedTiles.filter(tile => tile.owner === 'player')

  if (state.debugFlags.debugLogging) {
    console.log(`[CLUE-GEN] Available tiles: ${unrevealedTiles.length} total, ${playerTiles.length} player tiles`)
  }

  // Try up to 10 times to generate a valid clue
  const maxAttempts = 10
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
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

    if (state.debugFlags.debugLogging) {
      console.log(`[CLUE-GEN] Attempt ${attempt}: Chosen 2 player tiles:`, chosenPlayerTiles.map(t => `(${t.position.x},${t.position.y})`))
      console.log(`[CLUE-GEN] Attempt ${attempt}: Chosen 6 random tiles:`, chosenRandomTiles.map(t => `(${t.position.x},${t.position.y})[${t.owner}]`))
    }

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

    const result = generateClueFromBag([...chosenPlayerTiles, ...chosenRandomTiles], guaranteedTiles, bag, 10, params)

    // Validate: check if at least one player tile has the maximum pip count
    const chosenPlayerPositions = new Set(
      chosenPlayerTiles.map(t => `${t.position.x},${t.position.y}`)
    )

    // Find max pip count
    let maxPips = 0
    for (const pair of result.clueResultPairs || []) {
      maxPips = Math.max(maxPips, pair.clueResult.strengthForThisTile)
    }

    // Check if any player tile has max pips
    let hasPlayerWithMaxPips = false
    for (const pair of result.clueResultPairs || []) {
      const posKey = `${pair.targetPosition.x},${pair.targetPosition.y}`
      if (chosenPlayerPositions.has(posKey) && pair.clueResult.strengthForThisTile === maxPips) {
        hasPlayerWithMaxPips = true
        break
      }
    }

    if (hasPlayerWithMaxPips) {
      if (state.debugFlags.debugLogging) {
        console.log(`[CLUE-GEN] Valid clue generated on attempt ${attempt} (at least one player tile has max pips: ${maxPips})`)
      }
      return result
    } else {
      if (state.debugFlags.debugLogging) {
        console.log(`[CLUE-GEN] Attempt ${attempt} failed: no player tile has max pips (${maxPips}), regenerating...`)
      }
    }
  }

  // If we failed all attempts, log a warning and return the last result anyway
  console.warn(`[CLUE-GEN] Failed to generate valid Imperious Instructions after ${maxAttempts} attempts, using last result`)

  // Generate one final result to return
  const chosenPlayerTiles = selectTilesForClue(playerTiles, 2)
  const remainingTiles = unrevealedTiles.filter(tile => {
    const isChosenPlayer = chosenPlayerTiles.some(chosen =>
      chosen.position.x === tile.position.x && chosen.position.y === tile.position.y
    )
    if (isChosenPlayer) return false
    if (enhanced && tile.owner === 'mine') return false
    return true
  })
  const chosenRandomTiles = selectTilesForClue(remainingTiles, 6)
  const bag: Tile[] = [
    ...buildBagWithAdjustments(chosenPlayerTiles, 12, 'player', chosenPlayerTiles),
    ...buildBagWithAdjustments(chosenRandomTiles, 4, 'player', chosenPlayerTiles)
  ]
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
  if (state.debugFlags.debugLogging) {
    console.log(`\n[CLUE-GEN] ========== generatePlayerVagueInstructions (${enhanced ? 'enhanced' : 'basic'}) ==========`)
  }

  // Get positions to exclude based on adjacency info
  const excludedPositions = getExcludedPositionsByAdjacency(state.board, 'player')

  const unrevealedTiles = Array.from(state.board.tiles.values())
    .filter(tile => !tile.revealed && tile.owner !== 'empty')
    .filter(tile => !excludedPositions.has(positionToKey(tile.position)))
  const playerTiles = unrevealedTiles.filter(tile => tile.owner === 'player')

  if (state.debugFlags.debugLogging) {
    console.log(`[CLUE-GEN] Available tiles: ${unrevealedTiles.length} total, ${playerTiles.length} player tiles`)
  }

  // Choose 5 player tiles
  const chosenPlayerTiles = selectTilesForClue(playerTiles, 5)

  // Choose 14 other random tiles
  const remainingTiles = unrevealedTiles.filter(tile =>
    !chosenPlayerTiles.some(chosen =>
      chosen.position.x === tile.position.x && chosen.position.y === tile.position.y
    )
  )
  const chosenRandomTiles = selectTilesForClue(remainingTiles, 14)

  if (state.debugFlags.debugLogging) {
    console.log(`[CLUE-GEN] Chosen 5 player tiles:`, chosenPlayerTiles.map(t => `(${t.position.x},${t.position.y})`))
    console.log(`[CLUE-GEN] Chosen 14 random tiles:`, chosenRandomTiles.map(t => `(${t.position.x},${t.position.y})[${t.owner}]`))
  }

  // Create bag: 4 copies of each player tile + 2 copies of each random tile (with spoiler adjustments)
  const bag: Tile[] = [
    ...buildBagWithAdjustments(chosenPlayerTiles, 4, 'player', chosenPlayerTiles),
    ...buildBagWithAdjustments(chosenRandomTiles, 2, 'player', chosenPlayerTiles)
  ]

  // Guarantee first 3 draws are from chosen player tiles (5 if enhanced)
  const guaranteedTiles = chosenPlayerTiles.slice(0, enhanced ? 5 : 3)
  if (state.debugFlags.debugLogging) {
    console.log(`[CLUE-GEN] Guaranteed tiles: ${guaranteedTiles.length} (${enhanced ? 'enhanced: all 5' : 'basic: first 3'})`)
  }
  
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
  if (state.debugFlags.debugLogging) {
    console.log(`\n[RIVAL-CLUE] ========== prepareRivalClueSetup ==========`)
  }

  // Get positions to exclude based on adjacency info
  const excludedPositions = getExcludedPositionsByAdjacency(state.board, 'rival')

  const unrevealedTiles = Array.from(state.board.tiles.values())
    .filter(tile => !tile.revealed && tile.owner !== 'empty')
    .filter(tile => !excludedPositions.has(positionToKey(tile.position)))
  const rivalTiles = unrevealedTiles.filter(tile => tile.owner === 'rival')

  if (state.debugFlags.debugLogging) {
    console.log(`[RIVAL-CLUE] Available tiles: ${unrevealedTiles.length} total, ${rivalTiles.length} rival tiles`)
  }

  // Choose 2 rival tiles
  const chosenRivalTiles = selectTilesForClue(rivalTiles, 2)

  // Choose 6 other random tiles
  const remainingTiles = unrevealedTiles.filter(tile =>
    !chosenRivalTiles.some(chosen =>
      chosen.position.x === tile.position.x && chosen.position.y === tile.position.y
    )
  )
  const chosenRandomTiles = selectTilesForClue(remainingTiles, 6)

  if (state.debugFlags.debugLogging) {
    console.log(`[RIVAL-CLUE] Chosen 2 rival tiles:`, chosenRivalTiles.map(t => `(${t.position.x},${t.position.y})`))
    console.log(`[RIVAL-CLUE] Chosen 6 random tiles:`, chosenRandomTiles.map(t => `(${t.position.x},${t.position.y})[${t.owner}]`))
  }

  return { chosenRivalTiles, chosenRandomTiles }
}

/**
 * Add a distraction point: pick a random tile with nonzero points and add 1 point
 */
export function addDistractionPoint(
  currentPoints: { [key: string]: number },
  excludedPositions: Set<string>
): void {
  // Get all tiles with nonzero points (excluding adjacency-ruled-out positions)
  const tilesWithPoints = Object.keys(currentPoints).filter(
    key => currentPoints[key] > 0 && !excludedPositions.has(key)
  )

  if (tilesWithPoints.length === 0) {
    return // No tiles to distract on
  }

  // Pick one at random and add 1 point
  const randomKey = tilesWithPoints[Math.floor(Math.random() * tilesWithPoints.length)]
  currentPoints[randomKey] = (currentPoints[randomKey] || 0) + 1
}

/**
 * Generate rival intent points for the current turn.
 * This replaces the old bag-based clue system with a points-based interest system.
 *
 * Algorithm:
 * 1. Pick 2 random rival tiles
 * 2. Pick 6 random other tiles (excluding adjacency-ruled-out positions)
 * 3. Stable sort by safety: Rival > Neutral > Player > Mine
 * 4. Assign points: [5, 3, 3, 3, 3, 1, 1, 1]
 * 5. Add 4 distraction points (random tiles with nonzero points get +1)
 */
export function generateRivalIntentPoints(state: GameState): { [key: string]: number } {
  console.log(`\n[RIVAL-INTENT] ========== generateRivalIntentPoints ==========`)

  // Get positions to exclude based on adjacency info
  const excludedPositions = getExcludedPositionsByAdjacency(state.board, 'rival')

  const unrevealedTiles = Array.from(state.board.tiles.values())
    .filter(tile => !tile.revealed && tile.owner !== 'empty')
    .filter(tile => !excludedPositions.has(positionToKey(tile.position)))
  const rivalTiles = unrevealedTiles.filter(tile => tile.owner === 'rival')

  console.log(`[RIVAL-INTENT] Available tiles: ${unrevealedTiles.length} total, ${rivalTiles.length} rival tiles`)

  // Pick 2 rival tiles
  const chosenRivalTiles = selectTilesForClue(rivalTiles, 2)

  // Pick 6 other random tiles
  const remainingTiles = unrevealedTiles.filter(tile =>
    !chosenRivalTiles.some(chosen =>
      chosen.position.x === tile.position.x && chosen.position.y === tile.position.y
    )
  )
  const chosenOtherTiles = selectTilesForClue(remainingTiles, 6)

  console.log(`[RIVAL-INTENT] Chosen 2 rival tiles:`, chosenRivalTiles.map(t => `(${t.position.x},${t.position.y})`))
  console.log(`[RIVAL-INTENT] Chosen 6 other tiles:`, chosenOtherTiles.map(t => `(${t.position.x},${t.position.y})[${t.owner}]`))

  // Combine and stable sort by safety: Rival > Neutral > Player > Mine
  const allTiles = [...chosenRivalTiles, ...chosenOtherTiles]
  const ownerPriority: Record<string, number> = { rival: 0, neutral: 1, player: 2, mine: 3, empty: 4 }
  allTiles.sort((a, b) => ownerPriority[a.owner] - ownerPriority[b.owner])

  console.log(`[RIVAL-INTENT] Sorted tiles:`, allTiles.map(t => `(${t.position.x},${t.position.y})[${t.owner}]`))

  // Assign initial points: [5, 3, 3, 3, 3, 1, 1, 1]
  const points: { [key: string]: number } = {}
  const pointValues = [5, 3, 3, 3, 3, 1, 1, 1]

  for (let i = 0; i < allTiles.length && i < pointValues.length; i++) {
    const key = positionToKey(allTiles[i].position)
    points[key] = pointValues[i]
  }

  console.log(`[RIVAL-INTENT] Initial points assigned:`, Object.keys(points).map(k => `${k}:${points[k]}`))

  // Add 4 distraction points
  for (let i = 0; i < 4; i++) {
    addDistractionPoint(points, excludedPositions)
  }

  console.log(`[RIVAL-INTENT] Final points after distraction:`, Object.keys(points).map(k => `${k}:${points[k]}`))

  return points
}

/**
 * Decay rival intent points after tile reveals.
 * Called after any tile(s) are revealed during a turn.
 *
 * Algorithm:
 * 1. Remove points for revealed positions
 * 2. If revealed tile has adjacencyCount=0 for rival, remove points from neighbors
 * 3. Decrement all remaining points by 1 (min 0)
 * 4. Remove any tiles with 0 points from map
 */
export function decayRivalIntentPoints(
  state: GameState,
  revealedPositions: Position[]
): GameState {
  console.log(
    `[INTENT-DECAY] Decaying points after revealing ${revealedPositions.length} tiles:`,
    revealedPositions.map(p => `(${p.x},${p.y})`).join(', ')
  )
  console.log(`[INTENT-DECAY] Points before decay:`, { ...state.rivalIntentPoints })

  // Clone the points map
  const newPoints = { ...state.rivalIntentPoints }

  // Step 1: Remove points for all revealed positions
  for (const pos of revealedPositions) {
    const key = positionToKey(pos)
    if (newPoints[key] !== undefined) {
      if (state.debugFlags.debugLogging) {
        console.log(`[RIVAL-INTENT] Removing points for revealed tile ${key} (had ${newPoints[key]} points)`)
      }
      delete newPoints[key]
    }
  }

  // Step 2: Check for adjacencyCount=0 for rival-revealed tiles and remove neighbor points
  for (const pos of revealedPositions) {
    const tile = state.board.tiles.get(positionToKey(pos))
    if (tile && tile.revealed && tile.revealedBy === 'rival') {
      // Check if this tile has 0 adjacent rivals (adjacency count for rival reveals)
      if (tile.adjacencyCount === 0) {
        if (state.debugFlags.debugLogging) {
          console.log(
            `[RIVAL-INTENT] Tile (${pos.x},${pos.y}) revealed by rival with adjacencyCount=0, removing points from neighbors`
          )
        }

        // Remove points from all neighbors
        const neighbors = getNeighbors(state.board, pos)
        for (const neighborPos of neighbors) {
          const neighborKey = positionToKey(neighborPos)
          if (newPoints[neighborKey] !== undefined) {
            if (state.debugFlags.debugLogging) {
              console.log(`[RIVAL-INTENT] Removing points from neighbor ${neighborKey} (had ${newPoints[neighborKey]} points)`)
            }
            delete newPoints[neighborKey]
          }
        }
      }
    }
  }

  // Step 3: Decrement all remaining points by 1 (min 0)
  const keysToDecrement = Object.keys(newPoints)
  if (state.debugFlags.debugLogging) {
    console.log(`[RIVAL-INTENT] Decrementing ${keysToDecrement.length} remaining tiles by 1`)
  }
  for (const key of keysToDecrement) {
    newPoints[key] = Math.max(0, newPoints[key] - 1)
  }

  // Step 4: Remove any tiles with 0 points
  const keysToRemove = Object.keys(newPoints).filter(k => newPoints[k] === 0)
  if (keysToRemove.length > 0) {
    if (state.debugFlags.debugLogging) {
      console.log(`[RIVAL-INTENT] Removing ${keysToRemove.length} tiles with 0 points:`, keysToRemove)
    }
    for (const key of keysToRemove) {
      delete newPoints[key]
    }
  }

  console.log(`[INTENT-DECAY] Points after decay:`, { ...newPoints })

  return {
    ...state,
    rivalIntentPoints: newPoints
  }
}