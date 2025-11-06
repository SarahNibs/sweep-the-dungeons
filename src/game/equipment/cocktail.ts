import { GameState } from '../../types'
import { createCard, getRewardCardPool, applyDIYGel } from '../gameRepository'

/**
 * Cocktail equipment: when gained, remove all Scurry cards and add 2 random energy-upgraded cards
 */
export function applyCocktailEffect(state: GameState): GameState {
  console.log('🍸 COCKTAIL EFFECT: Removing all Scurry, adding 2 random energy-upgraded cards')

  // Filter out all Scurry cards from persistent deck
  const scurryCards = state.persistentDeck.filter(card => card.name === 'Scurry')
  const deckWithoutScurry = state.persistentDeck.filter(card => card.name !== 'Scurry')

  console.log(`  - Removed ${scurryCards.length} Scurry cards`)

  // Get 2 random energy-upgraded cards from reward pool
  const rewardPool = getRewardCardPool()
  const shuffled = [...rewardPool].sort(() => Math.random() - 0.5)
  const card1 = createCard(shuffled[0].name, { energyReduced: true })
  const card2 = createCard(shuffled[1 % shuffled.length].name, { energyReduced: true })

  // Apply DIY Gel if owned
  const randomCard1 = applyDIYGel(state.equipment, card1)
  const randomCard2 = applyDIYGel(state.equipment, card2)

  console.log(`  - Adding ${randomCard1.name} and ${randomCard2.name}`)

  const newDeck = [...deckWithoutScurry, randomCard1, randomCard2]

  // Create upgrade results showing the transformations (use Scurry as "before" state)
  const scurryBefore = createCard('Scurry', {})
  const equipmentUpgradeResults = [
    { before: scurryBefore, after: randomCard1 },
    { before: scurryBefore, after: randomCard2 }
  ]

  return {
    ...state,
    persistentDeck: newDeck,
    gamePhase: 'equipment_upgrade_display',
    equipmentUpgradeResults
  }
}
