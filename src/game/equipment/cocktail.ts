import { GameState, Card } from '../../types'
import { createCard, getRewardCardPool, applyDIYGel } from '../gameRepository'

/**
 * Cocktail equipment: when gained, remove all Scurry cards and add 2 random energy-upgraded cards
 */
export function applyCocktailEffect(state: GameState): { state: GameState; results?: { before: Card; after: Card }[] } {
  // Filter out all Scurry cards from persistent deck
  const deckWithoutScurry = state.persistentDeck.filter(card => card.name !== 'Scurry')


  // Get 2 random energy-upgraded cards from reward pool
  const rewardPool = getRewardCardPool()
  const shuffled = [...rewardPool].sort(() => Math.random() - 0.5)
  const card1 = createCard(shuffled[0].name, { energyReduced: true })
  const card2 = createCard(shuffled[1 % shuffled.length].name, { energyReduced: true })

  // Apply DIY Gel if owned
  const randomCard1 = applyDIYGel(state.equipment, card1)
  const randomCard2 = applyDIYGel(state.equipment, card2)


  const newDeck = [...deckWithoutScurry, randomCard1, randomCard2]

  // Create upgrade results showing the transformations (use Scurry as "before" state)
  const scurryBefore = createCard('Scurry', {})
  const results = [
    { before: scurryBefore, after: randomCard1 },
    { before: scurryBefore, after: randomCard2 }
  ]

  const newState = {
    ...state,
    persistentDeck: newDeck
  }

  return { state: newState, results }
}
