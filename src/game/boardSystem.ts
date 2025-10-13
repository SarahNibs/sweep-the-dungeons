import { Board, Tile, Position } from '../types'

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

export function createTile(position: Position, owner: Tile['owner'], specialTile?: 'extraDirty'): Tile {
  return {
    position,
    owner,
    revealed: false,
    revealedBy: null,
    adjacencyCount: null,
    annotations: [],
    ...(specialTile && { specialTile })
  }
}

export interface SpecialTileConfig {
  type: 'extraDirty' | 'goblin'
  count: number
  placement: 'random' | 'nonmine' | { owner: Array<'player' | 'rival' | 'neutral' | 'mine'> }
}

export function createBoard(
  width: number = 6, 
  height: number = 5,
  tileCounts: { player: number; rival: number; neutral: number; mine: number } = {
    player: 12, rival: 10, neutral: 7, mine: 1
  },
  unusedLocations: number[][] = [],
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
  
  // Convert unusedLocations to Set of position keys for fast lookup
  const unusedPositions = new Set(
    unusedLocations.map(([x, y]) => positionToKey({ x, y }))
  )
  
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
  console.log(`🎯 APPLYING SPECIAL TILES: type=${config.type}, count=${config.count}, placement=${JSON.stringify(config.placement)}`)

  const eligibleTiles = Array.from(tiles.values()).filter(tile => {
    // Skip empty tiles and already revealed tiles
    if (tile.owner === 'empty' || tile.revealed) return false

    // Filter by placement rules
    if (config.placement === 'random') {
      return true
    } else if (config.placement === 'nonmine') {
      return tile.owner !== 'mine'
    } else {
      return config.placement.owner.includes(tile.owner as any)
    }
  })

  console.log(`  - Found ${eligibleTiles.length} eligible tiles`)

  // Shuffle eligible tiles
  for (let i = eligibleTiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [eligibleTiles[i], eligibleTiles[j]] = [eligibleTiles[j], eligibleTiles[i]]
  }

  // Apply special tile type to the requested count
  const count = Math.min(config.count, eligibleTiles.length)
  console.log(`  - Applying to ${count} tiles`)

  for (let i = 0; i < count; i++) {
    const tile = eligibleTiles[i]
    const key = positionToKey(tile.position)
    console.log(`    - Setting ${config.type} at position (${tile.position.x}, ${tile.position.y})`)
    tiles.set(key, {
      ...tile,
      specialTile: config.type
    })
  }

  console.log(`✅ APPLIED ${count} ${config.type} tiles`)
}

export function getTile(board: Board, position: Position): Tile | undefined {
  return board.tiles.get(positionToKey(position))
}

export function clearSpecialTileState(tile: Tile): Tile {
  const { specialTile, ...cleanTile } = tile
  return cleanTile
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
  if (tile.specialTile === 'goblin') {
    const { board: boardAfterGoblinMove } = cleanGoblin(board, position)
    return {
      board: boardAfterGoblinMove,
      revealed: false  // Tile was not revealed, goblin was cleaned/moved
    }
  }

  // Handle extraDirty tiles when revealed by player
  if (tile.specialTile === 'extraDirty' && revealedBy === 'player') {
    // Clear the dirty state but don't reveal the tile
    const newTiles = new Map(board.tiles)
    const cleanedTile = clearSpecialTileState(tile)
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
  const revealedTile: Tile = {
    ...tile,
    revealed: true,
    revealedBy,
    adjacencyCount,
    // Clear special tile state when revealing (enemies can reveal dirty tiles normally)
    ...(tile.specialTile && { specialTile: undefined })
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
 * Move goblin from one tile to an adjacent unrevealed tile, or remove it if no valid target
 * Returns updated board with goblin moved/removed
 */
export function moveGoblin(board: Board, fromPosition: Position): Board {
  const neighbors = getNeighbors(board, fromPosition)

  // Find all unrevealed adjacent tiles
  const unrevealedNeighbors = neighbors
    .map(pos => ({ pos, tile: getTile(board, pos) }))
    .filter(({ tile }) => tile && !tile.revealed && tile.owner !== 'empty')

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

  // Move goblin to target tile
  const newTiles = new Map(board.tiles)
  newTiles.set(positionToKey(targetPos), {
    ...targetTile,
    specialTile: 'goblin'
  })

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

  if (!tile || tile.specialTile !== 'goblin') {
    return { board, goblinCleaned: false }
  }

  // Remove goblin from this tile
  const newTiles = new Map(board.tiles)
  const cleanedTile = clearSpecialTileState(tile)
  newTiles.set(positionToKey(position), cleanedTile)

  const boardWithCleanedTile = {
    ...board,
    tiles: newTiles
  }

  // Move goblin to adjacent tile
  const finalBoard = moveGoblin(boardWithCleanedTile, position)

  return { board: finalBoard, goblinCleaned: true }
}