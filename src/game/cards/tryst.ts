import { GameState, Position } from '../../types'
import { revealTileWithRelicEffects } from '../cardEffects'

function getUnrevealedTilesByOwner(state: GameState, owner: 'player' | 'rival' | 'neutral' | 'mine'): import('../../types').Tile[] {
  const unrevealed: import('../../types').Tile[] = []
  for (const tile of state.board.tiles.values()) {
    if (!tile.revealed && tile.owner === owner) {
      unrevealed.push(tile)
    }
  }
  return unrevealed
}

function manhattanDistance(pos1: Position, pos2: Position): number {
  return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y)
}

export function executeTrystEffect(state: GameState, target?: Position, card?: import('../../types').Card): GameState {
  // First, rival reveals one of their tiles at random
  let currentState = state
  
  const rivalTiles = getUnrevealedTilesByOwner(state, 'rival')
  if (rivalTiles.length > 0) {
    let chosenRivalTile: import('../../types').Tile
    
    if (card?.enhanced && target) {
      // Enhanced version: prioritize by Manhattan distance from target
      const tilesWithDistance = rivalTiles.map(tile => ({
        tile,
        distance: manhattanDistance(tile.position, target)
      }))
      
      // Find minimum distance
      const minDistance = Math.min(...tilesWithDistance.map(t => t.distance))
      const closestTiles = tilesWithDistance.filter(t => t.distance === minDistance)
      
      // Random tiebreaker among tiles at same distance
      chosenRivalTile = closestTiles[Math.floor(Math.random() * closestTiles.length)].tile
    } else {
      // Basic version: completely random
      chosenRivalTile = rivalTiles[Math.floor(Math.random() * rivalTiles.length)]
    }
    
    // Reveal the rival tile
    currentState = revealTileWithRelicEffects(currentState, chosenRivalTile.position, 'rival')
  }
  
  // Then, player reveals one of their tiles at random  
  const playerTiles = getUnrevealedTilesByOwner(currentState, 'player')
  if (playerTiles.length > 0) {
    let chosenPlayerTile: import('../../types').Tile
    
    if (card?.enhanced && target) {
      // Enhanced version: prioritize by Manhattan distance from target
      const tilesWithDistance = playerTiles.map(tile => ({
        tile,
        distance: manhattanDistance(tile.position, target)
      }))
      
      // Find minimum distance
      const minDistance = Math.min(...tilesWithDistance.map(t => t.distance))
      const closestTiles = tilesWithDistance.filter(t => t.distance === minDistance)
      
      // Random tiebreaker among tiles at same distance
      chosenPlayerTile = closestTiles[Math.floor(Math.random() * closestTiles.length)].tile
    } else {
      // Basic version: completely random
      chosenPlayerTile = playerTiles[Math.floor(Math.random() * playerTiles.length)]
    }
    
    // Reveal the player tile (triggering relic effects)
    currentState = revealTileWithRelicEffects(currentState, chosenPlayerTile.position, 'player')
  }
  
  return currentState
}