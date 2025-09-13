import { Card as CardType } from '../types'
import { Card } from './Card'

interface HandProps {
  cards: CardType[]
  onCardClick: (cardId: string) => void
  canPlayCard: (cardId: string) => boolean
}

export function Hand({ cards, onCardClick, canPlayCard }: HandProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '12px'
    }}>
      <h2 style={{ margin: '0', color: '#333' }}>Hand ({cards.length})</h2>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '4px',
        maxWidth: '800px'
      }}>
        {cards.map(card => (
          <Card
            key={card.id}
            card={card}
            onClick={onCardClick}
            isPlayable={canPlayCard(card.id)}
          />
        ))}
      </div>
    </div>
  )
}