import { Card as CardType } from '../types'
import { Card } from './Card'
import { Tooltip } from './Tooltip'

interface HandProps {
  cards: CardType[]
  onCardClick: (cardId: string) => void
  canPlayCard: (cardId: string) => boolean
  deckCount: number
  discardCount: number
  energy: number
  maxEnergy: number
  onEndTurn: () => void
}

export function Hand({ cards, onCardClick, canPlayCard, deckCount, discardCount, energy, maxEnergy, onEndTurn }: HandProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '20px',
      margin: '20px 0'
    }}>
      {/* Energy widget - blue circle */}
      <Tooltip text={`Energy: ${energy}/${maxEnergy}`}>
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
      </Tooltip>
      
      {/* Deck widget - green rectangle */}
      <Tooltip text={`Deck: ${deckCount} cards`}>
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
      </Tooltip>
      
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
      <Tooltip text={`Discard: ${discardCount} cards`}>
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
      </Tooltip>
      
      {/* End Turn button - red circle with arrow */}
      <Tooltip text="End Turn">
        <div 
          onClick={onEndTurn}
          style={{
            width: '32px',
            height: '32px',
            backgroundColor: '#dc3545',
            color: 'white',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'transform 0.1s, box-shadow 0.1s',
            userSelect: 'none'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)'
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          ▶
        </div>
      </Tooltip>
    </div>
  )
}