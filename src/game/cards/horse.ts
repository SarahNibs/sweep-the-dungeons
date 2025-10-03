import { GameState, Position } from '../../types'
import { getTile } from '../boardSystem'
import { addStatusEffect } from '../gameRepository'
import { revealTileWithRelicEffects } from '../cardEffects'
import { addOwnerSubsetAnnotation } from '../cardEffects'

export function executeHorseEffect(state: GameState, target: Position, card?: import('../../types').Card): GameState {
  // Get Manhattan distance 1 area around target
  const area: Position[] = [
    target, // Center
    { x: target.x - 1, y: target.y }, // Left
    { x: target.x + 1, y: target.y }, // Right
    { x: target.x, y: target.y - 1 }, // Up
    { x: target.x, y: target.y + 1 }  // Down
  ]
  
  // Find tiles in the area that exist and are unrevealed
  const validTiles = area
    .map(pos => ({ pos, tile: getTile(state.board, pos) }))
    .filter(({ tile }) => tile && !tile.revealed && tile.owner !== 'empty')
  
  if (validTiles.length === 0) {
    // No valid tiles, just add status effect
    return addStatusEffect(state, 'horse_discount')
  }
  
  // Count tiles by owner to find safest (player > neutral > rival > mine)
  const ownerCounts: Record<string, number> = {}
  validTiles.forEach(({ tile }) => {
    if (tile) {
      ownerCounts[tile.owner] = (ownerCounts[tile.owner] || 0) + 1
    }
  })
  
  // Determine safest owner (priority: player > neutral > rival > mine)
  let safestOwner: string
  if (ownerCounts.player > 0) {
    safestOwner = 'player'
  } else if (ownerCounts.neutral > 0) {
    safestOwner = 'neutral'
  } else if (ownerCounts.rival > 0) {
    safestOwner = 'rival'
  } else {
    safestOwner = 'mine'
  }
  
  // Get all tiles with the safest owner in the area
  const tilesToProcess = validTiles.filter(({ tile }) => tile?.owner === safestOwner)
  
  let newState = state
  
  if (card?.enhanced && safestOwner !== 'player') {
    // Enhanced version: annotate instead of reveal for non-player owners
    const ownerSubset = new Set<'player' | 'rival' | 'neutral' | 'mine'>([safestOwner as any])
    tilesToProcess.forEach(({ pos }) => {
      newState = addOwnerSubsetAnnotation(newState, pos, ownerSubset)
    })
  } else {
    // Normal version: reveal all tiles with safest owner
    tilesToProcess.forEach(({ pos }) => {
      newState = revealTileWithRelicEffects(newState, pos, 'player')
    })
    
    // Note: If safest owner is not player, this should end the turn
    // This will be handled by the store logic checking the card effect results
  }
  
  // Add Horse discount status effect
  newState = addStatusEffect(newState, 'horse_discount')
  
  return newState
}