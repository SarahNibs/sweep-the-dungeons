import { GameState, Position } from '../../types'
import { addOwnerSubsetAnnotation } from '../cardEffects'
import { drawCards } from '../cardSystem'

export function executeArgumentEffect(state: GameState, target: Position, card?: import('../../types').Card): GameState {
  let currentState = state
  
  // Get 3x3 area around target position
  const centerX = target.x
  const centerY = target.y
  
  // For each tile in 3x3 area
  for (let x = centerX - 1; x <= centerX + 1; x++) {
    for (let y = centerY - 1; y <= centerY + 1; y++) {
      const pos = { x, y }
      const key = `${x},${y}`
      const tile = currentState.board.tiles.get(key)
      
      // Only affect unrevealed tiles that are within board bounds
      if (tile && !tile.revealed && tile.owner !== 'empty') {
        if (tile.owner === 'neutral') {
          // This is a neutral tile - annotate as neutral only
          const neutralOnlySubset = new Set<'player' | 'rival' | 'neutral' | 'mine'>(['neutral'])
          currentState = addOwnerSubsetAnnotation(currentState, pos, neutralOnlySubset)
        } else {
          // This is not a neutral tile - exclude neutral from possibilities  
          const noNeutralSubset = new Set<'player' | 'rival' | 'neutral' | 'mine'>(['player', 'rival', 'mine'])
          currentState = addOwnerSubsetAnnotation(currentState, pos, noNeutralSubset)
        }
      }
    }
  }
  
  // Enhanced version: also draw 1 card
  if (card?.enhanced) {
    currentState = drawCards(currentState, 1)
  }
  
  return currentState
}