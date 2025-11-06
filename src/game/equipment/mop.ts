import { GameState } from '../../types'
import { drawCards } from '../cardSystem'
import { hasEquipment } from './equipmentUtils'

export function triggerMopEffect(state: GameState, tilesCleanedCount: number): GameState {
  console.log('🧽 MOP EFFECT DEBUG')
  console.log('  - Has Mop equipment:', hasEquipment(state, 'Mop'))
  console.log('  - Tiles cleaned count:', tilesCleanedCount)
  console.log('  - Player equipment:', state.equipment.map(r => r.name))

  if (!hasEquipment(state, 'Mop') || tilesCleanedCount <= 0) {
    console.log('  - Mop effect not triggered (no equipment or no tiles cleaned)')
    return state
  }

  console.log(`  - Triggering Mop effect: drawing ${tilesCleanedCount} cards`)

  // Draw one card per tile cleaned using centralized draw function
  const result = drawCards(state, tilesCleanedCount)

  console.log('  - Mop effect completed')
  return result
}
