import { Equipment, EquipmentOption, GameState } from '../../types'
import { advanceToNextLevel } from '../cardSystem'
import { shouldShowShopReward } from '../levelSystem'
import { startShopSelection } from '../shopSystem'
import { getAllEquipment } from '../gameRepository'
import { pushEquipmentUpgradeModal } from '../modalManager'
import { clearRewardScreenState } from '../rewardStateManager'
import { applyEstrogenEffect } from './estrogen'
import { applyProgesteroneEffect } from './progesterone'
import { applyBootsEffect } from './boots'
import { applyCrystalEffect } from './crystal'
import { applyBroomClosetEffect } from './broomCloset'
import { applyNovelEffect } from './novel'
import { applyCocktailEffect } from './cocktail'
import { applyDiscoBallEffect } from './discoBall'
import { applyBleachEffect } from './bleach'

// Re-export all equipment effects
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
export { hasEquipment } from './equipmentUtils'

// Equipment selection and management
export function createEquipmentOptions(ownedEquipment: Equipment[] = []): EquipmentOption[] {
  const allEquipment = getAllEquipment()

  // Filter out equipment the player already owns or doesn't have prerequisites for
  const ownedEquipmentNames = new Set(ownedEquipment.map(equipment => equipment.name))
  const availableEquipment = allEquipment.filter(equipment => {
    // Already own this equipment
    if (ownedEquipmentNames.has(equipment.name)) {
      return false
    }

    // Check prerequisites - equipment must have all prerequisite equipment owned
    if (equipment.prerequisites && equipment.prerequisites.length > 0) {
      const hasAllPrerequisites = equipment.prerequisites.every(prereqName =>
        ownedEquipmentNames.has(prereqName)
      )
      if (!hasAllPrerequisites) {
        return false
      }
    }

    return true
  })

  // Shuffle using Fisher-Yates algorithm (proper random shuffle)
  const shuffled = [...availableEquipment]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, 3).map(equipment => ({ equipment }))
}

export function selectEquipment(state: GameState, selectedEquipment: Equipment): GameState {
  const newEquipment = [...state.equipment, selectedEquipment]

  // For Boots, preserve equipmentOptions so the screen stays visible during card selection
  // For other equipment, clear equipmentOptions
  const shouldPreserveEquipmentOptions = selectedEquipment.name === 'Boots'

  // Determine context: if we have shopOptions, we're in shop; otherwise we're in reward flow
  const context: 'reward' | 'shop' = state.shopOptions ? 'shop' : 'reward'

  // Determine what phase we should be in after selecting equipment
  // This is set BEFORE applying equipment effects, so the modal will overlay the correct phase
  let targetPhase: GameState['gamePhase']

  if (context === 'shop') {
    // In shop: stay in shop_selection so we return to shop after modal closes
    targetPhase = 'shop_selection'
  } else {
    // In reward flow: determine next phase
    if (shouldShowShopReward(state.currentLevelId)) {
      targetPhase = 'shop_selection'
    } else {
      targetPhase = 'playing' // Will advance to next level
    }
  }

  // For Boots, keep gamePhase as equipment_selection so card removal screen can display
  // After card transformation, the flow will continue to shop or next level
  const gamePhase = shouldPreserveEquipmentOptions ? 'equipment_selection' : targetPhase

  let updatedState: GameState = {
    ...state,
    equipment: newEquipment,
    equipmentOptions: shouldPreserveEquipmentOptions ? state.equipmentOptions : undefined,
    gamePhase // Set appropriate phase
  }

  // Apply special equipment effects for Estrogen, Progesterone, Boots, Crystal, Broom Closet, Novel, Cocktail, Disco Ball, and Bleach
  // These will push the equipment_upgrade_display modal on top of the target phase
  let effectResult: { state: GameState; results?: { before: import('../../types').Card; after: import('../../types').Card }[] } | null = null

  if (selectedEquipment.name === 'Estrogen') {
    effectResult = applyEstrogenEffect(updatedState)
  } else if (selectedEquipment.name === 'Progesterone') {
    effectResult = applyProgesteroneEffect(updatedState)
  } else if (selectedEquipment.name === 'Boots') {
    effectResult = applyBootsEffect(updatedState)
  } else if (selectedEquipment.name === 'Crystal') {
    effectResult = applyCrystalEffect(updatedState)
  } else if (selectedEquipment.name === 'Broom Closet') {
    effectResult = applyBroomClosetEffect(updatedState)
  } else if (selectedEquipment.name === 'Novel') {
    effectResult = applyNovelEffect(updatedState)
  } else if (selectedEquipment.name === 'Cocktail') {
    effectResult = applyCocktailEffect(updatedState)
  } else if (selectedEquipment.name === 'Disco Ball') {
    effectResult = applyDiscoBallEffect(updatedState)
  } else if (selectedEquipment.name === 'Bleach') {
    effectResult = applyBleachEffect(updatedState)
  }

  // If an equipment effect was applied, handle the modal display with proper continuation
  if (effectResult) {
    const { state: newState, results } = effectResult

    // If equipment has upgrade results, show modal with continuation
    if (results && results.length > 0) {
      // Build continuation based on context
      if (context === 'shop') {
        return pushEquipmentUpgradeModal(newState, results, {
          returnTo: 'shop',
          preservedState: {
            shopOptions: state.shopOptions,
            purchasedShopItems: state.purchasedShopItems,
            copper: state.copper
          }
        })
      } else {
        // In reward flow - continuation is 'reward_flow'
        return pushEquipmentUpgradeModal(newState, results, {
          returnTo: 'reward_flow',
          preservedState: {}
        })
      }
    }

    // For Boots: applyBootsEffect returns waitingForCardRemoval state, which shows card selection
    // The transformCardForBoots function (called later) will handle the modal display
    return newState
  }

  // Equipment doesn't modify deck - continue to next phase

  // If in shop, just return to shop (already set above)
  if (context === 'shop') {
    return updatedState
  }

  // In reward flow: continue to shop or advance to next level
  if (shouldShowShopReward(state.currentLevelId)) {
    return startShopSelection(updatedState)
  } else {
    return advanceToNextLevel(updatedState)
  }
}

export function startEquipmentSelection(state: GameState): GameState {
  // Clear reward screen state to prevent leakage from previous screens
  const cleanState = clearRewardScreenState(state)

  const equipmentOptions = createEquipmentOptions(state.equipment)
  return {
    ...cleanState,
    gamePhase: 'equipment_selection',
    equipmentOptions
  }
}

