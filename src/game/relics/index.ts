import { Relic, RelicOption, GameState } from '../../types'
import { advanceToNextLevel } from '../cardSystem'
import { shouldShowShopReward } from '../levelSystem'
import { startShopSelection } from '../shopSystem'
import { getAllRelics } from '../gameRepository'
import { applyEstrogenEffect } from './estrogen'
import { applyProgesteroneEffect } from './progesterone'
import { applyBootsEffect } from './boots'
import { applyCrystalEffect } from './crystal'
import { applyBroomClosetEffect } from './broomCloset'
import { applyNovelEffect } from './novel'
import { applyCocktailEffect } from './cocktail'
import { applyDiscoBallEffect } from './discoBall'
import { applyBleachEffect } from './bleach'

// Re-export all relic effects
export { triggerDoubleBroomEffect } from './doubleBroom'
export { triggerDustBunnyEffect, triggerTemporaryBunnyBuffs, triggerMatedPairEffect, triggerBabyBunnyEffect } from './dustBunny'
export { checkFrillyDressEffect } from './frillyDress'
export { triggerBusyCanaryEffect } from './busyCanary'
export { triggerMopEffect } from './mop'
export { triggerInterceptedNoteEffect } from './interceptedCommunications'
export { triggerHyperfocusEffect } from './hyperfocus'
export { applyBleachEffect } from './bleach'
export { applyEstrogenEffect } from './estrogen'
export { applyProgesteroneEffect } from './progesterone'
export { checkChokerEffect } from './choker'
export { applyBootsEffect, transformCardForBoots } from './boots'
export { prepareGlassesEffect } from './glasses'
export { applyCrystalEffect } from './crystal'
export { applyBroomClosetEffect } from './broomCloset'
export { applyNovelEffect, transformInstructionsIfNovel } from './novel'
export { applyCocktailEffect } from './cocktail'
export { applyDiscoBallEffect } from './discoBall'

// Re-export utilities
export { hasRelic } from './relicUtils'

// Relic selection and management
export function createRelicOptions(ownedRelics: Relic[] = []): RelicOption[] {
  const allRelics = getAllRelics()

  // Filter out relics the player already owns or doesn't have prerequisites for
  const ownedRelicNames = new Set(ownedRelics.map(relic => relic.name))
  const availableRelics = allRelics.filter(relic => {
    // Already own this relic
    if (ownedRelicNames.has(relic.name)) {
      return false
    }

    // Check prerequisites - relic must have all prerequisite relics owned
    if (relic.prerequisites && relic.prerequisites.length > 0) {
      const hasAllPrerequisites = relic.prerequisites.every(prereqName =>
        ownedRelicNames.has(prereqName)
      )
      if (!hasAllPrerequisites) {
        return false
      }
    }

    return true
  })

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

  // Determine context: if we have shopOptions, we're in shop; otherwise we're in reward flow
  const context: 'reward' | 'shop' = state.shopOptions ? 'shop' : 'reward'

  let updatedState: GameState = {
    ...state,
    relics: newRelics,
    relicOptions: shouldPreserveRelicOptions ? state.relicOptions : undefined,
    relicUpgradeContext: context // Set context for upgrade display
  }

  // Apply special relic effects for Estrogen, Progesterone, Boots, Crystal, Broom Closet, Novel, Cocktail, Disco Ball, and Bleach
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
  } else if (selectedRelic.name === 'Broom Closet') {
    // Broom Closet removes all Spritz and adds 3 Sweep cards
    return applyBroomClosetEffect(updatedState)
  } else if (selectedRelic.name === 'Novel') {
    // Novel replaces all Instructions with doubly-upgraded Sarcastic Instructions
    return applyNovelEffect(updatedState)
  } else if (selectedRelic.name === 'Cocktail') {
    // Cocktail removes all Scurry and adds 2 random cards
    return applyCocktailEffect(updatedState)
  } else if (selectedRelic.name === 'Disco Ball') {
    // Disco Ball adds 2 doubly-upgraded Tingles
    return applyDiscoBallEffect(updatedState)
  } else if (selectedRelic.name === 'Bleach') {
    // Bleach enhances all Spritz and Sweep cards
    return applyBleachEffect(updatedState)
  } else {
    // For other relics, set gamePhase to playing and continue normal flow
    const nonUpgradeState: GameState = {
      ...updatedState,
      gamePhase: 'playing' as const
    }
    delete nonUpgradeState.relicUpgradeContext // Clear context for non-upgrade relics
    updatedState = nonUpgradeState
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
  console.log('📋 Context:', state.relicUpgradeContext)

  const updatedState: GameState = {
    ...state,
    gamePhase: 'playing' as const,
    relicUpgradeResults: undefined
  }
  delete updatedState.relicUpgradeContext // Clear the context

  // Handle based on context
  if (state.relicUpgradeContext === 'debug') {
    // Debug relic addition - return to playing without level advancement
    console.log('📋 Debug relic addition - returning to playing without level advancement')
    return updatedState
  }

  if (state.relicUpgradeContext === 'shop') {
    // Return to shop with existing options and purchased items preserved
    console.log('📋 Shop context - returning to shop')
    return {
      ...updatedState,
      gamePhase: 'shop_selection'
    }
  }

  // Context is 'reward' or undefined (reward flow)
  // Check if this level should show shop rewards after closing display
  if (shouldShowShopReward(state.currentLevelId)) {
    console.log('📋 Reward context - going to shop')
    return startShopSelection(updatedState)
  } else {
    // No shop rewards - advance to next level immediately
    console.log('📋 Reward context - advancing to next level')
    return advanceToNextLevel(updatedState)
  }
}
