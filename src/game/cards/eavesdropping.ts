import { GameState, Position } from '../../types'
import { getTile, getNeighbors } from '../boardSystem'

export function executeEavesdroppingEffect(state: GameState, target: Position, card?: import('../../types').Card): GameState {
  const targetTile = getTile(state.board, target)
  
  if (!targetTile || targetTile.revealed) {
    // Can't eavesdrop on revealed tiles or empty spaces
    return state
  }
  
  // Get all neighbors of the target tile
  const neighbors = getNeighbors(state.board, target)
  
  // Count adjacent tiles by type
  const adjacencyInfo: { player?: number; neutral?: number; rival?: number; mine?: number } = {}
  
  if (card?.enhanced) {
    // Enhanced version: show all adjacency info
    adjacencyInfo.player = neighbors.filter(neighbor => neighbor.owner === 'player').length
    adjacencyInfo.neutral = neighbors.filter(neighbor => neighbor.owner === 'neutral').length
    adjacencyInfo.rival = neighbors.filter(neighbor => neighbor.owner === 'rival').length
    adjacencyInfo.mine = neighbors.filter(neighbor => neighbor.owner === 'mine').length
  } else {
    // Basic version: only show player adjacency info
    adjacencyInfo.player = neighbors.filter(neighbor => neighbor.owner === 'player').length
  }
  
  // Remove any existing adjacency info annotation
  const existingAnnotations = targetTile.annotations.filter(a => a.type !== 'adjacency_info')
  
  // Add the new adjacency info annotation
  const newAnnotations = [
    ...existingAnnotations,
    {
      type: 'adjacency_info' as const,
      adjacencyInfo
    }
  ]
  
  // Update the tile with the new annotation
  const newTiles = new Map(state.board.tiles)
  newTiles.set(`${target.x},${target.y}`, {
    ...targetTile,
    annotations: newAnnotations
  })
  
  return {
    ...state,
    board: {
      ...state.board,
      tiles: newTiles
    }
  }
}