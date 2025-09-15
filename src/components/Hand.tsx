import { Card as CardType } from '../types'
import { Card } from './Card'
import { Tooltip } from './Tooltip'
import { useState } from 'react'

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
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null)
  
  // Calculate dynamic overlap based on hand size
  const calculateOverlap = (totalCards: number): number => {
    if (totalCards <= 3) return 0 // No overlap for small hands
    if (totalCards <= 5) return 10 // Small overlap for medium hands  
    if (totalCards <= 7) return 20 // Medium overlap for larger hands
    return 30 // Large overlap for very large hands
  }
  
  const cardOverlap = calculateOverlap(cards.length)
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      margin: '20px 0',
      minHeight: '120px',
      width: '100%' // Use full container width
    }}>
      {/* Left group: Energy and Deck with spacing */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        {/* Energy widget - left edge */}
        <Tooltip text={`Energy: ${energy}/${maxEnergy}`}>
          <div style={{
            width: '32px',
            height: '32px',
            backgroundColor: '#5a7ba7',
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
        
        {/* Deck widget */}
        <Tooltip text={`Deck: ${deckCount} cards`}>
          <div style={{
            width: '28px',
            height: '35px',
            backgroundColor: '#6b8e5a',
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
      </div>
      
      {/* Cards area - flexible center space */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-end',
        flex: '1',
        overflow: 'visible'
      }}>
        {cards.map((card, index) => (
          <Card
            key={card.id}
            card={card}
            onClick={onCardClick}
            isPlayable={canPlayCard(card.id)}
            index={index}
            totalCards={cards.length}
            isHovered={hoveredCardId === card.id}
            onHover={(hovered) => setHoveredCardId(hovered ? card.id : null)}
            customOverlap={cardOverlap}
          />
        ))}
      </div>
      
      {/* Right group: Discard and End Turn with spacing */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        {/* Discard widget */}
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
        
        {/* End Turn button - right edge */}
        <Tooltip text="End Turn">
          <div 
            onClick={onEndTurn}
            style={{
              width: '32px',
              height: '32px',
              backgroundColor: '#a85a5a',
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
    </div>
  )
}