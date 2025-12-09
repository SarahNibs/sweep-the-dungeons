import { Board, Tile, Position, GameState } from '../types'
import { destroyTile } from './destroyTileSystem'

export function createPosition(x: number, y: number): Position {
  return { x, y }
}

export function positionToKey(position: Position): string {
  return `${position.x},${position.y}`
}

export function keyToPosition(key: string): Position {
  const [x, y] = key.split(',').map(Number)
  return { x, y }
}

// Helper to check if two positions are orthogonally adjacent (manhattan distance 1, not diagonal)
export function isOrthogonallyAdjacent(pos1: Position, pos2: Position): boolean {
  const manhattanDist = Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y)
  return manhattanDist === 1
}

export function createTile(position: Position, owner: Tile['owner'], specialTiles?: Array<'extraDirty' | 'goblin' | 'destroyed' | 'lair' | 'surfaceMine' | 'sanctum'>): Tile {
  return {
    position,
    owner,
    revealed: false,
    revealedBy: null,
    adjacencyCount: null,
    annotations: [],
    specialTiles: specialTiles || [],
    cleanedOnce: false, // Initialize cleanedOnce to false for all new tiles
    innerTile: false,
    connectedSanctums: []
  }
}

// Helper functions for working with specialTiles array
export function hasSpecialTile(tile: Tile, type: 'extraDirty' | 'goblin' | 'destroyed' | 'lair' | 'surfaceMine' | 'sanctum'): boolean {
  return tile.specialTiles.includes(type)
}

export function addSpecialTile(tile: Tile, type: 'extraDirty' | 'goblin' | 'destroyed' | 'lair' | 'surfaceMine' | 'sanctum'): Tile {
  if (hasSpecialTile(tile, type)) return tile
  return {
    ...tile,
    specialTiles: [...tile.specialTiles, type]
  }
}

export function removeSpecialTile(tile: Tile, type: 'extraDirty' | 'goblin' | 'destroyed' | 'lair' | 'surfaceMine' | 'sanctum'): Tile {
  return {
    ...tile,
    specialTiles: tile.specialTiles.filter(t => t !== type)
  }
}

export function clearAllSpecialTiles(tile: Tile): Tile {
  return {
    ...tile,
    specialTiles: []
  }
}

export interface SpecialTileConfig {
  type: 'extraDirty' | 'goblin' | 'lair' | 'surfaceMine' | 'sanctum'
  count: number
  placement: 'random' | 'nonmine' | 'empty' | 'playerOrNeutral' | { owner: Array<'player' | 'rival' | 'neutral' | 'mine'> } | number[][]
}

export function createBoard(
  width: number = 6,
  height: number = 5,
  tileCounts: { player: number; rival: number; neutral: number; mine: number } = {
    player: 12, rival: 10, neutral: 7, mine: 1
  },
  unusedLocations: number[][] | number = [],
  specialTiles: SpecialTileConfig[] = [],
  adjacencyRule: 'standard' | 'manhattan-2' = 'standard'
): Board {
  const tiles = new Map<string, Tile>()

  // Create tile types array based on provided counts
  const tileTypes: Tile['owner'][] = [
    ...Array(tileCounts.player).fill('player'),
    ...Array(tileCounts.rival).fill('rival'),
    ...Array(tileCounts.neutral).fill('neutral'),
    ...Array(tileCounts.mine).fill('mine')
  ]

  // Shuffle the array for random distribution
  for (let i = tileTypes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tileTypes[i], tileTypes[j]] = [tileTypes[j], tileTypes[i]]
  }

  // Handle unusedLocations - can be array of coordinates or number for random selection
  let unusedPositions: Set<string>
  if (typeof unusedLocations === 'number') {
    // Random selection: choose N random positions from all grid positions
    const allPositions: Position[] = []
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        allPositions.push({ x, y })
      }
    }

    // Shuffle all positions
    for (let i = allPositions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allPositions[i], allPositions[j]] = [allPositions[j], allPositions[i]]
    }

    // Take first N positions
    const selectedPositions = allPositions.slice(0, Math.min(unusedLocations, allPositions.length))
    unusedPositions = new Set(selectedPositions.map(pos => positionToKey(pos)))
  } else {
    // Explicit coordinates
    unusedPositions = new Set(
      unusedLocations.map(([x, y]) => positionToKey({ x, y }))
    )
  }
  
  // Create tiles for the entire grid
  let tileIndex = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const position = createPosition(x, y)
      const key = positionToKey(position)
      
      if (unusedPositions.has(key)) {
        // Create empty tiles for holes in the grid
        tiles.set(key, createTile(position, 'empty'))
      } else {
        // Create normal tiles with shuffled owners
        const owner = tileTypes[tileIndex]
        tiles.set(key, createTile(position, owner))
        tileIndex++
      }
    }
  }
  
  // Apply special tiles
  // Sort so lairs are placed before extraDirty (for weighted selection to work correctly)
  const sortedSpecialTiles = [...specialTiles].sort((a, b) => {
    const order = { lair: 0, goblin: 1, sanctum: 1, surfaceMine: 1, extraDirty: 2 }
    return (order[a.type] || 99) - (order[b.type] || 99)
  })

  for (const specialTileConfig of sortedSpecialTiles) {
    applySpecialTiles(tiles, specialTileConfig, adjacencyRule)
  }
  
  return {
    width,
    height,
    tiles,
    adjacencyRule
  }
}

// Check if player can reveal an inner tile (returns true if tile can be revealed)
// Inner tiles can only be revealed by the player if at least one connected sanctum is revealed
export function canPlayerRevealInnerTile(board: Board, position: Position): boolean {
  const tile = getTile(board, position)
  if (!tile?.innerTile || !tile.connectedSanctums || tile.connectedSanctums.length === 0) {
    return true // Not an inner tile, so can be revealed
  }

  // Check if ANY connected sanctum is revealed
  for (const sanctumPos of tile.connectedSanctums) {
    const sanctum = getTile(board, sanctumPos)
    if (sanctum?.revealed) {
      return true // At least one sanctum is revealed
    }
  }

  return false // All connected sanctums are unrevealed
}

/**
 * Check if a card respects inner tile restrictions
 * Cards representing "obvious action" cannot target inaccessible inner tiles
 * Cards representing sensory info, small animal helpers, or surreptitious action can
 */
export function cardRespectsInnerTileRestrictions(cardName: string): boolean {
  const restrictedCards = new Set([
    'Spritz',
    'Brush',
    'Sweep',
    'Horse',
    'Brat',
    'Snip, Snip',
    'Fetch'
  ])
  return restrictedCards.has(cardName)
}

// Setup sanctums and mark their connected inner tiles
// Must be called after board creation and special tile application
export function setupSanctumsAndInnerTiles(board: Board): Board {
  // Find all sanctum tiles
  const sanctumTiles: Tile[] = []
  for (const tile of board.tiles.values()) {
    if (tile.specialTiles?.includes('sanctum')) {
      sanctumTiles.push(tile)
    }
  }

  if (sanctumTiles.length === 0) {
    return board // No sanctums, nothing to do
  }

  const newTiles = new Map(board.tiles)

  // Pass 1: Each sanctum picks its own inner tiles
  const allInnerTileKeys = new Set<string>()

  for (const sanctum of sanctumTiles) {
    // Get spatially nearby tiles
    const nearbyPositions = getNearbyTiles(board, sanctum.position)

    // Filter candidates: must not be empty, must not be sanctums
    const candidates = nearbyPositions.filter(pos => {
      const tile = board.tiles.get(positionToKey(pos))
      return tile &&
             tile.owner !== 'empty' &&
             !tile.specialTiles?.includes('sanctum')
    })

    if (candidates.length === 0) continue

    // Select N = ceil(candidates.length / 2) random candidates as inner tiles
    const innerCount = Math.ceil(candidates.length / 2)
    const shuffled = [...candidates].sort(() => Math.random() - 0.5)
    const selectedInner = shuffled.slice(0, innerCount)

    console.log(`Sanctum at (${sanctum.position.x}, ${sanctum.position.y}): ${candidates.length} candidates, selecting ${innerCount} as inner tiles`)

    // Mark them as inner (but don't set connections yet)
    for (const innerPos of selectedInner) {
      const key = positionToKey(innerPos)
      allInnerTileKeys.add(key)
      const tile = newTiles.get(key) || board.tiles.get(key)
      if (tile) {
        newTiles.set(key, {
          ...tile,
          innerTile: true,
          connectedSanctums: [] // Will be computed in pass 2
        })
      }
    }
  }

  // Pass 2: For each inner tile, connect it to ALL nearby sanctums
  for (const innerKey of allInnerTileKeys) {
    const innerPos = keyToPosition(innerKey)
    const tile = newTiles.get(innerKey)
    if (!tile) continue

    // Find all sanctums this tile is nearby
    const connectedSanctums: Position[] = []
    for (const sanctum of sanctumTiles) {
      const nearbyPositions = getNearbyTiles(board, sanctum.position)
      const isNearby = nearbyPositions.some(pos => positionToKey(pos) === innerKey)
      if (isNearby) {
        connectedSanctums.push(sanctum.position)
      }
    }

    console.log(`  Inner tile (${innerPos.x}, ${innerPos.y}) connected to ${connectedSanctums.length} sanctum(s)`)

    newTiles.set(innerKey, {
      ...tile,
      connectedSanctums
    })
  }

  return {
    ...board,
    tiles: newTiles
  }
}

// Helper to check if a tile has a lair neighbor
function hasLairNeighbor(tiles: Map<string, Tile>, position: Position, adjacencyRule: 'standard' | 'manhattan-2'): boolean {
  // Create a minimal board to use getNearbyTiles
  const tempBoard: Board = {
    tiles,
    width: 100, // Large enough to not matter
    height: 100,
    adjacencyRule
  }

  const nearbyPositions = getNearbyTiles(tempBoard, position)

  for (const neighborPos of nearbyPositions) {
    const neighbor = tiles.get(positionToKey(neighborPos))
    if (neighbor && hasSpecialTile(neighbor, 'lair')) {
      return true
    }
  }

  return false
}

// Weighted random selection: tiles near lairs are 4x more likely to be selected
function selectWithLairWeighting(tiles: Tile[], count: number, tilesMap: Map<string, Tile>, adjacencyRule: 'standard' | 'manhattan-2'): Tile[] {
  const selected: Tile[] = []
  const remaining = [...tiles]

  for (let i = 0; i < count && remaining.length > 0; i++) {
    // Calculate weights for each remaining tile
    const weights = remaining.map(tile =>
      hasLairNeighbor(tilesMap, tile.position, adjacencyRule) ? 4 : 1
    )

    const totalWeight = weights.reduce((sum, w) => sum + w, 0)

    // Weighted random selection
    let random = Math.random() * totalWeight
    let selectedIndex = 0

    for (let j = 0; j < weights.length; j++) {
      random -= weights[j]
      if (random <= 0) {
        selectedIndex = j
        break
      }
    }

    selected.push(remaining[selectedIndex])
    remaining.splice(selectedIndex, 1)
  }

  return selected
}

function applySpecialTiles(tiles: Map<string, Tile>, config: SpecialTileConfig, adjacencyRule: 'standard' | 'manhattan-2' = 'standard'): void {

  // Handle coordinate array placement
  if (Array.isArray(config.placement)) {
    const positions = config.placement.map(([x, y]) => createPosition(x, y))

    // Get tiles at the specified positions, filtering out conflicts
    const eligibleTiles = positions
      .map(pos => getTile({ tiles, width: 0, height: 0 } as Board, pos))
      .filter((tile): tile is Tile => {
        if (!tile) return false

        // Surface mines cannot be placed on goblins, and vice versa
        if (config.type === 'surfaceMine' && hasSpecialTile(tile, 'goblin')) {
          return false
        }
        if (config.type === 'goblin' && hasSpecialTile(tile, 'surfaceMine')) {
          return false
        }

        return true
      })

    const count = Math.min(config.count, eligibleTiles.length)

    // Use weighted selection for extraDirty, uniform random for others
    const selectedTiles = config.type === 'extraDirty'
      ? selectWithLairWeighting(eligibleTiles, count, tiles, adjacencyRule)
      : eligibleTiles.sort(() => Math.random() - 0.5).slice(0, count)

    // Apply to selected tiles
    for (const tile of selectedTiles) {
      const key = positionToKey(tile.position)
      tiles.set(key, addSpecialTile(tile, config.type))
    }

    return
  }

  // Original logic for non-coordinate placements
  const eligibleTiles = Array.from(tiles.values()).filter(tile => {
    // Special case for lairs: only on empty tiles
    if (config.placement === 'empty') {
      return tile.owner === 'empty' && !tile.revealed
    }

    // Skip empty tiles and already revealed tiles for normal placements
    if (tile.owner === 'empty' || tile.revealed) return false

    // Surface mines cannot be placed on goblins, and vice versa
    if (config.type === 'surfaceMine' && hasSpecialTile(tile, 'goblin')) {
      return false
    }
    if (config.type === 'goblin' && hasSpecialTile(tile, 'surfaceMine')) {
      return false
    }

    // Filter by placement rules
    if (config.placement === 'random') {
      return true
    } else if (config.placement === 'nonmine') {
      return tile.owner !== 'mine'
    } else if (config.placement === 'playerOrNeutral') {
      return tile.owner === 'player' || tile.owner === 'neutral'
    } else if (typeof config.placement === 'object' && 'owner' in config.placement) {
      return config.placement.owner.includes(tile.owner as any)
    }

    return false
  })

  const count = Math.min(config.count, eligibleTiles.length)

  // Use weighted selection for extraDirty, uniform random for others
  const selectedTiles = config.type === 'extraDirty'
    ? selectWithLairWeighting(eligibleTiles, count, tiles, adjacencyRule)
    : eligibleTiles.sort(() => Math.random() - 0.5).slice(0, count)

  // Apply special tile type to selected tiles
  for (const tile of selectedTiles) {
    const key = positionToKey(tile.position)
    tiles.set(key, addSpecialTile(tile, config.type))
  }

}

export function getTile(board: Board, position: Position): Tile | undefined {
  return board.tiles.get(positionToKey(position))
}

/**
 * Check if a tile is "saturated" (adjacency count satisfied by revealed neighbors)
 * and if so, whether it rules out the target tile as not-player
 */
export function isTileRuledOutBySaturatedNeighbor(board: Board, targetPosition: Position): boolean {
  const neighbors = getNeighbors(board, targetPosition)

  for (const neighborPos of neighbors) {
    const neighbor = getTile(board, neighborPos)
    if (!neighbor || !neighbor.revealed || neighbor.adjacencyCount === null || !neighbor.revealedBy) continue

    // Check if this revealed tile is "saturated"
    const neighborNeighbors = getNeighbors(board, neighborPos)

    // Count revealed neighbors that match the revealer's owner type
    const targetOwner = neighbor.revealedBy // 'player' or 'rival'
    let revealedMatchingCount = 0

    for (const nnPos of neighborNeighbors) {
      const nn = getTile(board, nnPos)
      if (nn && nn.revealed && nn.owner === targetOwner) {
        revealedMatchingCount++
      }
    }

    const isSaturated = revealedMatchingCount === neighbor.adjacencyCount

    if (!isSaturated) continue

    // This neighbor is saturated. Check if it rules out the target tile as not-player.
    // The target tile would be ruled out if:
    // - The saturated tile was revealed by 'player' and has all player neighbors accounted for
    // - The target tile is one of those neighbors
    // - Therefore the target tile cannot be a player tile

    const isTargetInNeighbors = neighborNeighbors.some(nnPos =>
      nnPos.x === targetPosition.x && nnPos.y === targetPosition.y
    )

    if (!isTargetInNeighbors) continue

    // Target is a neighbor of this saturated tile
    // If this is a player-revealed tile and all player neighbors are accounted for, target cannot be player
    if (neighbor.revealedBy === 'player') {
      // All player tiles in this neighborhood are accounted for
      // Target tile (unrevealed) cannot be player
      return true
    }
  }

  return false
}

export function clearSpecialTileState(tile: Tile): Tile {
  // Legacy function - now clears ALL special tiles
  return clearAllSpecialTiles(tile)
}

export function calculateAdjacency(board: Board, position: Position, revealedBy: 'player' | 'rival'): number {
  const neighbors = getNeighbors(board, position)
  let count = 0

  // Count adjacent tiles that belong to the revealer's team
  const targetOwner = revealedBy // 'player' or 'rival'


  for (const neighborPos of neighbors) {
    const neighbor = getTile(board, neighborPos)
    if (neighbor && neighbor.owner === targetOwner) {
      count++
    } else if (neighbor) {
    }
  }


  return count
}

export interface RevealResult {
  board: Board
  revealed: boolean  // true if tile was revealed, false if extraDirty was just cleaned
}

export function revealTileWithResult(board: Board, position: Position, revealedBy: 'player' | 'rival'): RevealResult {
  const key = positionToKey(position)
  const tile = board.tiles.get(key)


  if (!tile || tile.revealed || tile.owner === 'empty') {
    return { board, revealed: false }
  }

  // Handle goblin tiles - they move when attempted to be revealed
  if (hasSpecialTile(tile, 'goblin')) {
    const { board: boardAfterGoblinMove } = cleanGoblin(board, position)
    return {
      board: boardAfterGoblinMove,
      revealed: false  // Tile was not revealed, goblin was cleaned/moved
    }
  }

  // Handle extraDirty tiles when revealed by player
  if (hasSpecialTile(tile, 'extraDirty') && revealedBy === 'player') {
    // Clear the dirty state but don't reveal the tile
    const newTiles = new Map(board.tiles)
    const cleanedTile = removeSpecialTile(tile, 'extraDirty')
    newTiles.set(key, cleanedTile)

    return {
      board: {
        ...board,
        tiles: newTiles
      },
      revealed: false  // Tile was not revealed, just cleaned
    }
  }
  
  const adjacencyCount = calculateAdjacency(board, position, revealedBy)

  const newTiles = new Map(board.tiles)
  // Clear special tile state when revealing (enemies can reveal dirty tiles normally)
  // EXCEPT sanctums - they persist through reveal and only disappear when destroyed
  const specialTilesToKeep = tile.specialTiles.filter(st => st === 'sanctum')
  const revealedTile: Tile = {
    ...tile,
    revealed: true,
    revealedBy,
    adjacencyCount,
    specialTiles: specialTilesToKeep // Keep sanctums, clear others (dirty, goblin, etc.)
  }
  
  newTiles.set(key, revealedTile)
  
  return {
    board: {
      ...board,
      tiles: newTiles
    },
    revealed: true
  }
}

export function revealTile(board: Board, position: Position, revealedBy: 'player' | 'rival'): Board {
  return revealTileWithResult(board, position, revealedBy).board
}

// Returns physically nearby tiles (spatial adjacency only, ignoring sanctum rules)
// This is used primarily for sanctum setup to identify which tiles are spatially near each other
export function getNearbyTiles(board: Board, position: Position): Position[] {
  const neighbors: Position[] = []

  if (board.adjacencyRule === 'manhattan-2') {
    // Manhattan distance 2: all tiles within Manhattan distance 2
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        if (dx === 0 && dy === 0) continue // Skip center position

        // Check if Manhattan distance is <= 2
        const manhattanDistance = Math.abs(dx) + Math.abs(dy)
        if (manhattanDistance > 2) continue

        const neighborPos = {
          x: position.x + dx,
          y: position.y + dy
        }

        // Check bounds
        if (neighborPos.x >= 0 && neighborPos.x < board.width &&
            neighborPos.y >= 0 && neighborPos.y < board.height) {
          neighbors.push(neighborPos)
        }
      }
    }
  } else {
    // Standard adjacency: 8 surrounding tiles (3x3 grid minus center)
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue // Skip center position

        const neighborPos = {
          x: position.x + dx,
          y: position.y + dy
        }

        // Check bounds
        if (neighborPos.x >= 0 && neighborPos.x < board.width &&
            neighborPos.y >= 0 && neighborPos.y < board.height) {
          neighbors.push(neighborPos)
        }
      }
    }
  }

  return neighbors
}

// Returns game neighbors (respecting sanctum portal rules)
// This is the primary neighbor function used by all game mechanics, adjacency calculations, etc.
// IMPORTANT: This function maintains symmetry - if A is a neighbor of B, then B is a neighbor of A
export function getNeighbors(board: Board, position: Position): Position[] {
  const tile = getTile(board, position)
  if (!tile) return []

  const neighbors: Position[] = []
  const nearbyTiles = getNearbyTiles(board, position)

  // Case 1: Current tile is an inner tile
  if (tile.innerTile && tile.connectedSanctums && tile.connectedSanctums.length > 0) {
    // Inner tiles ONLY connect to their connected sanctums
    for (const sanctumPos of tile.connectedSanctums) {
      if (getTile(board, sanctumPos)) {
        neighbors.push(sanctumPos)
      }
    }

    // Manhattan-2 portal bonus: if orthogonally adjacent to a connected sanctum,
    // also neighbor all tiles orthogonally adjacent to that sanctum
    if (board.adjacencyRule === 'manhattan-2') {
      for (const sanctumPos of tile.connectedSanctums) {
        if (isOrthogonallyAdjacent(position, sanctumPos)) {
          const tilesNearSanctum = getNearbyTiles(board, sanctumPos).filter(pos =>
            isOrthogonallyAdjacent(pos, sanctumPos) &&
            !(pos.x === position.x && pos.y === position.y) // Exclude self
          )
          neighbors.push(...tilesNearSanctum)
        }
      }
    }
  } else {
    // Case 2: Current tile is NOT an inner tile (regular tile or sanctum)
    // Check each physically nearby tile
    for (const nearbyPos of nearbyTiles) {
      const nearbyTile = getTile(board, nearbyPos)
      if (!nearbyTile) continue

      // If nearby tile is inner, only include if current position is one of its sanctums
      if (nearbyTile.innerTile && nearbyTile.connectedSanctums && nearbyTile.connectedSanctums.length > 0) {
        const isConnectedSanctum = nearbyTile.connectedSanctums.some(s =>
          s.x === position.x && s.y === position.y
        )
        if (isConnectedSanctum) {
          neighbors.push(nearbyPos)
        }
      } else {
        // Nearby tile is regular (not inner), include it
        neighbors.push(nearbyPos)
      }
    }

    // Manhattan-2 portal bonus: if current tile is orthogonally adjacent to a sanctum,
    // add inner tiles that are connected to and orthogonally adjacent to that sanctum
    // This maintains symmetry with the inner tile's portal bonus above
    if (board.adjacencyRule === 'manhattan-2') {
      const nearbySanctums = nearbyTiles.filter(pos => {
        const t = getTile(board, pos)
        return t && t.specialTiles.includes('sanctum') && isOrthogonallyAdjacent(position, pos)
      })

      for (const sanctumPos of nearbySanctums) {
        // Find inner tiles connected to this sanctum and orthogonally adjacent to it
        const innerTilesNearSanctum = getNearbyTiles(board, sanctumPos).filter(pos => {
          if (pos.x === position.x && pos.y === position.y) return false // Skip self
          const t = getTile(board, pos)
          if (!t || !t.innerTile || !t.connectedSanctums) return false

          const isConnected = t.connectedSanctums.some(s => s.x === sanctumPos.x && s.y === sanctumPos.y)
          const isOrtho = isOrthogonallyAdjacent(pos, sanctumPos)
          return isConnected && isOrtho
        })

        neighbors.push(...innerTilesNearSanctum)
      }
    }
  }

  // Remove duplicates
  const uniqueKeys = new Set(neighbors.map(positionToKey))
  return Array.from(uniqueKeys).map(keyToPosition)
}

export function isValidPosition(board: Board, position: Position): boolean {
  return position.x >= 0 && position.x < board.width &&
         position.y >= 0 && position.y < board.height
}

export function getUnrevealedCounts(board: Board): Record<'player' | 'rival' | 'neutral' | 'mine', number> {
  const counts = { player: 0, rival: 0, neutral: 0, mine: 0 }
  
  for (const tile of board.tiles.values()) {
    if (!tile.revealed && tile.owner !== 'empty') {
      counts[tile.owner as keyof typeof counts]++
    }
  }
  
  return counts
}

export function getUnrevealedRivalTiles(board: Board): Tile[] {
  const rivalTiles: Tile[] = []
  
  for (const tile of board.tiles.values()) {
    if (!tile.revealed && tile.owner === 'rival') {
      rivalTiles.push(tile)
    }
  }
  
  return rivalTiles
}

export function performRivalTurn(board: Board): Board {
  // This function is now deprecated - the store handles rival turns with animation
  // Keeping it for backward compatibility but it should not be used for the new AI system
  return board
}

export function shouldEndPlayerTurn(tile: Tile): boolean {
  // Player turn ends if they reveal a tile that's not theirs
  return tile.owner !== 'player'
}

/**
 * Centralized function to determine if revealing a tile should end the player's turn
 * Takes into account all game state including equipment like Frilly Dress
 */
export function shouldRevealEndTurn(state: GameState, tile: Tile): boolean {
  // Check if tile would normally end turn
  if (!shouldEndPlayerTurn(tile)) {
    return false // Player tile, never ends turn
  }

  // Check for Frilly Dress effect: neutral reveals on first turn with 4-neutral limit
  const hasFrillyDress = state.equipment.some(r => r.name === 'Frilly Dress')
  if (hasFrillyDress && state.isFirstTurn && tile.owner === 'neutral') {
    // Tea equipment removes the 4 neutral limit
    const hasTea = state.equipment.some(r => r.name === 'Tea')
    const withinLimit = hasTea || state.neutralsRevealedThisTurn <= 4

    if (withinLimit) {
      return false // Frilly Dress prevents turn ending (still within 4-neutral limit)
    }
    // If we've already revealed 4+ neutrals, turn should end
  }

  // Otherwise, turn should end
  return true
}

/**
 * Move goblin from one tile to an adjacent unrevealed tile, or remove it if no valid target
 * Returns updated board with goblin moved/removed
 */
export function moveGoblin(board: Board, fromPosition: Position): Board {
  const neighbors = getNeighbors(board, fromPosition)

  // Find all unrevealed adjacent tiles that don't already have goblins
  const unrevealedNeighbors = neighbors
    .map(pos => ({ pos, tile: getTile(board, pos) }))
    .filter(({ tile }) =>
      tile &&
      !tile.revealed &&
      tile.owner !== 'empty' &&
      !hasSpecialTile(tile, 'goblin') // Don't move onto tiles that already have goblins
    )

  if (unrevealedNeighbors.length === 0) {
    // No place to move, goblin disappears
    return board
  }

  // Separate into non-mine and mine tiles
  const nonMineTiles = unrevealedNeighbors.filter(({ tile }) => tile!.owner !== 'mine')
  const mineTiles = unrevealedNeighbors.filter(({ tile }) => tile!.owner === 'mine')

  // Prefer non-mine tiles if available, otherwise move to mine
  const targetOptions = nonMineTiles.length > 0 ? nonMineTiles : mineTiles

  // Pick random target
  const randomIndex = Math.floor(Math.random() * targetOptions.length)
  const targetPos = targetOptions[randomIndex].pos
  const targetTile = getTile(board, targetPos)!


  // Check if target is a surface mine
  if (hasSpecialTile(targetTile, 'surfaceMine')) {

    // Explode the surface mine (mark as destroyed, goblin disappears)
    // Use destroyTile to properly update adjacency info and annotations
    return destroyTile(board, targetPos)
  }

  // Normal goblin movement (no surface mine)
  const newTiles = new Map(board.tiles)
  newTiles.set(positionToKey(targetPos), addSpecialTile(targetTile, 'goblin'))

  return {
    ...board,
    tiles: newTiles
  }
}

/**
 * Move a goblin from a tile to an adjacent unrevealed tile and mark it as cleaned this turn
 * Used by cleanGoblin to track Mop equipment effect
 */
export function moveGoblinWithCleanedFlag(board: Board, fromPosition: Position): Board {
  const neighbors = getNeighbors(board, fromPosition)

  // Find all unrevealed adjacent tiles that don't already have goblins
  const unrevealedNeighbors = neighbors
    .map(pos => ({ pos, tile: getTile(board, pos) }))
    .filter(({ tile }) =>
      tile &&
      !tile.revealed &&
      tile.owner !== 'empty' &&
      !hasSpecialTile(tile, 'goblin') // Don't move onto tiles that already have goblins
    )

  if (unrevealedNeighbors.length === 0) {
    // No place to move, goblin disappears
    return board
  }

  // Separate into non-mine and mine tiles
  const nonMineTiles = unrevealedNeighbors.filter(({ tile }) => tile!.owner !== 'mine')
  const mineTiles = unrevealedNeighbors.filter(({ tile }) => tile!.owner === 'mine')

  // Prefer non-mine tiles if available, otherwise move to mine
  const targetOptions = nonMineTiles.length > 0 ? nonMineTiles : mineTiles

  // Pick random target
  const randomIndex = Math.floor(Math.random() * targetOptions.length)
  const targetPos = targetOptions[randomIndex].pos
  const targetTile = getTile(board, targetPos)!


  // Check if target is a surface mine
  if (hasSpecialTile(targetTile, 'surfaceMine')) {

    // Explode the surface mine (mark as destroyed, goblin disappears)
    // Use destroyTile to properly update adjacency info and annotations
    return destroyTile(board, targetPos)
  }

  // Normal goblin movement (no surface mine) - mark goblin as cleaned this turn
  const newTiles = new Map(board.tiles)
  const tileWithGoblin = addSpecialTile(targetTile, 'goblin')
  newTiles.set(positionToKey(targetPos), {
    ...tileWithGoblin,
    goblinState: { cleanedThisTurn: true }
  })

  return {
    ...board,
    tiles: newTiles
  }
}

/**
 * Clean a goblin from a tile (without revealing), and move it to adjacent tile if possible
 * Returns updated board, whether goblin was cleaned, and whether it should count for Mop
 */
export function cleanGoblin(board: Board, position: Position): { board: Board; goblinCleaned: boolean; countsForMop: boolean } {
  const tile = getTile(board, position)

  if (!tile || !hasSpecialTile(tile, 'goblin')) {
    return { board, goblinCleaned: false, countsForMop: false }
  }

  // Check if this goblin was already cleaned this turn (for Mop equipment tracking)
  const alreadyCleanedThisTurn = tile.goblinState?.cleanedThisTurn || false

  // Remove goblin from this tile (keep other special tiles like extraDirty)
  const newTiles = new Map(board.tiles)
  const cleanedTile = removeSpecialTile(tile, 'goblin')
  newTiles.set(positionToKey(position), cleanedTile)

  const boardWithCleanedTile = {
    ...board,
    tiles: newTiles
  }

  // Move goblin to adjacent tile and mark it as cleaned this turn
  const finalBoard = moveGoblinWithCleanedFlag(boardWithCleanedTile, position)

  return { board: finalBoard, goblinCleaned: true, countsForMop: !alreadyCleanedThisTurn }
}

/**
 * Spawn goblins from all lairs on the board (called after rival turn)
 * Each lair spawns a goblin in a random unrevealed non-mine non-goblin adjacent tile
 * Returns updated board with goblins spawned
 */
export function spawnGoblinsFromLairs(board: Board): Board {
  // Find all tiles with lairs
  const lairTiles = Array.from(board.tiles.values()).filter(tile =>
    hasSpecialTile(tile, 'lair')
  )

  if (lairTiles.length === 0) {
    return board
  }


  let currentBoard = board

  for (const lairTile of lairTiles) {
    const neighbors = getNeighbors(currentBoard, lairTile.position)

    // Priority 1: Unrevealed non-mined tiles WITHOUT surface mines
    const priority1 = neighbors
      .map(pos => ({ pos, tile: getTile(currentBoard, pos) }))
      .filter((entry): entry is { pos: Position; tile: Tile } =>
        entry.tile !== undefined &&
        !entry.tile.revealed &&
        entry.tile.owner !== 'empty' &&
        entry.tile.owner !== 'mine' &&
        !hasSpecialTile(entry.tile, 'goblin') &&
        !hasSpecialTile(entry.tile, 'surfaceMine')
      )

    // Priority 2: Unrevealed mined tiles WITHOUT surface mines
    const priority2 = neighbors
      .map(pos => ({ pos, tile: getTile(currentBoard, pos) }))
      .filter((entry): entry is { pos: Position; tile: Tile } =>
        entry.tile !== undefined &&
        !entry.tile.revealed &&
        entry.tile.owner === 'mine' &&
        !hasSpecialTile(entry.tile, 'goblin') &&
        !hasSpecialTile(entry.tile, 'surfaceMine')
      )

    // Priority 3: Unrevealed non-mined tiles WITH surface mines (will explode)
    const priority3 = neighbors
      .map(pos => ({ pos, tile: getTile(currentBoard, pos) }))
      .filter((entry): entry is { pos: Position; tile: Tile } =>
        entry.tile !== undefined &&
        !entry.tile.revealed &&
        entry.tile.owner !== 'empty' &&
        entry.tile.owner !== 'mine' &&
        !hasSpecialTile(entry.tile, 'goblin') &&
        hasSpecialTile(entry.tile, 'surfaceMine')
      )

    // Priority 4: Unrevealed mined tiles WITH surface mines (will explode)
    const priority4 = neighbors
      .map(pos => ({ pos, tile: getTile(currentBoard, pos) }))
      .filter((entry): entry is { pos: Position; tile: Tile } =>
        entry.tile !== undefined &&
        !entry.tile.revealed &&
        entry.tile.owner === 'mine' &&
        !hasSpecialTile(entry.tile, 'goblin') &&
        hasSpecialTile(entry.tile, 'surfaceMine')
      )

    // Select targets by priority
    let validSpawnTargets: Array<{ pos: Position; tile: Tile }>
    if (priority1.length > 0) {
      validSpawnTargets = priority1
    } else if (priority2.length > 0) {
      validSpawnTargets = priority2
    } else if (priority3.length > 0) {
      validSpawnTargets = priority3
    } else if (priority4.length > 0) {
      validSpawnTargets = priority4
    } else {
      // No valid targets
      continue
    }

    // Pick random target
    const randomIndex = Math.floor(Math.random() * validSpawnTargets.length)
    const targetPos = validSpawnTargets[randomIndex].pos
    const targetTile = getTile(currentBoard, targetPos)!

    // Check if spawning on a surface mine - if so, explode it immediately
    if (hasSpecialTile(targetTile, 'surfaceMine')) {
      // Explode the surface mine (mark as destroyed, goblin doesn't spawn)
      // Use destroyTile to properly update adjacency info and annotations
      currentBoard = destroyTile(currentBoard, targetPos)
    } else {
      // Normal spawn (no surface mine)
      const newTiles = new Map(currentBoard.tiles)
      const updatedTile = addSpecialTile(targetTile, 'goblin')
      newTiles.set(positionToKey(targetPos), updatedTile)

      currentBoard = {
        ...currentBoard,
        tiles: newTiles
      }
    }
  }

  return currentBoard
}

/**
 * Place surface mines on random unrevealed non-rival tiles (called after rival turn)
 * Returns updated board with surface mines placed
 */
export function placeRivalSurfaceMines(board: Board, count: number): Board {
  if (count <= 0) {
    return board
  }


  // Find all unrevealed non-rival tiles without surface mines or goblins
  const validTargets = Array.from(board.tiles.values()).filter(tile =>
    !tile.revealed &&
    tile.owner !== 'empty' &&
    tile.owner !== 'rival' &&
    !hasSpecialTile(tile, 'surfaceMine') &&
    !hasSpecialTile(tile, 'goblin')
  )


  if (validTargets.length === 0) {
    return board
  }

  // Shuffle valid targets
  for (let i = validTargets.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [validTargets[i], validTargets[j]] = [validTargets[j], validTargets[i]]
  }

  // Place surface mines on the first N tiles
  const tilesToPlace = Math.min(count, validTargets.length)
  const newTiles = new Map(board.tiles)

  for (let i = 0; i < tilesToPlace; i++) {
    const targetTile = validTargets[i]
    const updatedTile = addSpecialTile(targetTile, 'surfaceMine')
    newTiles.set(positionToKey(targetTile.position), updatedTile)
  }

  return {
    ...board,
    tiles: newTiles
  }
}