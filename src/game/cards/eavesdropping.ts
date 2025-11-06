import { GameState, Position } from '../../types'
import { getTile, getNeighbors } from '../boardSystem'

export function executeEavesdroppingEffect(state: GameState, target: Position, card?: import('../../types').Card): GameState {
  const targetTile = getTile(state.board, target)

  if (!targetTile) {
    // Can't eavesdrop on empty spaces
    return state
  }
  
  // Get all neighbor positions of the target tile
  const neighborPositions = getNeighbors(state.board, target)
  
  // Count adjacent tiles by type
  const adjacencyInfo: { player?: number; neutral?: number; rival?: number; mine?: number } = {}
  
  if (card?.enhanced) {
    // Enhanced version: show all adjacency info
    let playerCount = 0
    let neutralCount = 0
    let rivalCount = 0
    let mineCount = 0
    
    for (const neighborPos of neighborPositions) {
      const neighborTile = getTile(state.board, neighborPos)
      if (neighborTile) {
        switch (neighborTile.owner) {
          case 'player':
            playerCount++
            break
          case 'neutral':
            neutralCount++
            break
          case 'rival':
            rivalCount++
            break
          case 'mine':
            mineCount++
            break
        }
      }
    }
    
    adjacencyInfo.player = playerCount
    adjacencyInfo.neutral = neutralCount
    adjacencyInfo.rival = rivalCount
    adjacencyInfo.mine = mineCount
  } else {
    // Basic version: only show player adjacency info
    let playerCount = 0
    
    for (const neighborPos of neighborPositions) {
      const neighborTile = getTile(state.board, neighborPos)
      if (neighborTile && neighborTile.owner === 'player') {
        playerCount++
      }
    }
    
    adjacencyInfo.player = playerCount
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