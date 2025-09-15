import { Card as CardType } from '../types'
import { Card } from './Card'

interface CardSelectionScreenProps {
  cards: CardType[]
  onCardSelect: (card: CardType) => void
  currentLevel: number
}

const getCardDescription = (cardName: string) => {
  switch (cardName) {
    case 'Energized': return 'Gain 2 energy. Exhaust (remove from deck after use)'
    case 'Options': return 'Draw 3 cards'
    case 'Brush': return 'Select center of 3x3 area - exclude random owners from each tile'
    default: return 'Unknown card effect'
  }
}

export function CardSelectionScreen({ cards, onCardSelect, currentLevel }: CardSelectionScreenProps) {
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
      zIndex: 1000
    }}>
      <div style={{
        textAlign: 'center',
        marginBottom: '40px'
      }}>
        <h1 style={{
          fontSize: '36px',
          fontWeight: 'bold',
          color: '#74b9ff',
          margin: '0 0 16px 0'
        }}>
          Level {currentLevel} Complete!
        </h1>
        <h2 style={{
          fontSize: '24px',
          color: '#ddd',
          margin: '0 0 8px 0'
        }}>
          Choose a card to add to your deck
        </h2>
        <p style={{
          fontSize: '16px',
          color: '#999',
          margin: '0'
        }}>
          Click on a card to select it and continue to level {currentLevel + 1}
        </p>
      </div>

      <div style={{
        display: 'flex',
        gap: '40px',
        alignItems: 'center'
      }}>
        {cards.map((card) => (
          <div key={card.id} style={{ textAlign: 'center' }}>
            <div style={{
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
                onClick={() => onCardSelect(card)}
                isPlayable={true}
              />
            </div>
            <div style={{
              marginTop: '16px',
              maxWidth: '200px',
              padding: '12px',
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '8px',
              border: '1px solid #74b9ff'
            }}>
              <h3 style={{
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#74b9ff',
                margin: '0 0 8px 0'
              }}>
                {card.name}
              </h3>
              <p style={{
                fontSize: '12px',
                color: '#ddd',
                margin: '0',
                lineHeight: '1.4'
              }}>
                {getCardDescription(card.name)}
              </p>
              {card.exhaust && (
                <div style={{
                  marginTop: '8px',
                  padding: '4px 8px',
                  backgroundColor: '#e74c3c',
                  color: 'white',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: 'bold'
                }}>
                  EXHAUST
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}