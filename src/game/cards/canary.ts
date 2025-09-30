import { GameState, Position } from '../../types'
import { positionToKey } from '../boardSystem'
import { addOwnerSubsetAnnotation } from '../cardEffects'

export function executeCanaryEffect(state: GameState, target: Position, card?: import('../../types').Card): GameState {
  if (!target) return state
  
  let currentState = state
  let mineFound = false
  
  // Get tiles to check based on enhanced status
  const tilesToCheck: Position[] = []
  
  if (card?.enhanced) {
    // Enhanced: 3x3 area
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        tilesToCheck.push({
          x: target.x + dx,
          y: target.y + dy
        })
      }
    }
  } else {
    // Basic: star pattern (Manhattan distance 1)
    tilesToCheck.push(target) // Center
    tilesToCheck.push({ x: target.x, y: target.y - 1 }) // North
    tilesToCheck.push({ x: target.x, y: target.y + 1 }) // South  
    tilesToCheck.push({ x: target.x - 1, y: target.y }) // West
    tilesToCheck.push({ x: target.x + 1, y: target.y }) // East
  }
  
  // Check each tile and add appropriate annotation
  for (const pos of tilesToCheck) {
    const key = positionToKey(pos)
    const tile = currentState.board.tiles.get(key)
    
    // Only process unrevealed tiles that exist on the board
    if (tile && !tile.revealed && tile.owner !== 'empty') {
      if (tile.owner === 'mine') {
        // This is a mine - exclude everything else (only mine possible)
        const mineOnlySubset = new Set<'player' | 'rival' | 'neutral' | 'mine'>(['mine'])
        currentState = addOwnerSubsetAnnotation(currentState, pos, mineOnlySubset)
        mineFound = true
      } else {
        // This is not a mine - exclude mine from possibilities  
        const noMineSubset = new Set<'player' | 'rival' | 'neutral' | 'mine'>(['player', 'rival', 'neutral'])
        currentState = addOwnerSubsetAnnotation(currentState, pos, noMineSubset)
      }
    }
  }
  
  // If any mine was found, mark card to exhaust
  if (mineFound) {
    currentState = {
      ...currentState,
      shouldExhaustLastCard: true
    }
  }
  
  return currentState
}