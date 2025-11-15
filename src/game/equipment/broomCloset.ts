import { GameState, Card } from '../../types'
import { createCard, applyDIYGel } from '../gameRepository'

/**
 * Broom Closet equipment: when gained, remove all Spritz cards and add 3 Sweep cards
 * Upgrades from Spritz cards are redistributed randomly to Sweeps that don't have those upgrades
 */
export function applyBroomClosetEffect(state: GameState): { state: GameState; results?: { before: Card; after: Card }[] } {
  if (state.debugFlags.debugLogging) {
  console.log(`\n[BROOM-CLOSET] ========== applyBroomClosetEffect ==========`)
  }

  // Filter out all Spritz cards from persistent deck and count their upgrades
  const spritzCards = state.persistentDeck.filter(card => card.name === 'Spritz')
  const deckWithoutSpritz = state.persistentDeck.filter(card => card.name !== 'Spritz')

  if (state.debugFlags.debugLogging) {
  console.log(`[BROOM-CLOSET] Found ${spritzCards.length} Spritz cards to remove`)
  }

  // Count upgrades on Spritz cards
  let energyUpgrades = 0
  let enhanceUpgrades = 0
  spritzCards.forEach((card, i) => {
    if (card.energyReduced) energyUpgrades++
    if (card.enhanced) enhanceUpgrades++
    if (state.debugFlags.debugLogging) {
    console.log(`  Spritz ${i + 1}: energyReduced=${card.energyReduced}, enhanced=${card.enhanced}`)
    }
  })

  if (state.debugFlags.debugLogging) {
  console.log(`[BROOM-CLOSET] Collected upgrades: ${energyUpgrades} energy, ${enhanceUpgrades} enhance`)
  }

  // Create 3 base Sweep cards (before DIY Gel)
  const baseSweeps = [
    createCard('Sweep', {}),              // regular
    createCard('Sweep', { energyReduced: true }),  // energy
    createCard('Sweep', { enhanced: true })        // enhanced
  ]

  if (state.debugFlags.debugLogging) {
  console.log(`[BROOM-CLOSET] Created 3 base Sweep cards: regular, energy, enhanced`)
  }

  // Distribute energy upgrades to Sweeps that don't already have energy (regular and enhanced)
  const sweepsNeedingEnergy = baseSweeps
    .map((sweep, index) => ({ sweep, index }))
    .filter(({ sweep }) => !sweep.energyReduced)

  if (state.debugFlags.debugLogging) {
  console.log(`[BROOM-CLOSET] ${sweepsNeedingEnergy.length} Sweeps can receive energy upgrades (don't already have energy)`)
  }

  // Shuffle and apply energy upgrades
  const shuffledForEnergy = [...sweepsNeedingEnergy].sort(() => Math.random() - 0.5)
  for (let i = 0; i < Math.min(energyUpgrades, shuffledForEnergy.length); i++) {
    const { index } = shuffledForEnergy[i]
    baseSweeps[index] = createCard('Sweep', {
      energyReduced: true,
      enhanced: baseSweeps[index].enhanced
    })
    if (state.debugFlags.debugLogging) {
    console.log(`[BROOM-CLOSET] Applied energy upgrade to Sweep ${index} (${index === 0 ? 'regular' : index === 1 ? 'energy' : 'enhanced'})`)
    }
  }

  if (energyUpgrades > shuffledForEnergy.length) {
    if (state.debugFlags.debugLogging) {
    console.log(`[BROOM-CLOSET] Lost ${energyUpgrades - shuffledForEnergy.length} extra energy upgrades (no eligible Sweeps)`)
    }
  }

  // Distribute enhance upgrades to Sweeps that don't already have enhance (regular and energy)
  const sweepsNeedingEnhance = baseSweeps
    .map((sweep, index) => ({ sweep, index }))
    .filter(({ sweep }) => !sweep.enhanced)

  if (state.debugFlags.debugLogging) {
  console.log(`[BROOM-CLOSET] ${sweepsNeedingEnhance.length} Sweeps can receive enhance upgrades (don't already have enhance)`)
  }

  // Shuffle and apply enhance upgrades
  const shuffledForEnhance = [...sweepsNeedingEnhance].sort(() => Math.random() - 0.5)
  for (let i = 0; i < Math.min(enhanceUpgrades, shuffledForEnhance.length); i++) {
    const { index } = shuffledForEnhance[i]
    baseSweeps[index] = createCard('Sweep', {
      energyReduced: baseSweeps[index].energyReduced,
      enhanced: true
    })
    if (state.debugFlags.debugLogging) {
    console.log(`[BROOM-CLOSET] Applied enhance upgrade to Sweep ${index} (${index === 0 ? 'regular' : index === 1 ? 'energy' : 'enhanced'})`)
    }
  }

  if (enhanceUpgrades > shuffledForEnhance.length) {
    if (state.debugFlags.debugLogging) {
    console.log(`[BROOM-CLOSET] Lost ${enhanceUpgrades - shuffledForEnhance.length} extra enhance upgrades (no eligible Sweeps)`)
    }
  }

  // Apply DIY Gel to final Sweep cards
  const finalSweeps = baseSweeps.map(sweep => applyDIYGel(state.equipment, sweep))

  if (state.debugFlags.debugLogging) {
  console.log(`[BROOM-CLOSET] Final Sweep cards after DIY Gel:`)
  }
  finalSweeps.forEach((sweep, i) => {
    if (state.debugFlags.debugLogging) {
    console.log(`  Sweep ${i + 1}: energyReduced=${sweep.energyReduced}, enhanced=${sweep.enhanced}`)
    }
  })

  const newDeck = [...deckWithoutSpritz, ...finalSweeps]

  // Create upgrade results showing the transformations (use Spritz as "before" state)
  const spritzBefore = createCard('Spritz', {})
  const results = finalSweeps.map(sweep => ({
    before: spritzBefore,
    after: sweep
  }))

  const newState = {
    ...state,
    persistentDeck: newDeck
  }

  if (state.debugFlags.debugLogging) {
  console.log(`[BROOM-CLOSET] New deck size: ${newDeck.length} (removed ${spritzCards.length} Spritz, added ${finalSweeps.length} Sweep)`)
  }

  return { state: newState, results }
}
