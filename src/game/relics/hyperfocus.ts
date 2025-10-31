import { GameState } from '../../types'
import { createCard, getRewardCardPool } from '../gameRepository'
import { hasRelic } from './relicUtils'

export function triggerHyperfocusEffect(state: GameState): GameState {
  if (!hasRelic(state, 'Hyperfocus')) {
    return state
  }

  console.log('🎯 Triggering Hyperfocus effect')

  // Get all cards that exist from the reward pool
  const allRewardCards = getRewardCardPool()

  if (allRewardCards.length === 0) {
    console.log('  - No reward cards available')
    return state
  }

  // For each card, generate all 4 variants (regular, energy-reduced, enhanced, both)
  // and filter to only those with effective net cost 0 (either cost 0, or cost 1 with energyReduced)
  interface CardVariant {
    name: string
    energyReduced: boolean
    enhanced: boolean
    finalCost: number
    weight: number
  }

  const zeroCostVariants: CardVariant[] = []

  allRewardCards.forEach(card => {
    // Variant 1: Regular (no upgrades)
    const regularVariant = createCard(card.name, { energyReduced: false, enhanced: false })
    if (regularVariant.cost === 0) {
      zeroCostVariants.push({
        name: card.name,
        energyReduced: false,
        enhanced: false,
        finalCost: regularVariant.cost,
        weight: 1/4
      })
    }

    // Variant 2: Energy-reduced only (only if base cost === 1)
    // Energy-reduced cards with cost 1 have net cost 0 (cost 1, refund 1)
    if (card.cost === 1) {
      const energyReducedVariant = createCard(card.name, { energyReduced: true, enhanced: false })
      zeroCostVariants.push({
        name: card.name,
        energyReduced: true,
        enhanced: false,
        finalCost: energyReducedVariant.cost,
        weight: 1/8
      })
    }

    // Variant 3: Enhanced only
    const enhancedVariant = createCard(card.name, { energyReduced: false, enhanced: true })
    if (enhancedVariant.cost === 0) {
      zeroCostVariants.push({
        name: card.name,
        energyReduced: false,
        enhanced: true,
        finalCost: enhancedVariant.cost,
        weight: 1/8
      })
    }

    // Variant 4: Energy-reduced AND enhanced (only if base cost === 1)
    if (card.cost === 1) {
      const bothVariant = createCard(card.name, { energyReduced: true, enhanced: true })
      zeroCostVariants.push({
        name: card.name,
        energyReduced: true,
        enhanced: true,
        finalCost: bothVariant.cost,
        weight: 1/14
      })
    }
  })

  if (zeroCostVariants.length === 0) {
    console.log('  - No net-cost-0 card variants available')
    return state
  }

  // Weighted random selection
  const totalWeight = zeroCostVariants.reduce((sum, v) => sum + v.weight, 0)
  let random = Math.random() * totalWeight

  let selectedVariant: CardVariant | null = null
  for (const variant of zeroCostVariants) {
    random -= variant.weight
    if (random <= 0) {
      selectedVariant = variant
      break
    }
  }

  // Fallback in case of floating point issues
  if (!selectedVariant) {
    selectedVariant = zeroCostVariants[zeroCostVariants.length - 1]
  }

  // Create the selected card
  const hyperfocusCard = createCard(selectedVariant.name, {
    energyReduced: selectedVariant.energyReduced,
    enhanced: selectedVariant.enhanced
  })

  console.log(`  - Adding ${selectedVariant.name} (energy-reduced: ${selectedVariant.energyReduced}, enhanced: ${selectedVariant.enhanced}) to hand`)
  console.log(`  - Final card cost: ${hyperfocusCard.cost} (net: ${hyperfocusCard.energyReduced ? hyperfocusCard.cost - 1 : hyperfocusCard.cost})`)

  // Add to hand (not persistent deck)
  return {
    ...state,
    hand: [...state.hand, hyperfocusCard]
  }
}
