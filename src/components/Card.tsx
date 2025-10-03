import { Card as CardType } from '../types'
import { getCardIcon, getCardDescription } from '../game/gameRepository'
import { useGameStore } from '../store'

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
  const { activeStatusEffects } = useGameStore()
  
  // Calculate effective cost considering status effects
  const getEffectiveCost = (card: CardType): number => {
    let cost = card.cost
    
    // Horse discount: Horse cards cost 0
    const hasHorseDiscount = activeStatusEffects.some(effect => effect.type === 'horse_discount')
    if (hasHorseDiscount && card.name === 'Horse') {
      cost = 0
    }
    
    return cost
  }
  
  const effectiveCost = getEffectiveCost(card)
  
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
      title={getCardDescription(card)}
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
        {renderEnergyPips(effectiveCost, isPlayable)}
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
          {getCardIcon(card.name)}
        </div>
      </div>
    </div>
  )
}