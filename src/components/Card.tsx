import { Card as CardType } from '../types'

// Card images (using emojis/symbols for now)
const getCardImage = (cardName: string) => {
  switch (cardName) {
    case 'Spritz': return '👁️'
    case 'Easiest': return '⚡'
    case 'Tingle': return '📋'
    case 'Imperious Orders': return '🔍'
    case 'Vague Orders': return '🔎'
    case 'Energized': return '⚡'
    case 'Options': return '🃏'
    case 'Brush': return '🖌️'
    case 'Ramble': return '🌀'
    default: return '❓'
  }
}

// Card descriptions
const getCardDescription = (cardName: string, cost: number, enhanced?: boolean) => {
  const baseCost = `Cost: ${cost} energy. `
  switch (cardName) {
    case 'Spritz': return baseCost + (enhanced ? 'Click on an unrevealed tile to see if it\'s safe or dangerous. Also scouts a random adjacent tile.' : 'Click on an unrevealed tile to see if it\'s safe or dangerous')
    case 'Easiest': return baseCost + (enhanced ? 'Click on three unrevealed tiles - the safest one will be revealed' : 'Click on two unrevealed tiles - the safer one will be revealed')
    case 'Tingle': return baseCost + (enhanced ? 'Mark 2 random enemy tiles with enemy indicators' : 'Mark a random enemy tile with an enemy indicator')
    case 'Imperious Orders': return baseCost + (enhanced ? 'Strong evidence of two of your tiles (never clues mines)' : 'Strong evidence of two of your tiles')
    case 'Vague Orders': return baseCost + (enhanced ? 'Evidence of five of your tiles (5 guaranteed bag pulls)' : 'Evidence of five of your tiles')
    case 'Energized': return baseCost + (enhanced ? 'Gain 2 energy' : 'Gain 2 energy. Exhaust (remove from deck after use)')
    case 'Options': return baseCost + (enhanced ? 'Draw 5 cards' : 'Draw 3 cards')
    case 'Brush': return baseCost + (enhanced ? 'Select center of 3x3 area - exclude random owners from each tile (applies twice)' : 'Select center of 3x3 area - exclude random owners from each tile')
    case 'Ramble': return baseCost + (enhanced ? 'Disrupts enemy\'s next turn by removing their guaranteed bag pulls (stronger disruption 0-4)' : 'Disrupts enemy\'s next turn by removing their guaranteed bag pulls')
    case 'Sweep': return baseCost + (enhanced ? 'Select center of 7x7 area - removes all dirt from the area' : 'Select center of 5x5 area - removes all dirt from the area')
    default: return baseCost + 'Unknown card effect'
  }
}

// Energy pips display
const renderEnergyPips = (cost: number, isPlayable: boolean) => {
  const pips = []
  const pipColor = isPlayable ? '#74b9ff' : '#a0a0a0'
  
  for (let i = 0; i < cost; i++) {
    pips.push(
      <div key={i} style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        backgroundColor: pipColor,
        margin: '1px'
      }} />
    )
  }
  
  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '2px',
      maxWidth: '20px'
    }}>
      {pips}
    </div>
  )
}

interface CardProps {
  card: CardType
  onClick: (cardId: string) => void
  isPlayable: boolean
  index?: number
  totalCards?: number
  isHovered?: boolean
  onHover?: (hovered: boolean) => void
  customOverlap?: number
  showUpgradeIndicator?: 'cost_reduction' | 'enhance_effect'
}

export function Card({ card, onClick, isPlayable, index = 0, totalCards = 1, isHovered = false, onHover, customOverlap, showUpgradeIndicator }: CardProps) {
  const handleClick = () => {
    if (isPlayable) {
      onClick(card.id)
    }
  }

  // Use custom overlap if provided, otherwise calculate based on totalCards
  const cardOverlap = customOverlap !== undefined ? customOverlap : (totalCards > 1 ? 15 : 0)
  const baseZIndex = 10
  const zIndex = isHovered ? baseZIndex + 100 : baseZIndex + index
  
  return (
    <div
      onClick={handleClick}
      title={getCardDescription(card.name, card.cost, card.enhanced)}
      style={{
        position: 'relative',
        width: '80px',
        height: '100px',
        border: `2px solid ${isPlayable ? '#5a5a5a' : '#8a8a8a'}`,
        borderRadius: '6px',
        padding: '4px',
        marginLeft: index === 0 ? '0px' : `-${cardOverlap}px`,
        backgroundColor: isPlayable ? '#e8e8e8' : '#b8b8b8',
        cursor: isPlayable ? 'pointer' : 'not-allowed',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        transition: 'transform 0.2s, box-shadow 0.2s, z-index 0.1s',
        zIndex: zIndex,
        transform: isHovered ? 'translateY(-10px) scale(1.05)' : 'translateY(0) scale(1)'
      }}
      onMouseEnter={() => {
        onHover?.(true)
      }}
      onMouseLeave={() => {
        onHover?.(false)
      }}
    >
      {/* Energy cost pips - positioned in top-left corner */}
      <div style={{
        position: 'absolute',
        top: '4px',
        left: '4px',
        zIndex: 1,
        ...(showUpgradeIndicator === 'cost_reduction' && {
          backgroundColor: '#00b894',
          borderRadius: '50%',
          padding: '3px',
          border: '2px solid #00b894'
        })
      }}>
        {renderEnergyPips(card.cost, isPlayable)}
      </div>
      
      {/* Enhanced effect indicator - positioned in bottom-left corner */}
      {(showUpgradeIndicator === 'enhance_effect' || card.enhanced) && (
        <div style={{
          position: 'absolute',
          bottom: '4px',
          left: '4px',
          zIndex: 1,
          backgroundColor: '#a29bfe',
          borderRadius: '50%',
          width: '20px',
          height: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '14px',
          fontWeight: 'bold'
        }}>
          +
        </div>
      )}
      
      {/* Card content */}
      <div style={{ 
        textAlign: 'center',
        marginTop: '8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%'
      }}>
        <h3 style={{ 
          margin: '0 0 8px 0', 
          fontSize: '12px', 
          fontWeight: 'bold',
          lineHeight: '1.1',
          color: isPlayable ? '#2d3436' : '#636e72'
        }}>
          {card.name}
        </h3>
        
        <div style={{
          fontSize: '28px',
          lineHeight: '1',
          userSelect: 'none'
        }}>
          {getCardImage(card.name)}
        </div>
      </div>
    </div>
  )
}