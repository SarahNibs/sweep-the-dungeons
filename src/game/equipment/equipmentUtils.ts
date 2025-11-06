import { GameState, Card } from '../../types'

export function hasEquipment(state: GameState, equipmentName: string): boolean {
  return state.equipment.some(equipment => equipment.name === equipmentName)
}

export function getEligibleCardsForUpgrade(cards: Card[], upgradeType: 'cost_reduction' | 'enhance_effect'): Card[] {
  return cards.filter(card => {
    if (upgradeType === 'cost_reduction') {
      // Can only apply energy reduction if cost > 0 and not already energy-reduced
      return card.cost > 0 && !card.energyReduced
    } else {
      // Can only enhance if not already enhanced
      return !card.enhanced
    }
  })
}

export function selectRandomCards(cards: Card[], count: number): Card[] {
  const shuffled = [...cards].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, cards.length))
}
