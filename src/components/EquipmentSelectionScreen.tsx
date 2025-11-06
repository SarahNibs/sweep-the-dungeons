import { useState } from 'react'
import { EquipmentOption, Equipment, Card as CardType } from '../types'
import { getEquipmentIcon } from '../game/gameRepository'
import { PileViewingScreen } from './PileViewingScreen'
import { Tooltip } from './Tooltip'
import { Card } from './Card'

interface EquipmentSelectionScreenProps {
  equipmentOptions: EquipmentOption[]
  onEquipmentSelect: (equipment: Equipment) => void
  currentDeck: CardType[]
  waitingForCardRemoval?: boolean
  bootsTransformMode?: boolean
  onCardRemovalSelect?: (cardId: string) => void
}

export function EquipmentSelectionScreen({
  equipmentOptions,
  onEquipmentSelect,
  currentDeck,
  waitingForCardRemoval,
  bootsTransformMode,
  onCardRemovalSelect
}: EquipmentSelectionScreenProps) {
  const [viewingDeck, setViewingDeck] = useState(false)

  // Show card removal UI if Boots equipment was selected
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
          {bootsTransformMode
            ? 'Select a card to transform into a random double-upgraded card'
            : 'Select a card to remove from your deck'}
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
        margin: '0 0 20px 0',
        textAlign: 'center'
      }}>
        Choose Equipment
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

      {/* Three equipment options */}
      <div style={{
        display: 'flex',
        gap: '40px',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap'
      }}>
        {equipmentOptions.map((option, index) => (
          <Tooltip key={index} text={option.equipment.hoverText} style={{ display: 'inline-block' }}>
            <div
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
              onClick={() => onEquipmentSelect(option.equipment)}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#74b9ff'
                e.currentTarget.style.backgroundColor = 'rgba(116, 185, 255, 0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'transparent'
                e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.3)'
              }}
            >
            {/* Equipment Icon */}
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
              {getEquipmentIcon(option.equipment.name)}
            </div>
            
            {/* Equipment Name */}
            <div style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#74b9ff',
              marginBottom: '10px'
            }}>
              {option.equipment.name}
            </div>
            
            {/* Equipment Description */}
            <div style={{
              fontSize: '14px',
              color: '#ddd',
              lineHeight: '1.4',
              fontStyle: 'italic'
            }}>
              {option.equipment.description}
            </div>
          </div>
          </Tooltip>
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