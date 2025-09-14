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
}

export function Card({ card, onClick, isPlayable }: CardProps) {
  const handleClick = () => {
    if (isPlayable) {
      onClick(card.id)
    }
  }

  return (
    <div
      onClick={handleClick}
      title={getCardDescription(card.name)}
      style={{
        width: '80px',
        height: '100px',
        border: `2px solid ${isPlayable ? '#5a5a5a' : '#8a8a8a'}`,
        borderRadius: '6px',
        padding: '4px',
        margin: '2px',
        backgroundColor: isPlayable ? '#e8e8e8' : '#d5d5d5',
        cursor: isPlayable ? 'pointer' : 'not-allowed',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        transition: 'transform 0.1s, box-shadow 0.1s',
        opacity: isPlayable ? 1 : 0.6
      }}
      onMouseEnter={(e) => {
        if (isPlayable) {
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)'
        }
      }}
      onMouseLeave={(e) => {
        if (isPlayable) {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = 'none'
        }
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <h3 style={{ 
          margin: '0 0 4px 0', 
          fontSize: '12px', 
          fontWeight: 'bold',
          lineHeight: '1.1',
          color: isPlayable ? '#2d3436' : '#636e72'
        }}>
          {card.name}
        </h3>
      </div>
      
      <div style={{
        fontSize: '24px',
        lineHeight: '1',
        userSelect: 'none'
      }}>
        {getCardImage(card.name)}
      </div>
      
      <div style={{
        backgroundColor: isPlayable ? '#74b9ff' : '#a0a0a0',
        color: 'white',
        borderRadius: '50%',
        width: '18px',
        height: '18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '10px',
        fontWeight: 'bold'
      }}>
        {card.cost}
      </div>
    </div>
  )
}