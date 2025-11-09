import { Card as CardType } from '../types'
import { getCardIcon, getCardDescription } from '../game/gameRepository'
import { useGameStore } from '../store'
import { Tooltip } from './Tooltip'

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
  applyStatusEffects?: boolean
}

export function Card({ card, onClick, isPlayable, index = 0, totalCards = 1, isHovered = false, onHover, customOverlap, showUpgradeIndicator, applyStatusEffects = true }: CardProps) {
  const { activeStatusEffects } = useGameStore()
  
  // Calculate effective cost considering status effects
  const getEffectiveCost = (card: CardType): number => {
    let cost = card.cost
    
    // Only apply status effects if applyStatusEffects is true (default)
    if (applyStatusEffects) {
      // Horse discount: Horse cards cost 0
      const hasHorseDiscount = activeStatusEffects.some(effect => effect.type === 'horse_discount')
      if (hasHorseDiscount && card.name === 'Horse') {
        cost = 0
      }
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
    <div style={{ display: 'inline-block', position: 'relative' }}>
      <div
        onClick={handleClick}
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
        <Tooltip text={`Cost ${effectiveCost}`} position="right" style={{ position: 'absolute', top: '4px', left: '4px', display: 'inline-block' }}>
          <div style={{ zIndex: 1 }}>
            {renderEnergyPips(effectiveCost, isPlayable)}
          </div>
        </Tooltip>

      {/* Energy-reduced indicator - positioned on left side, above enhanced indicator */}
      {(showUpgradeIndicator === 'cost_reduction' || card.energyReduced) && (
        <Tooltip text="refunds 1 energy when played" position="left" style={{ position: 'absolute', bottom: '30px', left: '4px', display: 'inline-block' }}>
          <div style={{
            backgroundColor: '#00b894',
            borderRadius: '50%',
            width: '16px',
            height: '16px',
            zIndex: 1
          }} />
        </Tooltip>
      )}

      {/* Enhanced effect indicator - positioned in lower left */}
      {(showUpgradeIndicator === 'enhance_effect' || card.enhanced) && (
        <div style={{
          position: 'absolute',
          bottom: '8px',
          left: '4px',
          zIndex: 1,
          backgroundColor: '#a29bfe',
          borderRadius: '50%',
          width: '16px',
          height: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '12px',
          fontWeight: 'bold'
        }}>
          +
        </div>
      )}

      {/* Card content with tooltip */}
      <Tooltip text={getCardDescription(card)} style={{ position: 'relative', width: '100%', height: '100%', display: 'block' }}>
        <div style={{
          position: 'relative',
          width: '100%',
          height: '100%'
        }}>
          {/* Card name at top */}
          <h3 style={{
            margin: '26px 4px 0 4px',
            fontSize: '12px',
            fontWeight: 'bold',
            lineHeight: '1.1',
            color: isPlayable ? '#2d3436' : '#636e72',
            textAlign: 'center'
          }}>
            {card.name}
          </h3>

          {/* Card icon positioned from bottom */}
          <div style={{
            position: 'absolute',
            bottom: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '28px',
            lineHeight: '1',
            userSelect: 'none'
          }}>
            {getCardIcon(card.name)}
          </div>
        </div>
      </Tooltip>
    </div>
    </div>
  )
}