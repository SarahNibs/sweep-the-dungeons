import { GameState, Card, Tile, Position, ClueResult } from '../../types'
import { addClueResult } from '../cardEffects'
import { getTile, getNeighbors, positionToKey } from '../boardSystem'
import { selectTilesForClue, getExcludedPositionsByAdjacency } from '../clueSystem'

interface Method1Result {
  exists: boolean
  candidateTiles: Tile[] // The candidate tiles selected
  redClueTargets: Tile[] // Tiles that get red dots (from bag draws)
  redClueCounts: Map<string, number> // Red pip counts per tile position key
  greenClueTargets: Map<Position, number> // Tiles that get green dots, with strength
  score: number // Number of player-owned adjacent tiles
}

interface Method2Result {
  redClueTargets: Tile[] // Tiles that get red dots
  redClueCounts: Map<string, number> // Red pip counts per tile position key
  greenClueTargets: Map<Position, number> // Tiles that get green dots, with strength
  score: number // Number of player tiles with at least one green dot + 1
}

/**
 * Method 1: "Don't reveal these tiles, reveal everything adjacent to them"
 * Finds tiles with mostly player-owned neighbors and marks them with red dots
 */
function generateMethod1(state: GameState): Method1Result {

  const unrevealedTiles = Array.from(state.board.tiles.values())
    .filter(tile => !tile.revealed && tile.owner !== 'empty')

  const playerTiles = unrevealedTiles.filter(t => t.owner === 'player')
  const totalPlayerTilesRemaining = playerTiles.length


  // Find candidate tiles
  const candidates: Array<{
    tile: Tile
    adjacentPlayer: number
    adjacentRival: number
    adjacentNeutral: number
    adjacentUnrevealed: number
  }> = []

  for (const tile of unrevealedTiles) {
    // Player-owned tiles can never be candidate tiles
    if (tile.owner === 'player') {
      continue
    }

    const neighbors = getNeighbors(state.board, tile.position)
    const adjacentTiles = neighbors
      .map(pos => getTile(state.board, pos))
      .filter((t): t is Tile => t !== undefined)

    // Skip if any unrevealed adjacent tiles are mines
    if (adjacentTiles.some(t => t.owner === 'mine' && !t.revealed)) {
      continue
    }

    // Count unrevealed adjacent tiles
    const adjacentUnrevealed = adjacentTiles.filter(t => !t.revealed)
    const N = adjacentUnrevealed.length

    // Count adjacent player tiles
    const adjacentPlayer = adjacentUnrevealed.filter(t => t.owner === 'player').length
    const P = adjacentPlayer

    // MANDATORY: Must have more than 50% player tiles
    const isMoreThanHalfPlayer = P > N / 2

    // Exclusion rules: specific (N,P) combinations that don't qualify
    const isExcludedCombination = (N === 3 && P === 2) || (N === 5 && P === 3)

    // Check eligibility: P > 0.8 * (N-1) OR (P >= 6 OR P is all/all-but-one remaining)
    // PLUS the mandatory >50% player tiles requirement
    // MINUS the excluded combinations
    const threshold = 0.8 * (N - 1)
    const isHighPercentage = P > threshold
    const isHighCount = P >= 6
    const isAllOrAlmostAll = P >= totalPlayerTilesRemaining - 1

    if (isMoreThanHalfPlayer && !isExcludedCombination && (isHighPercentage || isHighCount || isAllOrAlmostAll)) {
      const adjacentRival = adjacentUnrevealed.filter(t => t.owner === 'rival').length
      const adjacentNeutral = adjacentUnrevealed.filter(t => t.owner === 'neutral').length

      candidates.push({
        tile,
        adjacentPlayer,
        adjacentRival,
        adjacentNeutral,
        adjacentUnrevealed: N
      })

    }
  }


  if (candidates.length === 0) {
    return {
      exists: false,
      candidateTiles: [],
      redClueTargets: [],
      redClueCounts: new Map(),
      greenClueTargets: new Map(),
      score: 0
    }
  }

  // Sort candidates: most player adjacents, least rival, least neutral, random
  candidates.sort((a, b) => {
    if (a.adjacentPlayer !== b.adjacentPlayer) {
      return b.adjacentPlayer - a.adjacentPlayer // More player = better
    }
    if (a.adjacentRival !== b.adjacentRival) {
      return a.adjacentRival - b.adjacentRival // Less rival = better
    }
    if (a.adjacentNeutral !== b.adjacentNeutral) {
      return a.adjacentNeutral - b.adjacentNeutral // Less neutral = better
    }
    return Math.random() - 0.5 // Random tiebreaker
  })


  // Limit to at most the best 2 candidates
  const limitedCandidates = candidates.slice(0, 2)

  // Collect candidates until reaching 2+ adjacent rivals OR 4+ adjacent non-players
  const selectedTiles: Tile[] = []
  let totalAdjacentRivals = 0
  let totalAdjacentNonPlayers = 0

  for (const candidate of limitedCandidates) {
    selectedTiles.push(candidate.tile)
    totalAdjacentRivals += candidate.adjacentRival
    totalAdjacentNonPlayers += candidate.adjacentRival + candidate.adjacentNeutral


    if (totalAdjacentRivals >= 2 || totalAdjacentNonPlayers >= 4) {
      break
    }
  }

  // Calculate score: total player-owned tiles adjacent to selected tiles
  let score = 0
  const countedPositions = new Set<string>()

  for (const selectedTile of selectedTiles) {
    const neighbors = getNeighbors(state.board, selectedTile.position)
    for (const neighborPos of neighbors) {
      const neighbor = getTile(state.board, neighborPos)
      if (neighbor && !neighbor.revealed && neighbor.owner === 'player') {
        const key = `${neighborPos.x},${neighborPos.y}`
        if (!countedPositions.has(key)) {
          countedPositions.add(key)
          score++
        }
      }
    }
  }


  // === GENERATE RED PIPS USING BAG SYSTEM ===

  // Create RedClues bag: 10x instances distributed evenly among candidate tiles
  const redCluesBag: Tile[] = []
  const instancesPerCandidate = Math.floor(10 / selectedTiles.length)
  const extraInstances = 10 % selectedTiles.length


  for (let i = 0; i < selectedTiles.length; i++) {
    const tile = selectedTiles[i]
    const copies = instancesPerCandidate + (i < extraInstances ? 1 : 0)
    for (let j = 0; j < copies; j++) {
      redCluesBag.push(tile)
    }
  }

  // Add 5 spoiler tiles from rest of board
  const candidatePositions = new Set(selectedTiles.map(t => `${t.position.x},${t.position.y}`))
  const spoilerTiles = unrevealedTiles.filter(tile => {
    const posKey = `${tile.position.x},${tile.position.y}`
    return !candidatePositions.has(posKey)
  })


  const spoilersBag: Tile[] = []
  for (const tile of spoilerTiles) {
    const copies = tile.owner === 'player' ? 2 : 3
    for (let i = 0; i < copies; i++) {
      spoilersBag.push(tile)
    }
  }

  const spoilersBagCopy = [...spoilersBag]
  for (let i = 0; i < Math.min(5, spoilersBagCopy.length); i++) {
    const randomIndex = Math.floor(Math.random() * spoilersBagCopy.length)
    redCluesBag.push(spoilersBagCopy[randomIndex])
    spoilersBagCopy.splice(randomIndex, 1)
  }


  // Draw 5 from RedClues bag → red pips
  const redPipTargets: Tile[] = []
  const redCluesBagCopy = [...redCluesBag]
  for (let i = 0; i < Math.min(5, redCluesBagCopy.length); i++) {
    const randomIndex = Math.floor(Math.random() * redCluesBagCopy.length)
    redPipTargets.push(redCluesBagCopy[randomIndex])
    redCluesBagCopy.splice(randomIndex, 1)
  }


  // Count red pips per tile
  const redPipCounts = new Map<string, number>()
  for (const tile of redPipTargets) {
    const key = `${tile.position.x},${tile.position.y}`
    redPipCounts.set(key, (redPipCounts.get(key) || 0) + 1)
  }


  // Deduplicate red targets
  const redTargetPositions = new Set<string>()
  const redTargets: Tile[] = []
  for (const tile of redPipTargets) {
    const key = `${tile.position.x},${tile.position.y}`
    if (!redTargetPositions.has(key)) {
      redTargetPositions.add(key)
      redTargets.push(tile)
    }
  }

  // === REDISTRIBUTE ONE PIP TO ADJACENT NON-PLAYER TILE ===
  // Find non-player tiles adjacent to candidate tiles
  const adjacentNonPlayerTiles: Tile[] = []
  const candidateSet = new Set(selectedTiles.map(t => `${t.position.x},${t.position.y}`))

  for (const candidateTile of selectedTiles) {
    const neighbors = getNeighbors(state.board, candidateTile.position)
    for (const neighborPos of neighbors) {
      const neighbor = getTile(state.board, neighborPos)
      if (neighbor && !neighbor.revealed && neighbor.owner !== 'player' && neighbor.owner !== 'empty') {
        const posKey = `${neighborPos.x},${neighborPos.y}`
        // Skip if it's another candidate tile
        if (candidateSet.has(posKey)) continue

        // Check if already in our list
        if (!adjacentNonPlayerTiles.some(t => `${t.position.x},${t.position.y}` === posKey)) {
          adjacentNonPlayerTiles.push(neighbor)
        }
      }
    }
  }


  if (adjacentNonPlayerTiles.length > 0 && redPipCounts.size > 0) {
    // Find the minimum non-zero pip count, or 0 if all are 0
    const nonZeroCounts = adjacentNonPlayerTiles
      .map(t => redPipCounts.get(`${t.position.x},${t.position.y}`) || 0)
      .filter(c => c > 0)
    const minNonZero = nonZeroCounts.length > 0 ? Math.min(...nonZeroCounts) : 0

    // Filter to tiles with the minimum non-zero count (or 0 if no tiles have pips)
    const candidates = adjacentNonPlayerTiles.filter(t => {
      const pipCount = redPipCounts.get(`${t.position.x},${t.position.y}`) || 0
      return minNonZero > 0 ? pipCount === minNonZero : pipCount === 0
    })


    // Sort by priority: rival > neutral, then random
    candidates.sort((a, b) => {
      if (a.owner === 'rival' && b.owner !== 'rival') return -1
      if (a.owner !== 'rival' && b.owner === 'rival') return 1
      return Math.random() - 0.5
    })

    if (candidates.length > 0) {
      const chosenTile = candidates[0]
      const chosenPosKey = `${chosenTile.position.x},${chosenTile.position.y}`

      // Find a tile to steal a pip from (pick one with highest pip count)
      const tilesWithPips = Array.from(redPipCounts.entries())
        .filter(([_, count]) => count > 0)
        .sort((a, b) => b[1] - a[1])

      if (tilesWithPips.length > 0) {
        const [sourcePosKey, sourceCount] = tilesWithPips[0]

        // Update pip counts
        redPipCounts.set(sourcePosKey, sourceCount - 1)
        redPipCounts.set(chosenPosKey, (redPipCounts.get(chosenPosKey) || 0) + 1)

        // Remove source tile if it now has 0 pips
        if (sourceCount - 1 === 0) {
          redPipCounts.delete(sourcePosKey)
          const sourceIndex = redTargets.findIndex(t =>
            `${t.position.x},${t.position.y}` === sourcePosKey
          )
          if (sourceIndex !== -1) {
            redTargets.splice(sourceIndex, 1)
            redTargetPositions.delete(sourcePosKey)
          }
        }

        // Add chosen tile to red targets if not already there
        if (!redTargetPositions.has(chosenPosKey)) {
          redTargets.push(chosenTile)
          redTargetPositions.add(chosenPosKey)
        }
      }
    }
  }


  // === GENERATE GREEN PIPS USING BAG SYSTEM ===

  // Get positions to exclude based on player adjacency info
  const playerExcludedPositions = getExcludedPositionsByAdjacency(state.board, 'player')

  // Exclude: candidate tiles, tiles getting red pips, and positions ruled out by adjacency
  const excludedPositions = new Set([
    ...candidatePositions,
    ...redTargetPositions,
    ...playerExcludedPositions
  ])

  const greenBag: Tile[] = []
  for (const tile of unrevealedTiles) {
    const posKey = `${tile.position.x},${tile.position.y}`
    if (!excludedPositions.has(posKey)) {
      const copies = tile.owner === 'player' ? 3
                   : (tile.owner === 'rival' || tile.owner === 'neutral') ? 2
                   : 1 // mine
      for (let i = 0; i < copies; i++) {
        greenBag.push(tile)
      }
    }
  }


  // Draw 5 from green bag
  const greenDraws: Tile[] = []
  const greenBagCopy = [...greenBag]
  for (let i = 0; i < Math.min(5, greenBagCopy.length); i++) {
    const randomIndex = Math.floor(Math.random() * greenBagCopy.length)
    greenDraws.push(greenBagCopy[randomIndex])
    greenBagCopy.splice(randomIndex, 1)
  }


  // Count green pips per tile
  const greenPipCounts = new Map<string, number>()
  for (const tile of greenDraws) {
    const key = `${tile.position.x},${tile.position.y}`
    greenPipCounts.set(key, (greenPipCounts.get(key) || 0) + 1)
  }


  // Convert to Position map
  const greenClueTargets = new Map<Position, number>()
  for (const [posKey, count] of greenPipCounts) {
    const [x, y] = posKey.split(',').map(Number)
    greenClueTargets.set({ x, y }, count)
  }


  return {
    exists: true,
    candidateTiles: selectedTiles,
    redClueTargets: redTargets,
    redClueCounts: redPipCounts,
    greenClueTargets,
    score
  }
}

/**
 * Method 2: "Green clues and red anti-clues"
 * Uses bag-based generation for both red (anti) and green (positive) clues
 */
function generateMethod2(state: GameState, _enhanced: boolean): Method2Result {
  // Get positions to exclude based on adjacency info
  const playerExcludedPositions = getExcludedPositionsByAdjacency(state.board, 'player')
  const rivalExcludedPositions = getExcludedPositionsByAdjacency(state.board, 'rival')

  const unrevealedTiles = Array.from(state.board.tiles.values())
    .filter(tile => !tile.revealed && tile.owner !== 'empty')
    .filter(tile => !playerExcludedPositions.has(positionToKey(tile.position)))
  const nonPlayerTiles = unrevealedTiles.filter(t => t.owner !== 'player')
    .filter(tile => !rivalExcludedPositions.has(positionToKey(tile.position)))


  // === RED CLUES GENERATION ===

  // Create NotThese bag: 1x neutral, 2x rival, 3x mine
  const notTheseBag: Tile[] = []
  for (const tile of nonPlayerTiles) {
    const copies = tile.owner === 'neutral' ? 1 : tile.owner === 'rival' ? 2 : 3
    for (let i = 0; i < copies; i++) {
      notTheseBag.push(tile)
    }
  }


  // Draw from NotThese bag
  const drawnNotThese: Tile[] = []
  const drawCount = Math.random() < 0.75 ? 1 : 2
  const copiesPerDrawn = drawCount === 1 ? 10 : 5


  const notTheseBagCopy = [...notTheseBag]
  for (let i = 0; i < Math.min(drawCount, notTheseBagCopy.length); i++) {
    const randomIndex = Math.floor(Math.random() * notTheseBagCopy.length)
    const drawn = notTheseBagCopy[randomIndex]
    drawnNotThese.push(drawn)
    // Remove all instances of this tile from the bag
    const posKey = `${drawn.position.x},${drawn.position.y}`
    for (let j = notTheseBagCopy.length - 1; j >= 0; j--) {
      const tile = notTheseBagCopy[j]
      if (`${tile.position.x},${tile.position.y}` === posKey) {
        notTheseBagCopy.splice(j, 1)
      }
    }
  }


  // Create RedClues bag: add drawn tiles with their multipliers
  const redCluesBag: Tile[] = []
  for (const drawn of drawnNotThese) {
    for (let i = 0; i < copiesPerDrawn; i++) {
      redCluesBag.push(drawn)
    }
  }

  // Create SpoilersForNotThese bag: all tiles except those drawn (3x each, 2x for player)
  const drawnPositions = new Set(drawnNotThese.map(t => `${t.position.x},${t.position.y}`))
  const spoilersBag: Tile[] = []
  for (const tile of unrevealedTiles) {
    const posKey = `${tile.position.x},${tile.position.y}`
    if (!drawnPositions.has(posKey)) {
      const copies = tile.owner === 'player' ? 2 : 3
      for (let i = 0; i < copies; i++) {
        spoilersBag.push(tile)
      }
    }
  }


  // Draw 10 from spoilers bag and add to RedClues bag
  const spoilersBagCopy = [...spoilersBag]
  for (let i = 0; i < Math.min(10, spoilersBagCopy.length); i++) {
    const randomIndex = Math.floor(Math.random() * spoilersBagCopy.length)
    const drawn = spoilersBagCopy[randomIndex]
    redCluesBag.push(drawn)
    spoilersBagCopy.splice(randomIndex, 1)
  }


  // Draw 5 from RedClues bag → these get red pips
  const redPipTargets: Tile[] = []
  const redCluesBagCopy = [...redCluesBag]
  for (let i = 0; i < Math.min(5, redCluesBagCopy.length); i++) {
    const randomIndex = Math.floor(Math.random() * redCluesBagCopy.length)
    redPipTargets.push(redCluesBagCopy[randomIndex])
    redCluesBagCopy.splice(randomIndex, 1)
  }


  // Count red pips per tile
  const redPipCounts = new Map<string, number>()
  for (const tile of redPipTargets) {
    const key = `${tile.position.x},${tile.position.y}`
    redPipCounts.set(key, (redPipCounts.get(key) || 0) + 1)
  }


  // Deduplicate red targets
  const redTargetPositions = new Set<string>()
  const redTargets: Tile[] = []
  for (const tile of redPipTargets) {
    const key = `${tile.position.x},${tile.position.y}`
    if (!redTargetPositions.has(key)) {
      redTargetPositions.add(key)
      redTargets.push(tile)
    }
  }

  // === GREEN CLUES GENERATION ===
  // Same as enhanced Imperious Instructions (solid clue) but only 5 draws instead of 10

  const playerTiles = unrevealedTiles.filter(t => t.owner === 'player')
  const chosenPlayerTiles = selectTilesForClue(playerTiles, 2)
  const remainingTiles = unrevealedTiles.filter(tile =>
    !chosenPlayerTiles.some(chosen =>
      chosen.position.x === tile.position.x && chosen.position.y === tile.position.y
    )
  )
  const chosenRandomTiles = selectTilesForClue(remainingTiles, 5)


  // Build bag with adjustments (12 copies of player, 4 copies of spoilers)
  const buildBagWithAdjustmentsLocal = (
    tiles: Tile[],
    copiesPerTile: number,
    targetOwner: 'player' | 'rival',
    targetTiles: Tile[]
  ): Tile[] => {
    const bag: Tile[] = []
    const targetTilePositions = new Set(
      targetTiles.map(tile => `${tile.position.x},${tile.position.y}`)
    )

    for (const tile of tiles) {
      let actualCopies = copiesPerTile
      const tileKey = `${tile.position.x},${tile.position.y}`
      const isTargetTile = targetTilePositions.has(tileKey)

      if (!isTargetTile) {
        if (tile.owner === 'mine') {
          actualCopies -= 1
        }
        if (tile.owner === targetOwner) {
          actualCopies -= 1
        }
      }

      actualCopies = Math.max(0, actualCopies)

      for (let i = 0; i < actualCopies; i++) {
        bag.push(tile)
      }
    }
    return bag
  }

  const greenBag: Tile[] = [
    ...buildBagWithAdjustmentsLocal(chosenPlayerTiles, 12, 'player', chosenPlayerTiles),
    ...buildBagWithAdjustmentsLocal(chosenRandomTiles, 4, 'player', chosenPlayerTiles)
  ]


  // Guarantee first 2 draws are player tiles, then draw 3 more (total 5)
  const greenDraws: Tile[] = [...chosenPlayerTiles]
  const greenBagCopy = [...greenBag]
  for (let i = 0; i < Math.min(3, greenBagCopy.length); i++) {
    const randomIndex = Math.floor(Math.random() * greenBagCopy.length)
    greenDraws.push(greenBagCopy[randomIndex])
    greenBagCopy.splice(randomIndex, 1)
  }


  // Count green pips per tile
  const greenPipCounts = new Map<string, number>()
  for (const tile of greenDraws) {
    const key = `${tile.position.x},${tile.position.y}`
    greenPipCounts.set(key, (greenPipCounts.get(key) || 0) + 1)
  }


  // Convert to Position map
  const greenClueTargets = new Map<Position, number>()
  for (const [posKey, count] of greenPipCounts) {
    const [x, y] = posKey.split(',').map(Number)
    greenClueTargets.set({ x, y }, count)
  }

  // Calculate score: number of player tiles with at least one green dot + 1
  let playerTilesWithGreenDots = 0
  for (const [posKey, count] of greenPipCounts) {
    if (count > 0) {
      const [x, y] = posKey.split(',').map(Number)
      const tile = getTile(state.board, { x, y })
      if (tile && tile.owner === 'player') {
        playerTilesWithGreenDots++
      }
    }
  }
  const score = playerTilesWithGreenDots + 1


  return {
    redClueTargets: redTargets,
    redClueCounts: redPipCounts,
    greenClueTargets,
    score
  }
}

export function executeSarcasticOrdersEffect(state: GameState, card?: Card): GameState {

  const enhanced = card?.enhanced || false

  // Generate both methods
  const method1 = generateMethod1(state)
  const method2 = generateMethod2(state, enhanced)


  // Choose best method
  const useMethod1 = method1.exists && method1.score > method2.score


  let newState = {
    ...state,
    clueCounter: state.clueCounter + 1,
    playerClueCounter: state.playerClueCounter + 1,
    instructionsPlayedThisFloor: new Set([...state.instructionsPlayedThisFloor, 'Sarcastic Instructions'])
  }

  // Gain energy if enhanced and any other Instructions card has been played this floor
  if (enhanced) {
    const instructionsCards = ['Imperious Instructions', 'Vague Instructions', 'Sarcastic Instructions']
    const hasPlayedOtherInstructions = instructionsCards.some(
      cardName => state.instructionsPlayedThisFloor.has(cardName)
    )

    if (hasPlayedOtherInstructions) {
      newState = {
        ...newState,
        energy: newState.energy + 1
      }
    } else {
    }
  }

  const clueOrder = newState.clueCounter
  const clueRowPosition = newState.playerClueCounter

  if (useMethod1) {
    // Method 1: Both red and green dots from bag system

    // Add red dots (anti-clues)
    const redClueId = crypto.randomUUID()
    for (const tile of method1.redClueTargets) {
      const posKey = `${tile.position.x},${tile.position.y}`
      const strength = method1.redClueCounts.get(posKey) || 1

      const clueResult: ClueResult = {
        id: redClueId,
        cardType: 'sarcastic_orders',
        enhanced,
        strengthForThisTile: strength, // Use actual pip count
        allAffectedTiles: method1.redClueTargets.map(t => t.position),
        clueOrder,
        clueRowPosition,
        isAntiClue: true
      }

      newState = addClueResult(newState, tile.position, clueResult)
    }

    // Add green dots (positive clues)
    const greenClueId = crypto.randomUUID()
    const allGreenPositions = Array.from(method1.greenClueTargets.keys())
    for (const [position, strength] of method1.greenClueTargets) {
      const clueResult: ClueResult = {
        id: greenClueId,
        cardType: 'sarcastic_orders',
        enhanced,
        strengthForThisTile: strength,
        allAffectedTiles: allGreenPositions,
        clueOrder,
        clueRowPosition,
        isAntiClue: false
      }

      newState = addClueResult(newState, position, clueResult)
    }
  } else {
    // Method 2: Both red and green dots

    // Add red dots (anti-clues)
    const redClueId = crypto.randomUUID()
    for (const tile of method2.redClueTargets) {
      const posKey = `${tile.position.x},${tile.position.y}`
      const strength = method2.redClueCounts.get(posKey) || 1

      const clueResult: ClueResult = {
        id: redClueId,
        cardType: 'sarcastic_orders',
        enhanced,
        strengthForThisTile: strength, // Use actual pip count
        allAffectedTiles: method2.redClueTargets.map(t => t.position),
        clueOrder,
        clueRowPosition,
        isAntiClue: true
      }

      newState = addClueResult(newState, tile.position, clueResult)
    }

    // Add green dots (positive clues)
    const greenClueId = crypto.randomUUID()
    const allGreenPositions = Array.from(method2.greenClueTargets.keys())
    for (const [position, strength] of method2.greenClueTargets) {
      const clueResult: ClueResult = {
        id: greenClueId,
        cardType: 'sarcastic_orders',
        enhanced,
        strengthForThisTile: strength,
        allAffectedTiles: allGreenPositions,
        clueOrder,
        clueRowPosition,
        isAntiClue: false
      }

      newState = addClueResult(newState, position, clueResult)
    }
  }


  return newState
}
