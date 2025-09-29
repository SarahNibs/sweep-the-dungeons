import { describe, it, expect } from 'vitest'
import { 
  createPosition, 
  positionToKey, 
  keyToPosition, 
  createTile, 
  createBoard, 
  getTile, 
  revealTile, 
  getNeighbors,
  isValidPosition,
  calculateAdjacency
} from './boardSystem'
import { Board } from '../types'

describe('Board System', () => {
  describe('Position utilities', () => {
    it('creates position correctly', () => {
      const pos = createPosition(2, 3)
      expect(pos.x).toBe(2)
      expect(pos.y).toBe(3)
    })

    it('converts position to key', () => {
      const pos = createPosition(2, 3)
      expect(positionToKey(pos)).toBe('2,3')
    })

    it('converts key to position', () => {
      const pos = keyToPosition('2,3')
      expect(pos.x).toBe(2)
      expect(pos.y).toBe(3)
    })
  })

  describe('Tile creation', () => {
    it('creates tile with correct properties', () => {
      const position = createPosition(1, 2)
      const tile = createTile(position, 'player')
      
      expect(tile.position).toEqual(position)
      expect(tile.owner).toBe('player')
      expect(tile.revealed).toBe(false)
      expect(tile.revealedBy).toBe(null)
      expect(tile.adjacencyCount).toBe(null)
    })
  })

  describe('Board creation', () => {
    it('creates board with default size', () => {
      const board = createBoard()
      expect(board.width).toBe(6)
      expect(board.height).toBe(5)
      expect(board.tiles.size).toBe(30) // 6 * 5
    })

    it('creates board with custom size', () => {
      const board = createBoard(4, 3)
      expect(board.width).toBe(4)
      expect(board.height).toBe(3)
      expect(board.tiles.size).toBe(12) // 4 * 3
    })

    it('creates tiles for all positions', () => {
      const board = createBoard(3, 2)
      
      for (let y = 0; y < 2; y++) {
        for (let x = 0; x < 3; x++) {
          const key = positionToKey(createPosition(x, y))
          const tile = board.tiles.get(key)
          expect(tile).toBeDefined()
          expect(tile?.position.x).toBe(x)
          expect(tile?.position.y).toBe(y)
        }
      }
    })
  })

  describe('Board operations', () => {
    it('gets tile by position', () => {
      const board = createBoard(3, 3)
      const position = createPosition(1, 1)
      const tile = getTile(board, position)
      
      expect(tile).toBeDefined()
      expect(tile?.position).toEqual(position)
    })

    it('returns undefined for invalid position', () => {
      const board = createBoard(3, 3)
      const invalidPos = createPosition(5, 5)
      const tile = getTile(board, invalidPos)
      
      expect(tile).toBeUndefined()
    })

    it('reveals tile correctly', () => {
      const board = createBoard(3, 3)
      const position = createPosition(1, 1)
      
      const newBoard = revealTile(board, position, 'player')
      const revealedTile = getTile(newBoard, position)
      
      expect(revealedTile?.revealed).toBe(true)
      expect(revealedTile?.revealedBy).toBe('player')
      expect(revealedTile?.adjacencyCount).toBeGreaterThanOrEqual(0)
    })

    it('does not modify original board when revealing', () => {
      const board = createBoard(3, 3)
      const position = createPosition(1, 1)
      const originalTile = getTile(board, position)
      
      revealTile(board, position, 'player')
      
      // Original tile should be unchanged
      expect(originalTile?.revealed).toBe(false)
      expect(originalTile?.revealedBy).toBe(null)
    })

    it('does not reveal already revealed tile', () => {
      const board = createBoard(3, 3)
      const position = createPosition(1, 1)
      
      const firstReveal = revealTile(board, position, 'player')
      const secondReveal = revealTile(firstReveal, position, 'rival')
      
      const tile = getTile(secondReveal, position)
      expect(tile?.revealedBy).toBe('player') // Should still be first revealer
    })
  })

  describe('Neighbor calculation', () => {
    it('gets all 8 neighbors for center tile', () => {
      const board = createBoard(5, 5)
      const center = createPosition(2, 2)
      const neighbors = getNeighbors(board, center)
      
      expect(neighbors).toHaveLength(8)
      
      const expectedNeighbors = [
        { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 },
        { x: 1, y: 2 },                 { x: 3, y: 2 },
        { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 3 }
      ]
      
      expectedNeighbors.forEach(expectedPos => {
        expect(neighbors).toContainEqual(expectedPos)
      })
    })

    it('gets fewer neighbors for corner tile', () => {
      const board = createBoard(5, 5)
      const corner = createPosition(0, 0)
      const neighbors = getNeighbors(board, corner)
      
      expect(neighbors).toHaveLength(3)
      expect(neighbors).toContainEqual({ x: 1, y: 0 })
      expect(neighbors).toContainEqual({ x: 0, y: 1 })
      expect(neighbors).toContainEqual({ x: 1, y: 1 })
    })

    it('gets fewer neighbors for edge tile', () => {
      const board = createBoard(5, 5)
      const edge = createPosition(2, 0)
      const neighbors = getNeighbors(board, edge)
      
      expect(neighbors).toHaveLength(5)
    })
  })

  describe('Position validation', () => {
    it('validates positions within bounds', () => {
      const board = createBoard(3, 4)
      
      expect(isValidPosition(board, { x: 0, y: 0 })).toBe(true)
      expect(isValidPosition(board, { x: 2, y: 3 })).toBe(true)
      expect(isValidPosition(board, { x: 1, y: 2 })).toBe(true)
    })

    it('rejects positions outside bounds', () => {
      const board = createBoard(3, 4)
      
      expect(isValidPosition(board, { x: -1, y: 0 })).toBe(false)
      expect(isValidPosition(board, { x: 3, y: 0 })).toBe(false)
      expect(isValidPosition(board, { x: 0, y: -1 })).toBe(false)
      expect(isValidPosition(board, { x: 0, y: 4 })).toBe(false)
    })
  })

  describe('Adjacency calculation', () => {
    function createTestBoard(): Board {
      // Create a predictable 3x3 board for testing
      const board: Board = {
        width: 3,
        height: 3,
        tiles: new Map()
      }

      // Layout:
      // P E N
      // E P A  
      // N A P
      const layout = [
        ['player', 'rival', 'neutral'],
        ['rival', 'player', 'assassin'],
        ['neutral', 'assassin', 'player']
      ]

      for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
          const position = createPosition(x, y)
          const key = positionToKey(position)
          const owner = layout[y][x] as 'player' | 'rival' | 'neutral' | 'assassin'
          board.tiles.set(key, createTile(position, owner))
        }
      }

      return board
    }

    it('calculates correct adjacency for player reveal', () => {
      const board = createTestBoard()
      
      // Reveal center tile (1,1) which is 'player'
      // Adjacent player tiles: (0,0), (1,2) = 2 player tiles
      const adjacency = calculateAdjacency(board, createPosition(1, 1), 'player')
      expect(adjacency).toBe(2)
    })

    it('calculates correct adjacency for rival reveal', () => {
      const board = createTestBoard()
      
      // Reveal rival tile at (1,0)
      // Adjacent rival tiles: (0,1) = 1 rival tile
      const adjacency = calculateAdjacency(board, createPosition(1, 0), 'rival')
      expect(adjacency).toBe(1)
    })

    it('calculates adjacency across mixed tile types', () => {
      const board = createTestBoard()
      
      // Reveal tile at (2,0) with player revealer
      // Adjacent player tiles: (1,1) = 1 player tile
      const adjacency = calculateAdjacency(board, createPosition(2, 0), 'player')
      expect(adjacency).toBe(1)
    })

    it('handles corner position adjacency', () => {
      const board = createTestBoard()
      
      // Reveal corner player tile at (0,0)
      // Adjacent player tiles: (1,1) = 1 player tile
      const adjacency = calculateAdjacency(board, createPosition(0, 0), 'player')
      expect(adjacency).toBe(1)
    })

    it('integrates adjacency with tile reveal', () => {
      const board = createTestBoard()
      const position = createPosition(1, 1)
      
      const newBoard = revealTile(board, position, 'player')
      const revealedTile = getTile(newBoard, position)
      
      expect(revealedTile?.adjacencyCount).toBe(2)
      expect(revealedTile?.revealedBy).toBe('player')
    })

    it('calculates different adjacency for different revealers', () => {
      const board = createTestBoard()
      const position = createPosition(1, 1) // This is a player tile
      
      // If player reveals it: counts adjacent player tiles
      const playerReveal = revealTile(board, position, 'player')
      const playerTile = getTile(playerReveal, position)
      
      // If rival revealed it: would count adjacent rival tiles  
      const rivalReveal = revealTile(board, position, 'rival')
      const rivalTile = getTile(rivalReveal, position)
      
      expect(playerTile?.adjacencyCount).toBe(2) // 2 adjacent player tiles
      expect(rivalTile?.adjacencyCount).toBe(2)  // 2 adjacent rival tiles
    })

    it('handles assassin and neutral tiles in adjacency', () => {
      const board = createTestBoard()
      
      // Test adjacency calculation at position with assassin/neutral neighbors
      // Position (2,1) is an assassin tile, but we test with player revealer
      const playerAdjacency = calculateAdjacency(board, createPosition(2, 1), 'player')
      expect(playerAdjacency).toBe(2) // Two adjacent players at (1,1) and (2,2)
    })
  })

  describe('Holes in Grid (Empty Tiles)', () => {
    it('creates empty tiles for unusedLocations', () => {
      const board = createBoard(
        3, 3,
        { player: 2, rival: 2, neutral: 2, mine: 1 },
        [[1, 1]] // Center hole
      )
      
      const centerTile = getTile(board, { x: 1, y: 1 })
      expect(centerTile?.owner).toBe('empty')
      expect(centerTile?.revealed).toBe(false)
    })

    it('empty tiles do not participate in adjacency calculation', () => {
      const board = createBoard(
        3, 3,
        { player: 8, rival: 0, neutral: 0, mine: 0 },
        [[1, 1]] // Center hole - all other tiles are player tiles
      )
      
      // Reveal a corner tile (should count adjacent player tiles, not empty)
      const revealedBoard = revealTile(board, { x: 0, y: 0 }, 'player')
      const cornerTile = getTile(revealedBoard, { x: 0, y: 0 })
      
      // Should count 2 adjacent player tiles (right and down), not the empty center
      expect(cornerTile?.adjacencyCount).toBe(2)
    })

    it('empty tiles cannot be revealed', () => {
      const board = createBoard(
        3, 3,
        { player: 2, rival: 2, neutral: 2, mine: 1 },
        [[1, 1]] // Center hole
      )
      
      const originalBoard = board
      const attemptedRevealBoard = revealTile(board, { x: 1, y: 1 }, 'player')
      
      // Board should be unchanged since empty tiles can't be revealed
      expect(attemptedRevealBoard).toBe(originalBoard)
      
      const centerTile = getTile(attemptedRevealBoard, { x: 1, y: 1 })
      expect(centerTile?.revealed).toBe(false)
    })

    it('creates correct tile counts with holes', () => {
      const board = createBoard(
        3, 3,
        { player: 2, rival: 2, neutral: 2, mine: 1 },
        [[0, 0], [2, 2]] // Two corner holes
      )
      
      const tiles = Array.from(board.tiles.values())
      const emptyTiles = tiles.filter(t => t.owner === 'empty')
      const playerTiles = tiles.filter(t => t.owner === 'player') 
      const rivalTiles = tiles.filter(t => t.owner === 'rival')
      const neutralTiles = tiles.filter(t => t.owner === 'neutral')
      const mineTiles = tiles.filter(t => t.owner === 'mine')
      
      expect(emptyTiles.length).toBe(2)
      expect(playerTiles.length).toBe(2)
      expect(rivalTiles.length).toBe(2)
      expect(neutralTiles.length).toBe(2)
      expect(mineTiles.length).toBe(1)
      expect(tiles.length).toBe(9) // 3x3 grid still has 9 tiles total
    })
  })
})