import { useState } from 'react'
import { ShopOption, Card } from '../types'
import { PileViewingScreen } from './PileViewingScreen'
import { getRelicIcon, getCardDescription, getCardIcon } from '../game/gameRepository'

interface ShopSelectionScreenProps {
  shopOptions: ShopOption[]
  onPurchase: (optionIndex: number) => void
  onExit: () => void
  currentCopper: number
  purchasedItems?: Set<number>
  waitingForCardRemoval?: boolean
  onCardRemovalSelect?: (cardId: string) => void
  currentDeck?: Card[]
}

export function ShopSelectionScreen({
  shopOptions,
  onPurchase,
  onExit,
  currentCopper,
  purchasedItems,
  waitingForCardRemoval,
  onCardRemovalSelect,
  currentDeck
}: ShopSelectionScreenProps) {
  const [viewingDeck, setViewingDeck] = useState(false)
  const [hoveredItem, setHoveredItem] = useState<number | null>(null)

  if (waitingForCardRemoval && currentDeck && onCardRemovalSelect) {
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
          Choose a Card to Remove
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          alignItems: 'start',
          justifyItems: 'center',
          maxWidth: '800px',
          width: '100%'
        }}>
          {currentDeck.map((card) => (
            <div 
              key={card.id} 
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                border: '2px solid transparent',
                borderRadius: '8px',
                padding: '15px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textAlign: 'center',
                minWidth: '180px'
              }}
              onClick={() => onCardRemovalSelect(card.id)}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#74b9ff'
                e.currentTarget.style.backgroundColor = 'rgba(116, 185, 255, 0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'transparent'
                e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.3)'
              }}
            >
              <div style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#74b9ff',
                marginBottom: '8px'
              }}>
                {card.name}
              </div>
              <div style={{
                fontSize: '14px',
                color: '#ddd',
                marginBottom: '8px'
              }}>
                Cost: {card.cost}
              </div>
              {card.costReduced && (
                <div style={{
                  fontSize: '12px',
                  color: '#28a745',
                  fontStyle: 'italic'
                }}>
                  Energy Upgraded
                </div>
              )}
              {card.enhanced && (
                <div style={{
                  fontSize: '12px',
                  color: '#ffa500',
                  fontStyle: 'italic'
                }}>
                  Enhanced
                </div>
              )}
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
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        maxWidth: '1000px',
        marginBottom: '30px'
      }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#74b9ff',
          margin: '0',
          textAlign: 'center'
        }}>
          Shop
        </h2>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px'
        }}>
          {/* Copper display */}
          <div style={{
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#b8860b',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{
              width: '24px',
              height: '24px',
              backgroundColor: '#b8860b',
              color: 'white',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              {currentCopper}
            </div>
            Copper
          </div>
          
          {/* View Deck button */}
          {currentDeck && (
            <button
              onClick={() => setViewingDeck(true)}
              style={{
                padding: '10px 20px',
                fontSize: '16px',
                backgroundColor: '#0984e3',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
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
          )}

          {/* Exit button */}
          <button
            onClick={onExit}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: '#74b9ff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Leave Shop
          </button>
        </div>
      </div>

      {/* Shop items grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        alignItems: 'start',
        justifyItems: 'center',
        maxWidth: '1000px',
        width: '100%'
      }}>
        {shopOptions.map((option, index) => {
          const canAfford = currentCopper >= option.cost
          const isPurchased = purchasedItems?.has(index) || false
          const isAvailable = canAfford && !isPurchased
          
          // Get hover text for cards and relics
          const getHoverText = () => {
            if (option.card) {
              return getCardDescription(option.card)
            }
            if (option.relic) {
              return option.relic.hoverText || option.relic.description
            }
            return option.description
          }

          return (
            <div
              key={index}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                cursor: isAvailable ? 'pointer' : 'not-allowed',
                padding: '20px',
                borderRadius: '12px',
                backgroundColor: isPurchased ? 'rgba(40, 167, 69, 0.2)' : isAvailable ? 'rgba(0, 0, 0, 0.3)' : 'rgba(100, 100, 100, 0.2)',
                border: isPurchased ? '2px solid #28a745' : '2px solid transparent',
                transition: 'all 0.2s',
                minHeight: '200px',
                width: '240px',
                textAlign: 'center',
                opacity: isAvailable ? 1 : 0.6
              }}
              onClick={() => isAvailable && onPurchase(index)}
              onMouseEnter={(e) => {
                setHoveredItem(index)
                if (isAvailable) {
                  e.currentTarget.style.borderColor = '#74b9ff'
                  e.currentTarget.style.backgroundColor = 'rgba(116, 185, 255, 0.1)'
                }
              }}
              onMouseLeave={(e) => {
                setHoveredItem(null)
                if (isAvailable) {
                  e.currentTarget.style.borderColor = 'transparent'
                  e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.3)'
                } else if (isPurchased) {
                  e.currentTarget.style.borderColor = '#28a745'
                  e.currentTarget.style.backgroundColor = 'rgba(40, 167, 69, 0.2)'
                }
              }}
            >
              {/* Custom Tooltip */}
              {hoveredItem === index && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-8px',
                    left: '50%',
                    transform: 'translate(-50%, -100%)',
                    backgroundColor: '#1f2937',
                    color: 'white',
                    fontSize: '12px',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                    whiteSpace: 'pre-wrap',
                    maxWidth: '300px',
                    zIndex: 1000,
                    pointerEvents: 'none'
                  }}
                >
                  {getHoverText()}
                </div>
              )}

              {/* Item Icon */}
              <div style={{
                width: '60px',
                height: '60px',
                border: `3px solid ${isPurchased ? '#28a745' : isAvailable ? '#74b9ff' : '#666'}`,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                backgroundColor: isPurchased ? 'rgba(40, 167, 69, 0.1)' : `rgba(116, 185, 255, ${isAvailable ? 0.1 : 0.05})`,
                marginBottom: '8px'
              }}>
                {isPurchased ? '✓' : getShopItemIcon(option)}
              </div>
              
              {/* Item Name */}
              <div style={{
                fontSize: '16px',
                fontWeight: 'bold',
                color: isPurchased ? '#28a745' : isAvailable ? '#74b9ff' : '#999',
                marginBottom: '8px'
              }}>
                {option.displayName}
                {isPurchased && (
                  <div style={{
                    fontSize: '12px',
                    color: '#28a745',
                    fontWeight: 'normal',
                    marginTop: '4px'
                  }}>
                    PURCHASED
                  </div>
                )}
              </div>
              
              {/* Item Description */}
              <div style={{
                fontSize: '12px',
                color: isPurchased ? '#28a745' : isAvailable ? '#ddd' : '#999',
                lineHeight: '1.4',
                flexGrow: 1,
                display: 'flex',
                alignItems: 'center'
              }}>
                {option.description}
              </div>
              
              {/* Cost */}
              <div style={{
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#b8860b',
                marginTop: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <div style={{
                  width: '18px',
                  height: '18px',
                  backgroundColor: '#b8860b',
                  color: 'white',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: 'bold'
                }}>
                  {option.cost}
                </div>
                Copper
              </div>
            </div>
          )
        })}
      </div>

      {viewingDeck && currentDeck && (
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

function getShopItemIcon(option: ShopOption): string {
  switch (option.type) {
    case 'add_card':
    case 'add_energy_card':
    case 'add_enhanced_card':
      return option.card ? getCardIcon(option.card.name) : '📜'
    case 'add_relic':
      return option.relic ? getRelicIcon(option.relic.name) : '🏺'
    case 'remove_card':
      return '🗑️'
    case 'temp_bunny':
      return '🐰'
    default:
      return '❓'
  }
}