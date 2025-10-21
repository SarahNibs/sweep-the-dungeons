import { useState } from 'react'
import { RelicOption, Relic, Card as CardType } from '../types'
import { getRelicIcon } from '../game/gameRepository'
import { PileViewingScreen } from './PileViewingScreen'

interface RelicSelectionScreenProps {
  relicOptions: RelicOption[]
  onRelicSelect: (relic: Relic) => void
  currentDeck: CardType[]
}

export function RelicSelectionScreen({ relicOptions, onRelicSelect, currentDeck }: RelicSelectionScreenProps) {
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
      <h2 style={{
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#74b9ff',
        margin: '0 0 20px 0',
        textAlign: 'center'
      }}>
        Choose a Relic
      </h2>

      {/* View Deck button */}
      <div style={{ marginBottom: '20px' }}>
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

      {/* Three relic options */}
      <div style={{
        display: 'flex',
        gap: '40px',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap'
      }}>
        {relicOptions.map((option, index) => (
          <div 
            key={index} 
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '15px',
              cursor: 'pointer',
              padding: '30px',
              borderRadius: '12px',
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              border: '2px solid transparent',
              transition: 'all 0.2s',
              minHeight: '300px',
              width: '250px',
              textAlign: 'center'
            }}
            title={option.relic.hoverText}
            onClick={() => onRelicSelect(option.relic)}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#74b9ff'
              e.currentTarget.style.backgroundColor = 'rgba(116, 185, 255, 0.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'transparent'
              e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.3)'
            }}
          >
            {/* Relic Icon */}
            <div style={{
              width: '120px',
              height: '120px',
              border: '3px solid #74b9ff',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '48px',
              backgroundColor: 'rgba(116, 185, 255, 0.1)',
              marginBottom: '10px'
            }}>
              {getRelicIcon(option.relic.name)}
            </div>
            
            {/* Relic Name */}
            <div style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#74b9ff',
              marginBottom: '10px'
            }}>
              {option.relic.name}
            </div>
            
            {/* Relic Description */}
            <div style={{
              fontSize: '14px',
              color: '#ddd',
              lineHeight: '1.4',
              fontStyle: 'italic'
            }}>
              {option.relic.description}
            </div>
          </div>
        ))}
      </div>

      {viewingDeck && (
        <PileViewingScreen
          pileType="deck"
          cards={currentDeck}
          onClose={() => setViewingDeck(false)}
        />
      )}
    </div>
    </>
  )
}