import { useState } from 'react'
import { UpgradeOption, Card as CardType } from '../types'
import { Card } from './Card'
import { PileViewingScreen } from './PileViewingScreen'

interface UpgradeSelectionScreenProps {
  upgradeOptions: UpgradeOption[]
  onUpgradeSelect: (option: UpgradeOption, selectedCardId?: string) => void
  currentDeck: CardType[]
  waitingForCardRemoval?: boolean
  onCardRemovalSelect?: (cardId: string) => void
}

export function UpgradeSelectionScreen({
  upgradeOptions,
  onUpgradeSelect,
  currentDeck,
  waitingForCardRemoval,
  onCardRemovalSelect
}: UpgradeSelectionScreenProps) {
  const [viewingDeck, setViewingDeck] = useState(false)

  if (waitingForCardRemoval) {
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
          Select a card to remove from your deck
        </h2>

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

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '20px',
          maxWidth: '800px',
          width: '100%'
        }}>
          {currentDeck.map((card) => (
            <div 
              key={card.id} 
              style={{
                transform: 'scale(1.0)',
                transition: 'transform 0.2s',
                cursor: 'pointer'
              }}
              onClick={() => onCardRemovalSelect?.(card.id)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1.0)'
              }}
            >
              <Card 
                card={card}
                onClick={() => {}} 
                isPlayable={true}
                applyStatusEffects={false}
              />
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
        margin: '0 0 30px 0',
        textAlign: 'center'
      }}>
        Choose an Upgrade
      </h2>

      {/* Three upgrade options */}
      <div style={{
        display: 'flex',
        gap: '40px',
        alignItems: 'center',
        marginBottom: '40px'
      }}>
        {upgradeOptions.map((option, index) => (
          <div 
            key={index} 
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              padding: '20px',
              borderRadius: '12px',
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              border: '2px solid transparent',
              transition: 'all 0.2s',
              minHeight: '280px',
              width: '200px'
            }}
            onClick={() => onUpgradeSelect(option)}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#74b9ff'
              e.currentTarget.style.backgroundColor = 'rgba(116, 185, 255, 0.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'transparent'
              e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.3)'
            }}
          >
            {option.type === 'remove_card' ? (
              <>
                <div style={{
                  width: '120px',
                  height: '160px',
                  border: '2px dashed #636e72',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '48px',
                  color: '#636e72'
                }}>
                  ×
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#636e72',
                  textAlign: 'center'
                }}>
                  Remove a Card
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#ddd',
                  textAlign: 'center',
                  lineHeight: '1.4'
                }}>
                  Permanently remove a card from your deck
                </div>
              </>
            ) : option.displayCard ? (
              <>
                <div style={{ transform: 'scale(0.8)' }}>
                  <Card 
                    card={option.displayCard}
                    onClick={() => {}} 
                    isPlayable={true}
                    showUpgradeIndicator={option.type}
                    applyStatusEffects={false}
                  />
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: option.type === 'cost_reduction' ? '#00b894' : '#a29bfe',
                  textAlign: 'center'
                }}>
                  {option.type === 'cost_reduction' ? 'Cost Reduction' : 'Enhanced Effect'}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#ddd',
                  textAlign: 'center',
                  lineHeight: '1.4'
                }}>
                  {option.type === 'cost_reduction' 
                    ? 'Reduce energy cost by 1'
                    : 'Gain enhanced effect'
                  }
                </div>
              </>
            ) : null}
          </div>
        ))}
      </div>

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
                      applyStatusEffects={false}
                    />
                  </div>
                )
              })}
            </div>
          ))}
        </div>
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