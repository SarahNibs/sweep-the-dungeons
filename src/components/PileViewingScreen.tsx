import { Card as CardType, PileType } from '../types'
import { Card } from './Card'

interface PileViewingScreenProps {
  pileType: PileType
  cards: CardType[]
  onClose: () => void
}

export function PileViewingScreen({ pileType, cards, onClose }: PileViewingScreenProps) {
  const getPileTitle = () => {
    switch (pileType) {
      case 'deck': return 'Draw Pile'
      case 'discard': return 'Discard Pile'
      case 'exhaust': return 'Exhaust Pile'
      default: return 'Cards'
    }
  }

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
        maxWidth: '90vw',
        maxHeight: '90vh',
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

        <h2 style={{
          color: 'white',
          textAlign: 'center',
          marginBottom: '30px',
          marginTop: '10px'
        }}>
          {getPileTitle()} ({cards.length} cards)
        </h2>

        {cards.length === 0 ? (
          <div style={{
            color: '#999',
            textAlign: 'center',
            fontSize: '18px',
            padding: '40px'
          }}>
            No cards in {getPileTitle().toLowerCase()}
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '5px'
          }}>
            {Array.from({ length: Math.ceil(cards.length / 15) }).map((_, rowIndex) => (
              <div key={rowIndex} style={{
                display: 'flex',
                justifyContent: 'center',
                position: 'relative',
                height: '40px',
                marginBottom: rowIndex === Math.ceil(cards.length / 15) - 1 ? '0' : '20px'
              }}>
                {cards.slice(rowIndex * 15, (rowIndex + 1) * 15).map((card, cardIndex) => (
                  <div
                    key={`${card.name}-${rowIndex}-${cardIndex}`}
                    style={{
                      position: 'absolute',
                      left: `${cardIndex * 15}px`,
                      zIndex: cardIndex,
                      transform: 'scale(0.6)',
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