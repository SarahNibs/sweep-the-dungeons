import { Card as CardType } from '../types'
import { Card } from './Card'

interface HandProps {
  cards: CardType[]
  onCardClick: (cardId: string) => void
  canPlayCard: (cardId: string) => boolean
  deckCount: number
  discardCount: number
  energy: number
  maxEnergy: number
}

export function Hand({ cards, onCardClick, canPlayCard, deckCount, discardCount, energy }: HandProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '20px',
      margin: '20px 0'
    }}>
      {/* Energy widget - blue circle */}
      <div style={{
        width: '32px',
        height: '32px',
        backgroundColor: '#007bff',
        color: 'white',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '14px',
        fontWeight: 'bold'
      }}>
        {energy}
      </div>
      
      {/* Deck widget - green rectangle */}
      <div style={{
        width: '28px',
        height: '35px',
        backgroundColor: '#28a745',
        color: 'white',
        borderRadius: '2px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        fontWeight: 'bold'
      }}>
        {deckCount}
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
      
      {/* Discard widget - gray rectangle */}
      <div style={{
        width: '28px',
        height: '35px',
        backgroundColor: '#6c757d',
        color: 'white',
        borderRadius: '2px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        fontWeight: 'bold'
      }}>
        {discardCount}
      </div>
    </div>
  )
}