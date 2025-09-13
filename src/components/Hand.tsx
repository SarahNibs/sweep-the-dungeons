import { Card as CardType } from '../types'
import { Card } from './Card'

interface HandProps {
  cards: CardType[]
  onCardClick: (cardId: string) => void
  canPlayCard: (cardId: string) => boolean
  deckCount: number
  discardCount: number
}

export function Hand({ cards, onCardClick, canPlayCard, deckCount, discardCount }: HandProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '20px',
      margin: '20px 0'
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px'
      }}>
        <div style={{
          padding: '6px 12px',
          backgroundColor: '#28a745',
          color: 'white',
          borderRadius: '4px',
          fontSize: '14px',
          fontWeight: 'bold'
        }}>
          Deck
        </div>
        <div style={{
          fontSize: '16px',
          fontWeight: 'bold',
          color: '#333'
        }}>
          {deckCount}
        </div>
      </div>
      
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '3px',
        maxWidth: '600px'
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
      
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px'
      }}>
        <div style={{
          padding: '6px 12px',
          backgroundColor: '#6c757d',
          color: 'white',
          borderRadius: '4px',
          fontSize: '14px',
          fontWeight: 'bold'
        }}>
          Discard
        </div>
        <div style={{
          fontSize: '16px',
          fontWeight: 'bold',
          color: '#333'
        }}>
          {discardCount}
        </div>
      </div>
    </div>
  )
}