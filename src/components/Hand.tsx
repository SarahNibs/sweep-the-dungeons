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
  exhaustCount: number
  energy: number
  maxEnergy: number
  onEndTurn: () => void
  onPileClick?: (pileType: 'deck' | 'discard' | 'exhaust') => void
  maskingState: { maskingCardId: string; enhanced: boolean } | null
}

export function Hand({ cards, onCardClick, canPlayCard, deckCount, discardCount, exhaustCount, energy, maxEnergy, onEndTurn, onPileClick, maskingState }: HandProps) {
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
      flexDirection: 'column',
      gap: '10px',
      width: '100%'
    }}>
      {/* Masking Mode Indicator */}
      {maskingState && (
        <div style={{
          backgroundColor: '#3b82f6',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '8px',
          textAlign: 'center',
          fontSize: '14px',
          fontWeight: 'bold',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
          animation: 'pulse 2s infinite'
        }}>
          🎭 Select a card from your hand to play for free! (Both cards will exhaust{maskingState.enhanced && ', except Masking'})
        </div>
      )}

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
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
        <Tooltip text={`Draw pile: ${deckCount} cards remaining (click to view)`}>
          <div 
            style={{
              width: '28px',
              height: '35px',
              backgroundColor: '#6b8e5a',
              color: 'white',
              borderRadius: '2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: onPileClick ? 'pointer' : 'default'
            }}
            onClick={() => onPileClick?.('deck')}
          >
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
            isPlayable={maskingState ? card.name !== 'Masking' : canPlayCard(card.id)}
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
        <Tooltip text={`Discard: ${discardCount} cards used this floor (click to view)`}>
          <div 
            style={{
              width: '28px',
              height: '35px',
              backgroundColor: '#6c757d',
              color: 'white',
              borderRadius: '2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: onPileClick ? 'pointer' : 'default'
            }}
            onClick={() => onPileClick?.('discard')}
          >
            {discardCount}
          </div>
        </Tooltip>
        
        {/* Exhaust widget */}
        <Tooltip text={`Exhaust: ${exhaustCount} cards removed this floor (click to view)`}>
          <div 
            style={{
              width: '28px',
              height: '35px',
              backgroundColor: '#8b4513',
              color: 'white',
              borderRadius: '2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: onPileClick ? 'pointer' : 'default'
            }}
            onClick={() => onPileClick?.('exhaust')}
          >
            {exhaustCount}
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
    </div>
  )
}