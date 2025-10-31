import { useState } from 'react'
import { Card as CardType } from '../types'
import { Card } from './Card'
import { PileViewingScreen } from './PileViewingScreen'

interface CardSelectionScreenProps {
  cards: CardType[]
  onCardSelect: (card: CardType) => void
  onSkip: () => void
  currentDeck: CardType[]
}

export function CardSelectionScreen({ cards, onCardSelect, onSkip, currentDeck }: CardSelectionScreenProps) {
  const [viewingDeck, setViewingDeck] = useState(false)

  return (
    <>
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
              applyStatusEffects={false}
            />
          </div>
        ))}
      </div>

      {/* Skip button and View Deck button */}
      <div style={{ marginBottom: '40px', display: 'flex', gap: '20px' }}>
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
        <button
          onClick={() => setViewingDeck(true)}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: '#0984e3',
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
            e.currentTarget.style.backgroundColor = '#0984e3'
          }}
        >
          View Deck
        </button>
      </div>

    </div>

    {viewingDeck && (
      <PileViewingScreen
        pileType="deck"
        cards={currentDeck}
        onClose={() => setViewingDeck(false)}
      />
    )}
    </>
  )
}