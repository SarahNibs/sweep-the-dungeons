import { Relic, RelicOption, GameState } from '../../types'
import { advanceToNextLevel } from '../cardSystem'
import { shouldShowShopReward } from '../levelSystem'
import { startShopSelection } from '../shopSystem'
import { getAllRelics } from '../gameRepository'
import { applyEstrogenEffect } from './estrogen'
import { applyProgesteroneEffect } from './progesterone'
import { applyBootsEffect } from './boots'
import { applyCrystalEffect } from './crystal'

// Re-export all relic effects
export { triggerDoubleBroomEffect } from './doubleBroom'
export { triggerDustBunnyEffect, triggerTemporaryBunnyBuffs } from './dustBunny'
export { checkFrillyDressEffect } from './frillyDress'
export { triggerBusyCanaryEffect } from './busyCanary'
export { triggerMopEffect } from './mop'
export { triggerInterceptedNoteEffect } from './interceptedCommunications'
export { triggerHyperfocusEffect } from './hyperfocus'
export { applyEstrogenEffect } from './estrogen'
export { applyProgesteroneEffect } from './progesterone'
export { checkChokerEffect } from './choker'
export { applyBootsEffect, transformCardForBoots } from './boots'
export { prepareGlassesEffect } from './glasses'
export { applyCrystalEffect } from './crystal'

// Re-export utilities
export { hasRelic } from './relicUtils'

// Relic selection and management
export function createRelicOptions(ownedRelics: Relic[] = []): RelicOption[] {
  const allRelics = getAllRelics()

  // Filter out relics the player already owns
  const ownedRelicNames = new Set(ownedRelics.map(relic => relic.name))
  const availableRelics = allRelics.filter(relic => !ownedRelicNames.has(relic.name))

  // Shuffle using Fisher-Yates algorithm (proper random shuffle)
  const shuffled = [...availableRelics]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, 3).map(relic => ({ relic }))
}

export function selectRelic(state: GameState, selectedRelic: Relic): GameState {
  const newRelics = [...state.relics, selectedRelic]

  // For Boots, preserve relicOptions so the screen stays visible during card selection
  // For other relics, clear relicOptions
  const shouldPreserveRelicOptions = selectedRelic.name === 'Boots'

  let updatedState = {
    ...state,
    relics: newRelics,
    relicOptions: shouldPreserveRelicOptions ? state.relicOptions : undefined
  }

  // Apply special relic effects for Estrogen, Progesterone, Boots, and Crystal
  if (selectedRelic.name === 'Estrogen') {
    // Estrogen triggers upgrade display, continuation handled by closeRelicUpgradeDisplay
    return applyEstrogenEffect(updatedState)
  } else if (selectedRelic.name === 'Progesterone') {
    // Progesterone triggers upgrade display, continuation handled by closeRelicUpgradeDisplay
    return applyProgesteroneEffect(updatedState)
  } else if (selectedRelic.name === 'Boots') {
    // Boots triggers card selection for transformation, relicOptions preserved above
    return applyBootsEffect(updatedState)
  } else if (selectedRelic.name === 'Crystal') {
    // Crystal triggers upgrade display showing the 3 added Tingles
    return applyCrystalEffect(updatedState)
  } else {
    // For other relics, set gamePhase to playing and continue normal flow
    updatedState = {
      ...updatedState,
      gamePhase: 'playing' as const
    }
  }

  // Check if this level should show shop rewards after relic selection
  if (shouldShowShopReward(state.currentLevelId)) {
    return startShopSelection(updatedState)
  } else {
    // No shop rewards - advance to next level immediately
    return advanceToNextLevel(updatedState)
  }
}

export function startRelicSelection(state: GameState): GameState {
  const relicOptions = createRelicOptions(state.relics)
  return {
    ...state,
    gamePhase: 'relic_selection',
    relicOptions
  }
}

export function closeRelicUpgradeDisplay(state: GameState): GameState {
  console.log('📋 CLOSING RELIC UPGRADE DISPLAY')

  const updatedState = {
    ...state,
    gamePhase: 'playing' as const,
    relicUpgradeResults: undefined
  }

  // Check if we're returning to an existing shop session (has shopOptions already)
  if (state.shopOptions) {
    // Return to shop with existing options and purchased items preserved
    return {
      ...updatedState,
      gamePhase: 'shop_selection'
    }
  }

  // Check if this level should show shop rewards after closing display
  if (shouldShowShopReward(state.currentLevelId)) {
    return startShopSelection(updatedState)
  } else {
    // No shop rewards - advance to next level immediately
    return advanceToNextLevel(updatedState)
  }
}
