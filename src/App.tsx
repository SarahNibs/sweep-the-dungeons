import { useGameStore } from './store'
import { getCardIcon, getAllEquipment, getEquipmentIcon as getEquipmentIconFromRepo } from './game/gameRepository'
import { GameStats } from './components/GameStats'
import { Hand } from './components/Hand'
import { Board } from './components/Board'
import { PromptWidget } from './components/PromptWidget'
import { CardSelectionScreen } from './components/CardSelectionScreen'
import { UpgradeSelectionScreen } from './components/UpgradeSelectionScreen'
import { EquipmentSelectionScreen } from './components/EquipmentSelectionScreen'
import { ShopSelectionScreen } from './components/ShopSelectionScreen'
import { PileViewingScreen } from './components/PileViewingScreen'
import { TileCountsVertical } from './components/TileCountsVertical'
import { StatusEffects } from './components/StatusEffects'
import { Tooltip } from './components/Tooltip'
import { useEffect, useState, useMemo } from 'react'

// Helper to get all card names from the repository
async function getAllCardNames(): Promise<string[]> {
  const { CARD_DEFINITIONS } = await import('./game/gameRepository')
  return Object.keys(CARD_DEFINITIONS)
}

function App() {
  const {
    deck,
    hand,
    discard,
    exhaust,
    energy,
    maxEnergy,
    copper,
    playerTilesRevealedCount,
    board,
    gameStatus,
    currentLevelId,
    gamePhase,
    modalStack,
    cardSelectionOptions,
    upgradeOptions,
    equipmentOptions,
    equipment,
    equipmentUpgradeResults,
    shopOptions,
    purchasedShopItems,
    pileViewingType,
    activeStatusEffects,
    annotationButtons,
    maskingState,
    napState,
    playCard,
    endTurn,
    resetGame,
    canPlayCard,
    revealTile,
    getTargetingInfo,
    cancelCardTargeting,
    startCardSelection,
    selectNewCard,
    skipCardSelection,
    selectUpgrade,
    selectCardForRemoval,
    waitingForCardRemoval,
    bootsTransformMode,
    selectEquipment,
    closeEquipmentUpgradeDisplay,
    purchaseShopItem,
    removeSelectedCard,
    exitShop,
    getAllCardsInCollection,
    viewPile,
    closePileView,
    selectCardForNap,
    debugWinLevel,
    debugGiveEquipment,
    debugGiveCard,
    toggleAnnotationButton,
    glassesNeedsTingleAnimation,
    executeTingleWithAnimation,
    espressoForcedPlay,
    espressoSpecialCard,
    executeTrystWithAnimation
  } = useGameStore()

  // Determine current screen: check modal stack first, then fall back to gamePhase
  const currentScreen = modalStack.length > 0 ? modalStack[modalStack.length - 1] : gamePhase

  // Debug UI state
  const [showEquipmentDebug, setShowEquipmentDebug] = useState(false)
  const [showCardDebug, setShowCardDebug] = useState(false)
  const [cardUpgradeType, setCardUpgradeType] = useState<'normal' | 'cost-reduced' | 'enhanced'>('normal')
  const [debugButtonsVisible, setDebugButtonsVisible] = useState(false)

  // Load all equipment and cards dynamically for debug tools
  const allEquipment = useMemo(() => getAllEquipment(), [])
  const [allCardNames, setAllCardNames] = useState<string[]>([])

  useEffect(() => {
    getAllCardNames().then(setAllCardNames)
  }, [])

  // Expose store to window for debugging
  useEffect(() => {
    (window as any).useGameStore = useGameStore
  }, [])

  // Check for Glasses equipment Tingle animation on turn start
  useEffect(() => {
    if (glassesNeedsTingleAnimation) {
      const state = useGameStore.getState()
      executeTingleWithAnimation(state, false)
      // Clear the flag after triggering animation
      useGameStore.setState({ glassesNeedsTingleAnimation: false })
    }
  }, [glassesNeedsTingleAnimation, executeTingleWithAnimation])

  // Check for Espresso special card handling
  useEffect(() => {
    if (espressoSpecialCard) {
      console.log('☕ ESPRESSO: Handling special card:', espressoSpecialCard)

      if (espressoSpecialCard.type === 'tingle') {
        // Play Tingle with animation
        playCard(espressoSpecialCard.cardId)
        // Clear the flag
        useGameStore.setState({ espressoSpecialCard: undefined })
      } else if (espressoSpecialCard.type === 'tryst') {
        // Play non-enhanced Tryst with animation
        playCard(espressoSpecialCard.cardId)
        // Clear the flag
        useGameStore.setState({ espressoSpecialCard: undefined })
      } else if (espressoSpecialCard.type === 'masking') {
        // Play Masking card - this will enter masking state, player will select a card
        playCard(espressoSpecialCard.cardId)
        // Clear the flag
        useGameStore.setState({ espressoSpecialCard: undefined })
      } else if (espressoSpecialCard.type === 'targeting') {
        // Play targeting card - this will enter targeting mode with espressoForcedPlay flag set
        playCard(espressoSpecialCard.cardId)
        // Clear the flag
        useGameStore.setState({ espressoSpecialCard: undefined })
      } else if (espressoSpecialCard.type === 'nap') {
        // Play Nap card - this will enter nap state for selecting card from exhaust
        playCard(espressoSpecialCard.cardId)
        // Clear the flag
        useGameStore.setState({ espressoSpecialCard: undefined })
      }
    }
  }, [espressoSpecialCard, playCard, executeTingleWithAnimation, executeTrystWithAnimation])

  // Add keyboard shortcuts for toggling annotation buttons and debug buttons
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle keys when not in an input field
      if (event.target instanceof HTMLInputElement ||
          event.target instanceof HTMLTextAreaElement) {
        return
      }

      // Handle 'd' key for debug button toggle (works in any phase)
      if (event.key.toLowerCase() === 'd') {
        setDebugButtonsVisible(prev => !prev)
        event.preventDefault()
        return
      }

      // Other shortcuts only work when game is playing
      if (gamePhase !== 'playing') {
        return
      }

      switch (event.key.toLowerCase()) {
        case 'w':
          toggleAnnotationButton('player')
          event.preventDefault()
          break
        case 'r':
          toggleAnnotationButton('rival')
          event.preventDefault()
          break
        case 'e':
          toggleAnnotationButton('neutral')
          event.preventDefault()
          break
        case 'f':
          toggleAnnotationButton('mine')
          event.preventDefault()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [gamePhase, toggleAnnotationButton])

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#2d3436',
      padding: '20px'
    }}>
      {/* Main game container with consistent width */}
      <div style={{
        maxWidth: '650px', // Slightly wider than info box
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <GameStats onResetGame={resetGame} gameStatus={gameStatus} />
        
        <PromptWidget
          targetingInfo={getTargetingInfo()}
          onCancel={cancelCardTargeting}
          gameStatus={gameStatus}
          currentLevel={currentLevelId}
          onAdvanceLevel={startCardSelection}
          isEspressoForcedPlay={!!espressoForcedPlay}
        />

        {/* Board area with side strips */}
        <div style={{
          display: 'flex',
          gap: '20px',
          alignItems: 'flex-start',
          margin: '20px 0'
        }}>
          {/* Left strip for copper, equipment */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            marginTop: '20px',
            maxHeight: '460px',
            minWidth: '70px',
            overflowY: 'auto'
          }}>
            {/* Copper counter */}
            <Tooltip text={`Copper: ${copper}`} style={{ display: 'block', margin: '0 auto' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: '#b8860b',
                  color: 'white',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  border: '2px solid #333',
                  margin: '0 auto'
                }}
              >
                {copper}
              </div>
            </Tooltip>

            {/* Player tile reveal counter */}
            <Tooltip
              text={`Gain 1 copper per 5 of your tiles revealed`}
              style={{ display: 'block', margin: '0 auto' }}
            >
              <div
                style={{
                  fontSize: '12px',
                  textAlign: 'center',
                  color: '#666',
                  fontWeight: 'bold',
                  margin: '0 auto'
                }}
              >
                {playerTilesRevealedCount % 5}/5
              </div>
            </Tooltip>

            {/* Equipment - simple vertical list */}
            {equipment.map((equipmentItem, index) => (
              <Tooltip key={index} text={equipmentItem.hoverText} style={{ display: 'block', margin: '0 auto' }}>
                <div
                  style={{
                    width: '50px',
                    height: '50px',
                    border: '2px solid #74b9ff',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    backgroundColor: 'rgba(116, 185, 255, 0.1)',
                    cursor: 'pointer',
                    margin: '0 auto'
                  }}
                >
                  {getEquipmentIconFromRepo(equipmentItem.name)}
                </div>
              </Tooltip>
            ))}
          </div>
          
          {/* Board */}
          <Board board={board} onTileClick={revealTile} targetingInfo={getTargetingInfo()} />
          
          {/* Right strip for tile counts */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            marginTop: '20px',
            maxHeight: '460px',
            minWidth: '70px',
            overflowY: 'auto'
          }}>
            {/* Tile counts vertically */}
            <TileCountsVertical
              board={board}
              annotationButtons={annotationButtons}
              onToggleButton={toggleAnnotationButton}
            />

            {/* Status effects */}
            <StatusEffects statusEffects={activeStatusEffects} />
            
            {/* Debug Buttons at bottom */}
            {gameStatus.status === 'playing' && debugButtonsVisible && (
              <>
                <Tooltip text="Debug: Instantly win the current floor" style={{ display: 'block' }}>
                  <div
                    onClick={debugWinLevel}
                    style={{
                      width: '30px',
                      height: '30px',
                      backgroundColor: '#28a745',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      fontSize: '16px',
                      color: 'white',
                      marginBottom: '5px'
                    }}
                  >
                    ▶
                  </div>
                </Tooltip>

                <Tooltip text="Debug: Give equipment" style={{ display: 'block' }}>
                  <div
                    onClick={() => setShowEquipmentDebug(true)}
                    style={{
                      width: '30px',
                      height: '30px',
                      backgroundColor: '#6f42c1',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      fontSize: '16px',
                      color: 'white',
                      marginBottom: '5px'
                    }}
                  >
                    ✨
                  </div>
                </Tooltip>

                <Tooltip text="Debug: Give card" style={{ display: 'block' }}>
                  <div
                    onClick={() => setShowCardDebug(true)}
                    style={{
                      width: '30px',
                      height: '30px',
                      backgroundColor: '#fd7e14',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      fontSize: '16px',
                      color: 'white'
                    }}
                  >
                    🃏
                  </div>
                </Tooltip>
              </>
            )}
          </div>
        </div>

        <Hand
          cards={hand}
          onCardClick={playCard}
          canPlayCard={canPlayCard}
          deckCount={deck.length}
          discardCount={discard.length}
          exhaustCount={exhaust.length}
          energy={energy}
          maxEnergy={maxEnergy}
          onEndTurn={endTurn}
          onPileClick={viewPile}
          maskingState={maskingState}
        />
      </div>

      {/* Card Selection Screen */}
      {currentScreen === 'card_selection' && cardSelectionOptions && (
        <CardSelectionScreen
          cards={cardSelectionOptions}
          onCardSelect={selectNewCard}
          onSkip={skipCardSelection}
          currentDeck={getAllCardsInCollection()}
        />
      )}

      {/* Upgrade Selection Screen */}
      {currentScreen === 'upgrade_selection' && upgradeOptions && (
        <UpgradeSelectionScreen
          upgradeOptions={upgradeOptions}
          onUpgradeSelect={selectUpgrade}
          currentDeck={getAllCardsInCollection()}
          waitingForCardRemoval={waitingForCardRemoval}
          bootsTransformMode={bootsTransformMode}
          onCardRemovalSelect={selectCardForRemoval}
        />
      )}

      {/* Equipment Selection Screen */}
      {currentScreen === 'equipment_selection' && equipmentOptions && (
        <EquipmentSelectionScreen
          equipmentOptions={equipmentOptions}
          onEquipmentSelect={selectEquipment}
          currentDeck={getAllCardsInCollection()}
          waitingForCardRemoval={waitingForCardRemoval}
          bootsTransformMode={bootsTransformMode}
          onCardRemovalSelect={selectCardForRemoval}
        />
      )}

      {/* Equipment Upgrade Display */}
      {currentScreen === 'equipment_upgrade_display' && equipmentUpgradeResults && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div 
            style={{
              backgroundColor: '#2d3748',
              borderRadius: '8px',
              padding: '30px',
              border: '2px solid #4a5568',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80%',
              overflow: 'auto'
            }}
          >
            <h2 style={{ 
              color: '#e2e8f0', 
              marginBottom: '20px', 
              textAlign: 'center',
              fontSize: '24px',
              fontWeight: 'bold'
            }}>
              Cards Upgraded!
            </h2>
            
            <div style={{ marginBottom: '20px' }}>
              {equipmentUpgradeResults.map((result, index) => (
                <div key={index} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  marginBottom: '15px',
                  padding: '10px',
                  backgroundColor: '#1a202c',
                  borderRadius: '6px',
                  border: '1px solid #4a5568'
                }}>
                  {/* Before Card */}
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ 
                      backgroundColor: '#374151',
                      borderRadius: '4px',
                      padding: '8px',
                      border: '1px solid #6b7280'
                    }}>
                      <div style={{ 
                        fontSize: '14px', 
                        color: '#9ca3af',
                        marginBottom: '4px'
                      }}>
                        {getCardIcon(result.before.name)} {result.before.name}
                      </div>
                      <div style={{ 
                        fontSize: '12px', 
                        color: '#6b7280'
                      }}>
                        Cost: {result.before.cost}
                        {result.before.enhanced && ' • Enhanced'}
                        {result.before.energyReduced && ' • Energy Reduced'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Arrow */}
                  <div style={{ 
                    margin: '0 15px', 
                    fontSize: '24px', 
                    color: '#10b981'
                  }}>
                    →
                  </div>
                  
                  {/* After Card */}
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ 
                      backgroundColor: '#065f46',
                      borderRadius: '4px',
                      padding: '8px',
                      border: '1px solid #10b981'
                    }}>
                      <div style={{ 
                        fontSize: '14px', 
                        color: '#d1fae5',
                        marginBottom: '4px'
                      }}>
                        {getCardIcon(result.after.name)} {result.after.name}
                      </div>
                      <div style={{ 
                        fontSize: '12px', 
                        color: '#a7f3d0'
                      }}>
                        Cost: {result.after.cost}
                        {result.after.enhanced && ' • Enhanced'}
                        {result.after.energyReduced && ' • Energy Reduced'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <button
              onClick={closeEquipmentUpgradeDisplay}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Shop Selection Screen */}
      {currentScreen === 'shop_selection' && shopOptions && (
        <ShopSelectionScreen
          shopOptions={shopOptions}
          onPurchase={purchaseShopItem}
          onExit={exitShop}
          currentCopper={copper}
          purchasedItems={purchasedShopItems}
          waitingForCardRemoval={waitingForCardRemoval}
          bootsTransformMode={bootsTransformMode}
          onCardRemovalSelect={removeSelectedCard}
          currentDeck={getAllCardsInCollection()}
        />
      )}

      {/* Pile Viewing Screen */}
      {currentScreen === 'viewing_pile' && pileViewingType && (
        <PileViewingScreen
          pileType={pileViewingType}
          cards={pileViewingType === 'deck' ? deck : pileViewingType === 'discard' ? discard : exhaust}
          onClose={closePileView}
          onCardClick={napState ? selectCardForNap : undefined}
          isNapMode={!!napState}
        />
      )}

      {/* Debug Equipment Selection Overlay */}
      {showEquipmentDebug && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '10px',
            maxWidth: '600px',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h3 style={{ margin: '0 0 15px 0', textAlign: 'center' }}>Debug: Give Equipment</h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '10px',
              marginBottom: '15px'
            }}>
              {allEquipment.map(equipmentItem => (
                <button
                  key={equipmentItem.name}
                  onClick={() => {
                    console.log(`🖱️ UI: Clicking equipment button for "${equipmentItem.name}"`)
                    debugGiveEquipment(equipmentItem.name)
                    setShowEquipmentDebug(false)
                    console.log(`🖱️ UI: Equipment button click completed`)
                  }}
                  style={{
                    padding: '10px',
                    border: '1px solid #ccc',
                    borderRadius: '5px',
                    backgroundColor: '#f8f9fa',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  {getEquipmentIconFromRepo(equipmentItem.name)} {equipmentItem.name}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowEquipmentDebug(false)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ccc',
                borderRadius: '5px',
                backgroundColor: '#6c757d',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Debug Card Selection Overlay */}
      {showCardDebug && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '10px',
            maxWidth: '600px',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h3 style={{ margin: '0 0 15px 0', textAlign: 'center' }}>Debug: Give Card</h3>
            
            {/* Upgrade Type Selection */}
            <div style={{ marginBottom: '15px', textAlign: 'center' }}>
              <label style={{ marginRight: '10px' }}>
                <input
                  type="radio"
                  name="cardUpgrade"
                  checked={cardUpgradeType === 'normal'}
                  onChange={() => setCardUpgradeType('normal')}
                />
                Normal
              </label>
              <label style={{ marginRight: '10px' }}>
                <input
                  type="radio"
                  name="cardUpgrade"
                  checked={cardUpgradeType === 'cost-reduced'}
                  onChange={() => setCardUpgradeType('cost-reduced')}
                />
                Cost Reduced
              </label>
              <label>
                <input
                  type="radio"
                  name="cardUpgrade"
                  checked={cardUpgradeType === 'enhanced'}
                  onChange={() => setCardUpgradeType('enhanced')}
                />
                Enhanced
              </label>
            </div>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: '8px',
              marginBottom: '15px'
            }}>
              {allCardNames.map(cardName => (
                <button
                  key={cardName}
                  onClick={() => {
                    console.log(`🖱️ UI: Clicking card button for "${cardName}" with upgrade "${cardUpgradeType}"`)
                    const upgrades = cardUpgradeType === 'cost-reduced'
                      ? { energyReduced: true }
                      : cardUpgradeType === 'enhanced'
                      ? { enhanced: true }
                      : undefined
                    debugGiveCard(cardName, upgrades)
                    setShowCardDebug(false)
                    console.log(`🖱️ UI: Card button click completed`)
                  }}
                  style={{
                    padding: '8px 4px',
                    border: '1px solid #ccc',
                    borderRadius: '5px',
                    backgroundColor: '#f8f9fa',
                    cursor: 'pointer',
                    fontSize: '12px',
                    textAlign: 'center'
                  }}
                >
                  {getCardIcon(cardName)} {cardName}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowCardDebug(false)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ccc',
                borderRadius: '5px',
                backgroundColor: '#6c757d',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App