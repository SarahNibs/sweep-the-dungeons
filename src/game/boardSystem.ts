import { Board, Tile, Position, GameState } from '../types'

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

export function createTile(position: Position, owner: Tile['owner'], specialTiles?: Array<'extraDirty' | 'goblin' | 'destroyed' | 'lair' | 'surfaceMine'>): Tile {
  return {
    position,
    owner,
    revealed: false,
    revealedBy: null,
    adjacencyCount: null,
    annotations: [],
    specialTiles: specialTiles || [],
    cleanedOnce: false // Initialize cleanedOnce to false for all new tiles
  }
}

// Helper functions for working with specialTiles array
export function hasSpecialTile(tile: Tile, type: 'extraDirty' | 'goblin' | 'destroyed' | 'lair' | 'surfaceMine'): boolean {
  return tile.specialTiles.includes(type)
}

export function addSpecialTile(tile: Tile, type: 'extraDirty' | 'goblin' | 'destroyed' | 'lair' | 'surfaceMine'): Tile {
  if (hasSpecialTile(tile, type)) return tile
  return {
    ...tile,
    specialTiles: [...tile.specialTiles, type]
  }
}

export function removeSpecialTile(tile: Tile, type: 'extraDirty' | 'goblin' | 'destroyed' | 'lair' | 'surfaceMine'): Tile {
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
  type: 'extraDirty' | 'goblin' | 'lair' | 'surfaceMine'
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
  for (const specialTileConfig of specialTiles) {
    applySpecialTiles(tiles, specialTileConfig)
  }
  
  return {
    width,
    height,
    tiles,
    adjacencyRule
  }
}

function applySpecialTiles(tiles: Map<string, Tile>, config: SpecialTileConfig): void {

  // Handle coordinate array placement
  if (Array.isArray(config.placement)) {
    const positions = config.placement.map(([x, y]) => createPosition(x, y))

    // Get tiles at the specified positions
    const eligibleTiles = positions
      .map(pos => getTile({ tiles, width: 0, height: 0 } as Board, pos))
      .filter((tile): tile is Tile => tile !== undefined)


    // Shuffle eligible tiles
    for (let i = eligibleTiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [eligibleTiles[i], eligibleTiles[j]] = [eligibleTiles[j], eligibleTiles[i]]
    }

    // Apply to the first 'count' tiles after shuffling
    const count = Math.min(config.count, eligibleTiles.length)
    for (let i = 0; i < count; i++) {
      const tile = eligibleTiles[i]
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


  // Shuffle eligible tiles
  for (let i = eligibleTiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [eligibleTiles[i], eligibleTiles[j]] = [eligibleTiles[j], eligibleTiles[i]]
  }

  // Apply special tile type to the requested count
  const count = Math.min(config.count, eligibleTiles.length)

  for (let i = 0; i < count; i++) {
    const tile = eligibleTiles[i]
    const key = positionToKey(tile.position)
    tiles.set(key, addSpecialTile(tile, config.type))
  }

}

export function getTile(board: Board, position: Position): Tile | undefined {
  return board.tiles.get(positionToKey(position))
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
  const revealedTile: Tile = {
    ...tile,
    revealed: true,
    revealedBy,
    adjacencyCount,
    specialTiles: [] // Clear all special tiles when revealing
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

export function getNeighbors(board: Board, position: Position): Position[] {
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
    const withinLimit = hasTea || state.neutralsRevealedThisTurn < 4

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
    const newTiles = new Map(board.tiles)
    newTiles.set(positionToKey(targetPos), {
      ...targetTile,
      owner: 'empty',
      specialTiles: ['destroyed']
    })

    return {
      ...board,
      tiles: newTiles
    }
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
 * Clean a goblin from a tile (without revealing), and move it to adjacent tile if possible
 * Returns updated board and whether goblin was cleaned
 */
export function cleanGoblin(board: Board, position: Position): { board: Board; goblinCleaned: boolean } {
  const tile = getTile(board, position)

  if (!tile || !hasSpecialTile(tile, 'goblin')) {
    return { board, goblinCleaned: false }
  }

  // Remove goblin from this tile (keep other special tiles like extraDirty)
  const newTiles = new Map(board.tiles)
  const cleanedTile = removeSpecialTile(tile, 'goblin')
  newTiles.set(positionToKey(position), cleanedTile)

  const boardWithCleanedTile = {
    ...board,
    tiles: newTiles
  }

  // Move goblin to adjacent tile
  const finalBoard = moveGoblin(boardWithCleanedTile, position)

  return { board: finalBoard, goblinCleaned: true }
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

    // Find all unrevealed adjacent tiles that are not mines and don't already have goblins
    const validSpawnTargets = neighbors
      .map(pos => ({ pos, tile: getTile(currentBoard, pos) }))
      .filter(({ tile }) =>
        tile &&
        !tile.revealed &&
        tile.owner !== 'empty' &&
        tile.owner !== 'mine' &&
        !hasSpecialTile(tile, 'goblin')
      )


    // If no valid non-mine targets, try spawning on mines as fallback
    if (validSpawnTargets.length === 0) {
      const mineSpawnTargets = neighbors
        .map(pos => ({ pos, tile: getTile(currentBoard, pos) }))
        .filter(({ tile }) =>
          tile &&
          !tile.revealed &&
          tile.owner === 'mine' &&
          !hasSpecialTile(tile, 'goblin')
        )

      if (mineSpawnTargets.length === 0) {
        continue
      }

      validSpawnTargets.push(...mineSpawnTargets)
    }

    // Pick random target
    const randomIndex = Math.floor(Math.random() * validSpawnTargets.length)
    const targetPos = validSpawnTargets[randomIndex].pos
    const targetTile = getTile(currentBoard, targetPos)!


    // Spawn goblin on target tile
    const newTiles = new Map(currentBoard.tiles)
    const updatedTile = addSpecialTile(targetTile, 'goblin')
    newTiles.set(positionToKey(targetPos), updatedTile)

    currentBoard = {
      ...currentBoard,
      tiles: newTiles
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