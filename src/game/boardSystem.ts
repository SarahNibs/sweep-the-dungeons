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

export function createTile(position: Position, owner: Tile['owner']): Tile {
  return {
    position,
    owner,
    revealed: false,
    revealedBy: null,
    adjacencyCount: null,
    annotations: []
  }
}

export function createBoard(width: number = 6, height: number = 5): Board {
  const tiles = new Map<string, Tile>()
  
  // Create exact counts: 12 player, 10 enemy, 7 neutral, 1 mine (30 total)
  const tileTypes: Tile['owner'][] = [
    ...Array(12).fill('player'),
    ...Array(10).fill('enemy'),
    ...Array(7).fill('neutral'),
    ...Array(1).fill('mine')
  ]
  
  // Shuffle the array for random distribution
  for (let i = tileTypes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tileTypes[i], tileTypes[j]] = [tileTypes[j], tileTypes[i]]
  }
  
  // Create tiles with shuffled owners
  let tileIndex = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const position = createPosition(x, y)
      const key = positionToKey(position)
      const owner = tileTypes[tileIndex]
      
      tiles.set(key, createTile(position, owner))
      tileIndex++
    }
  }
  
  return {
    width,
    height,
    tiles
  }
}

export function getTile(board: Board, position: Position): Tile | undefined {
  return board.tiles.get(positionToKey(position))
}

export function calculateAdjacency(board: Board, position: Position, revealedBy: 'player' | 'enemy'): number {
  const neighbors = getNeighbors(board, position)
  let count = 0
  
  // Count adjacent tiles that belong to the revealer's team
  const targetOwner = revealedBy // 'player' or 'enemy'
  
  for (const neighborPos of neighbors) {
    const neighbor = getTile(board, neighborPos)
    if (neighbor && neighbor.owner === targetOwner) {
      count++
    }
  }
  
  return count
}

export function revealTile(board: Board, position: Position, revealedBy: 'player' | 'enemy'): Board {
  const key = positionToKey(position)
  const tile = board.tiles.get(key)
  
  if (!tile || tile.revealed) {
    return board
  }
  
  const adjacencyCount = calculateAdjacency(board, position, revealedBy)
  
  const newTiles = new Map(board.tiles)
  const revealedTile: Tile = {
    ...tile,
    revealed: true,
    revealedBy,
    adjacencyCount
  }
  
  newTiles.set(key, revealedTile)
  
  return {
    ...board,
    tiles: newTiles
  }
}

export function getNeighbors(board: Board, position: Position): Position[] {
  const neighbors: Position[] = []
  
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
  
  return neighbors
}

export function isValidPosition(board: Board, position: Position): boolean {
  return position.x >= 0 && position.x < board.width &&
         position.y >= 0 && position.y < board.height
}

export function getUnrevealedCounts(board: Board): Record<Tile['owner'], number> {
  const counts = { player: 0, enemy: 0, neutral: 0, mine: 0 }
  
  for (const tile of board.tiles.values()) {
    if (!tile.revealed) {
      counts[tile.owner]++
    }
  }
  
  return counts
}

export function getUnrevealedEnemyTiles(board: Board): Tile[] {
  const enemyTiles: Tile[] = []
  
  for (const tile of board.tiles.values()) {
    if (!tile.revealed && tile.owner === 'enemy') {
      enemyTiles.push(tile)
    }
  }
  
  return enemyTiles
}

export function performEnemyTurn(board: Board): Board {
  // This function is now deprecated - the store handles enemy turns with animation
  // Keeping it for backward compatibility but it should not be used for the new AI system
  return board
}

export function shouldEndPlayerTurn(tile: Tile): boolean {
  // Player turn ends if they reveal a tile that's not theirs
  return tile.owner !== 'player'
}