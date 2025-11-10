import { Equipment, EquipmentOption, GameState } from '../../types'
import { advanceToNextLevel } from '../cardSystem'
import { shouldShowShopReward } from '../levelSystem'
import { startShopSelection } from '../shopSystem'
import { getAllEquipment } from '../gameRepository'
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
    equipmentUpgradeContext: context, // Set context for upgrade display
    gamePhase // Set appropriate phase
  }

  // Apply special equipment effects for Estrogen, Progesterone, Boots, Crystal, Broom Closet, Novel, Cocktail, Disco Ball, and Bleach
  // These will push the equipment_upgrade_display modal on top of the target phase
  if (selectedEquipment.name === 'Estrogen') {
    return applyEstrogenEffect(updatedState)
  } else if (selectedEquipment.name === 'Progesterone') {
    return applyProgesteroneEffect(updatedState)
  } else if (selectedEquipment.name === 'Boots') {
    return applyBootsEffect(updatedState)
  } else if (selectedEquipment.name === 'Crystal') {
    return applyCrystalEffect(updatedState)
  } else if (selectedEquipment.name === 'Broom Closet') {
    return applyBroomClosetEffect(updatedState)
  } else if (selectedEquipment.name === 'Novel') {
    return applyNovelEffect(updatedState)
  } else if (selectedEquipment.name === 'Cocktail') {
    return applyCocktailEffect(updatedState)
  } else if (selectedEquipment.name === 'Disco Ball') {
    return applyDiscoBallEffect(updatedState)
  } else if (selectedEquipment.name === 'Bleach') {
    return applyBleachEffect(updatedState)
  }

  // Equipment doesn't modify deck - continue to next phase
  delete updatedState.equipmentUpgradeContext // Clear context

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
  const equipmentOptions = createEquipmentOptions(state.equipment)
  return {
    ...state,
    gamePhase: 'equipment_selection',
    equipmentOptions
  }
}

export function closeEquipmentUpgradeDisplay(state: GameState): GameState {
  const context = state.equipmentUpgradeContext

  // Pop the modal and clear results
  let updatedState: GameState = {
    ...state,
    modalStack: state.modalStack.slice(0, -1), // Pop the top modal
    equipmentUpgradeResults: undefined,
    equipmentUpgradeContext: undefined
  }

  // If context is 'reward', we need to continue the flow
  if (context === 'reward') {
    // In reward flow: continue to shop or advance to next level
    if (shouldShowShopReward(updatedState.currentLevelId)) {
      return startShopSelection(updatedState)
    } else {
      return advanceToNextLevel(updatedState)
    }
  }

  // For 'shop' context, stay at shop
  // For 'debug' context, return to playing phase
  if (context === 'debug') {
    return {
      ...updatedState,
      gamePhase: 'playing',
      equipmentOptions: undefined // Clear equipment options
    }
  }

  // For 'shop' context, just return the updated state (already at correct phase)
  return updatedState
}
