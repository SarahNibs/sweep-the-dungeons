import { Card as CardType } from '../types'
import { Card } from './Card'

interface CardSelectionScreenProps {
  cards: CardType[]
  onCardSelect: (card: CardType) => void
  onSkip: () => void
  currentDeck: CardType[]
}

export function CardSelectionScreen({ cards, onCardSelect, onSkip, currentDeck }: CardSelectionScreenProps) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(45, 52, 54, 0.95)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      {/* Three cards centered */}
      <div style={{
        display: 'flex',
        gap: '40px',
        alignItems: 'center',
        marginBottom: '40px'
      }}>
        {cards.map((card) => (
          <div 
            key={card.id} 
            style={{
              transform: 'scale(1.2)',
              transition: 'transform 0.2s',
              cursor: 'pointer'
            }}
            onClick={() => onCardSelect(card)}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1.2)'
            }}
          >
            <Card 
              card={card}
              onClick={() => {}} // Remove duplicate click handler
              isPlayable={true}
            />
          </div>
        ))}
      </div>

      {/* Skip button */}
      <div style={{ marginBottom: '40px' }}>
        <button
          onClick={onSkip}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: '#636e72',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#74b9ff'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#636e72'
          }}
        >
          Skip
        </button>
      </div>

      {/* Current deck display */}
      <div style={{
        width: '100%',
        maxWidth: '800px',
        maxHeight: '200px',
        overflowY: 'auto',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '8px',
        border: '1px solid #74b9ff',
        padding: '16px'
      }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: 'bold',
          color: '#74b9ff',
          margin: '0 0 12px 0',
          textAlign: 'center'
        }}>
          Current Deck ({currentDeck.length} cards)
        </h3>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '15px',
          alignItems: 'center'
        }}>
          {Array.from({ length: Math.ceil(currentDeck.length / 12) }).map((_, rowIndex) => (
            <div key={rowIndex} style={{
              display: 'flex',
              justifyContent: 'center',
              position: 'relative',
              height: '80px'
            }}>
              {currentDeck.slice(rowIndex * 12, (rowIndex + 1) * 12).map((card, cardIndex) => {
                const cardsInThisRow = currentDeck.slice(rowIndex * 12, (rowIndex + 1) * 12).length
                const totalWidth = (cardsInThisRow - 1) * 35
                const leftOffset = -totalWidth / 2
                
                return (
                  <div
                    key={`${card.name}-${rowIndex}-${cardIndex}`}
                    style={{
                      position: 'absolute',
                      left: `${leftOffset + cardIndex * 35}px`,
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
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}