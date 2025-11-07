import { GameState } from '../../types'
import { drawCards } from '../cardSystem'
import { hasEquipment } from './equipmentUtils'

export function triggerMopEffect(state: GameState, tilesCleanedCount: number): GameState {

  if (!hasEquipment(state, 'Mop') || tilesCleanedCount <= 0) {
    return state
  }


  // Draw one card per tile cleaned using centralized draw function
  const result = drawCards(state, tilesCleanedCount)

  return result
}
