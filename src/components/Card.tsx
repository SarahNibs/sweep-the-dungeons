import { Card as CardType } from '../types'

// Card images (using emojis/symbols for now)
const getCardImage = (cardName: string) => {
  switch (cardName) {
    case 'Scout': return '👁️'
    case 'Quantum': return '⚡'
    case 'Report': return '📋'
    case 'Solid Clue': return '🔍'
    case 'Stretch Clue': return '🔎'
    default: return '❓'
  }
}

// Card descriptions
const getCardDescription = (cardName: string) => {
  switch (cardName) {
    case 'Scout': return 'Click on an unrevealed tile to see if it\'s safe or dangerous'
    case 'Quantum': return 'Click on two unrevealed tiles - the safer one will be revealed'
    case 'Report': return 'Mark a random enemy tile with an enemy indicator'
    case 'Solid Clue': return 'Strong evidence of two of your tiles'
    case 'Stretch Clue': return 'Evidence of five of your tiles'
    default: return 'Unknown card effect'
  }
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
}

export function Card({ card, onClick, isPlayable, index = 0, totalCards = 1, isHovered = false, onHover, customOverlap }: CardProps) {
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
      title={getCardDescription(card.name)}
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
      {/* Energy cost - positioned in top-left corner */}
      <div style={{
        position: 'absolute',
        top: '4px',
        left: '4px',
        backgroundColor: isPlayable ? '#74b9ff' : '#a0a0a0',
        color: 'white',
        borderRadius: '50%',
        width: '18px',
        height: '18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '10px',
        fontWeight: 'bold',
        zIndex: 1
      }}>
        {card.cost}
      </div>
      
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