import { Card as CardType, PileType } from '../types'
import { Card } from './Card'

interface PileViewingScreenProps {
  pileType: PileType
  cards: CardType[]
  onClose: () => void
}

export function PileViewingScreen({ cards, onClose }: PileViewingScreenProps) {

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: '#2d3436',
        borderRadius: '12px',
        padding: '30px',
        maxWidth: '650px',
        maxHeight: '500px',
        width: '90%',
        overflow: 'auto',
        position: 'relative'
      }}>
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '30px',
            height: '30px',
            fontSize: '16px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          ×
        </button>

        {cards.length === 0 ? (
          <div style={{
            color: '#999',
            textAlign: 'center',
            fontSize: '18px',
            padding: '40px'
          }}>
            No cards
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
            alignItems: 'center'
          }}>
            {Array.from({ length: Math.ceil(cards.length / 12) }).map((_, rowIndex) => (
              <div key={rowIndex} style={{
                display: 'flex',
                justifyContent: 'center',
                position: 'relative',
                height: '80px'
              }}>
                {cards.slice(rowIndex * 12, (rowIndex + 1) * 12).map((card, cardIndex) => (
                  <div
                    key={`${card.name}-${rowIndex}-${cardIndex}`}
                    style={{
                      position: 'absolute',
                      left: `${cardIndex * 35}px`,
                      zIndex: cardIndex,
                      transform: 'scale(0.7)',
                      transformOrigin: 'center center'
                    }}
                  >
                    <Card 
                      card={card}
                      onClick={() => {}}
                      isPlayable={true}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}