import { GameState, Position } from '../../types'
import { addOwnerSubsetAnnotation } from '../cardEffects'

function getUnrevealedTilesByOwner(state: GameState, owner: 'player' | 'rival' | 'neutral' | 'mine'): import('../../types').Tile[] {
  const unrevealed: import('../../types').Tile[] = []
  for (const tile of state.board.tiles.values()) {
    if (!tile.revealed && tile.owner === owner) {
      unrevealed.push(tile)
    }
  }
  return unrevealed
}

export function executeReportEffect(state: GameState): GameState {
  const rivalTiles = getUnrevealedTilesByOwner(state, 'rival')
  
  if (rivalTiles.length === 0) return state
  
  // Pick a random rival tile
  const randomIndex = Math.floor(Math.random() * rivalTiles.length)
  const targetTile = rivalTiles[randomIndex]
  
  const ownerSubset = new Set<'player' | 'rival' | 'neutral' | 'mine'>(['rival'])
  return addOwnerSubsetAnnotation(state, targetTile.position, ownerSubset)
}

export function executeTargetedReportEffect(state: GameState, targetPosition: Position): GameState {
  const ownerSubset = new Set<'player' | 'rival' | 'neutral' | 'mine'>(['rival'])
  return addOwnerSubsetAnnotation(state, targetPosition, ownerSubset)
}