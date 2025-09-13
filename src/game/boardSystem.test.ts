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
  isValidPosition
} from './boardSystem'

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
      expect(revealedTile?.adjacencyCount).toBe(0) // TODO: Real adjacency calculation
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
      const secondReveal = revealTile(firstReveal, position, 'enemy')
      
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
})