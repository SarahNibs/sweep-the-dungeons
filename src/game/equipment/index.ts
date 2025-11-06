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

  let updatedState: GameState = {
    ...state,
    equipment: newEquipment,
    equipmentOptions: shouldPreserveEquipmentOptions ? state.equipmentOptions : undefined,
    equipmentUpgradeContext: context // Set context for upgrade display
  }

  // Apply special equipment effects for Estrogen, Progesterone, Boots, Crystal, Broom Closet, Novel, Cocktail, Disco Ball, and Bleach
  if (selectedEquipment.name === 'Estrogen') {
    // Estrogen triggers upgrade display, continuation handled by closeEquipmentUpgradeDisplay
    return applyEstrogenEffect(updatedState)
  } else if (selectedEquipment.name === 'Progesterone') {
    // Progesterone triggers upgrade display, continuation handled by closeEquipmentUpgradeDisplay
    return applyProgesteroneEffect(updatedState)
  } else if (selectedEquipment.name === 'Boots') {
    // Boots triggers card selection for transformation, equipmentOptions preserved above
    return applyBootsEffect(updatedState)
  } else if (selectedEquipment.name === 'Crystal') {
    // Crystal triggers upgrade display showing the 3 added Tingles
    return applyCrystalEffect(updatedState)
  } else if (selectedEquipment.name === 'Broom Closet') {
    // Broom Closet removes all Spritz and adds 3 Sweep cards
    return applyBroomClosetEffect(updatedState)
  } else if (selectedEquipment.name === 'Novel') {
    // Novel replaces all Instructions with doubly-upgraded Sarcastic Instructions
    return applyNovelEffect(updatedState)
  } else if (selectedEquipment.name === 'Cocktail') {
    // Cocktail removes all Scurry and adds 2 random cards
    return applyCocktailEffect(updatedState)
  } else if (selectedEquipment.name === 'Disco Ball') {
    // Disco Ball adds 2 doubly-upgraded Tingles
    return applyDiscoBallEffect(updatedState)
  } else if (selectedEquipment.name === 'Bleach') {
    // Bleach enhances all Spritz and Sweep cards
    return applyBleachEffect(updatedState)
  } else {
    // For other equipment, set gamePhase to playing and continue normal flow
    const nonUpgradeState: GameState = {
      ...updatedState,
      gamePhase: 'playing' as const
    }
    delete nonUpgradeState.equipmentUpgradeContext // Clear context for non-upgrade equipment
    updatedState = nonUpgradeState
  }

  // Check if this level should show shop rewards after equipment selection
  if (shouldShowShopReward(state.currentLevelId)) {
    return startShopSelection(updatedState)
  } else {
    // No shop rewards - advance to next level immediately
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
  console.log('📋 CLOSING EQUIPMENT UPGRADE DISPLAY')
  console.log('📋 Context:', state.equipmentUpgradeContext)

  const updatedState: GameState = {
    ...state,
    gamePhase: 'playing' as const,
    equipmentUpgradeResults: undefined
  }
  delete updatedState.equipmentUpgradeContext // Clear the context

  // Handle based on context
  if (state.equipmentUpgradeContext === 'debug') {
    // Debug equipment addition - return to playing without level advancement
    console.log('📋 Debug equipment addition - returning to playing without level advancement')
    return updatedState
  }

  if (state.equipmentUpgradeContext === 'shop') {
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
