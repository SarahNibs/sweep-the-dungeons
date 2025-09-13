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
    adjacencyCount: null
  }
}

export function createBoard(width: number = 6, height: number = 5): Board {
  const tiles = new Map<string, Tile>()
  
  // Create a simple pattern for now - just random tiles
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const position = createPosition(x, y)
      const key = positionToKey(position)
      
      // Simple random distribution for now
      let owner: Tile['owner']
      const rand = Math.random()
      if (rand < 0.3) {
        owner = 'player'
      } else if (rand < 0.55) {
        owner = 'enemy'
      } else if (rand < 0.8) {
        owner = 'neutral'
      } else {
        owner = 'assassin'
      }
      
      tiles.set(key, createTile(position, owner))
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