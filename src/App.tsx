import { useGameStore } from './store'
import { getCardIcon } from './game/gameRepository'
import { GameStats } from './components/GameStats'
import { Hand } from './components/Hand'
import { Board } from './components/Board'
import { PromptWidget } from './components/PromptWidget'
import { CardSelectionScreen } from './components/CardSelectionScreen'
import { UpgradeSelectionScreen } from './components/UpgradeSelectionScreen'
import { RelicSelectionScreen } from './components/RelicSelectionScreen'
import { ShopSelectionScreen } from './components/ShopSelectionScreen'
import { PileViewingScreen } from './components/PileViewingScreen'
import { TileCountsVertical } from './components/TileCountsVertical'
import { StatusEffects } from './components/StatusEffects'
import { useEffect, useState } from 'react'

function getRelicIcon(relicName: string): string {
  switch (relicName) {
    case 'Double Broom':
      return '🧹'
    case 'Dust Bunny':
      return '🐰'
    case 'Frilly Dress':
      return '👗'
    case 'Busy Canary':
      return '🐦'
    case 'Mop':
      return '🧽'
    case 'Monster':
      return '🥤'
    case 'Estrogen':
      return '💉'
    case 'Progesterone':
      return '💊'
    case 'Tiara':
      return '👑'
    default:
      return '✨'
  }
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
    board,
    gameStatus,
    currentLevelId,
    gamePhase,
    cardSelectionOptions,
    upgradeOptions,
    relicOptions,
    relics,
    relicUpgradeResults,
    shopOptions,
    purchasedShopItems,
    pileViewingType,
    activeStatusEffects,
    annotationButtons,
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
    selectRelic,
    closeRelicUpgradeDisplay,
    purchaseShopItem,
    removeSelectedCard,
    exitShop,
    getAllCardsInCollection,
    viewPile,
    closePileView,
    debugWinLevel,
    debugGiveRelic,
    debugGiveCard,
    toggleAnnotationButton
  } = useGameStore()

  // Debug UI state
  const [showRelicDebug, setShowRelicDebug] = useState(false)
  const [showCardDebug, setShowCardDebug] = useState(false)
  const [cardUpgradeType, setCardUpgradeType] = useState<'normal' | 'cost-reduced' | 'enhanced'>('normal')

  // Add keyboard shortcuts for toggling annotation buttons
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle keys when not in an input field and game is playing
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement ||
          gamePhase !== 'playing') {
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
        />

        {/* Board area with side strips */}
        <div style={{
          display: 'flex',
          gap: '20px',
          alignItems: 'flex-start',
          margin: '20px 0'
        }}>
          {/* Left strip for copper, relics */}
          <div style={{
            width: '80px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            marginTop: '20px' // Align with board grid (board has 20px internal padding)
          }}>
            {/* Copper counter at top - using original styling */}
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
              title={`Copper: ${copper}`}
            >
              {copper}
            </div>
            
            {/* Relics vertically */}
            {relics.length > 0 && relics.map((relic, index) => (
              <div
                key={index}
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
                title={relic.hoverText}
              >
                {getRelicIcon(relic.name)}
              </div>
            ))}
          </div>
          
          {/* Board */}
          <Board board={board} onTileClick={revealTile} targetingInfo={getTargetingInfo()} />
          
          {/* Right strip for tile counts */}
          <div style={{
            width: '80px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            alignItems: 'center',
            marginTop: '20px' // Align with board grid (board has 20px internal padding)
          }}>
            {/* Tile counts vertically */}
            <TileCountsVertical 
              board={board} 
              annotationButtons={annotationButtons}
              onToggleButton={toggleAnnotationButton}
            />
            
            {/* Status effects - bottom-aligned */}
            <div style={{ marginTop: 'auto', marginBottom: '10px' }}>
              <StatusEffects statusEffects={activeStatusEffects} />
            </div>
            
            {/* Debug Buttons at bottom */}
            {gameStatus.status === 'playing' && (
              <>
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
                  title="Debug: Instantly win the current level"
                >
                  ▶
                </div>
                
                <div
                  onClick={() => setShowRelicDebug(true)}
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
                  title="Debug: Give relic"
                >
                  ✨
                </div>
                
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
                  title="Debug: Give card"
                >
                  🃏
                </div>
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
        />
      </div>

      {/* Card Selection Screen */}
      {gamePhase === 'card_selection' && cardSelectionOptions && (
        <CardSelectionScreen
          cards={cardSelectionOptions}
          onCardSelect={selectNewCard}
          onSkip={skipCardSelection}
          currentDeck={getAllCardsInCollection()}
        />
      )}

      {/* Upgrade Selection Screen */}
      {gamePhase === 'upgrade_selection' && upgradeOptions && (
        <UpgradeSelectionScreen
          upgradeOptions={upgradeOptions}
          onUpgradeSelect={selectUpgrade}
          currentDeck={getAllCardsInCollection()}
          waitingForCardRemoval={waitingForCardRemoval}
          onCardRemovalSelect={selectCardForRemoval}
        />
      )}

      {/* Relic Selection Screen */}
      {gamePhase === 'relic_selection' && relicOptions && (
        <RelicSelectionScreen
          relicOptions={relicOptions}
          onRelicSelect={selectRelic}
        />
      )}

      {/* Relic Upgrade Display */}
      {gamePhase === 'relic_upgrade_display' && relicUpgradeResults && (
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
              {relicUpgradeResults.map((result, index) => (
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
                        {result.before.costReduced && ' • Cost Reduced'}
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
                        {result.after.costReduced && ' • Cost Reduced'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <button
              onClick={closeRelicUpgradeDisplay}
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
      {gamePhase === 'shop_selection' && shopOptions && (
        <ShopSelectionScreen
          shopOptions={shopOptions}
          onPurchase={purchaseShopItem}
          onExit={exitShop}
          currentCopper={copper}
          purchasedItems={purchasedShopItems}
          waitingForCardRemoval={waitingForCardRemoval}
          onCardRemovalSelect={removeSelectedCard}
          currentDeck={getAllCardsInCollection()}
        />
      )}

      {/* Pile Viewing Screen */}
      {gamePhase === 'viewing_pile' && pileViewingType && (
        <PileViewingScreen
          pileType={pileViewingType}
          cards={pileViewingType === 'deck' ? deck : pileViewingType === 'discard' ? discard : exhaust}
          onClose={closePileView}
        />
      )}

      {/* Debug Relic Selection Overlay */}
      {showRelicDebug && (
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
            <h3 style={{ margin: '0 0 15px 0', textAlign: 'center' }}>Debug: Give Relic</h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '10px',
              marginBottom: '15px'
            }}>
              {['Double Broom', 'Dust Bunny', 'Frilly Dress', 'Busy Canary', 'Mop', 'Monster', 'Estrogen', 'Progesterone', 'Tiara'].map(relicName => (
                <button
                  key={relicName}
                  onClick={() => {
                    console.log(`🖱️ UI: Clicking relic button for "${relicName}"`)
                    debugGiveRelic(relicName)
                    setShowRelicDebug(false)
                    console.log(`🖱️ UI: Relic button click completed`)
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
                  {getRelicIcon(relicName)} {relicName}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowRelicDebug(false)}
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
              {[
                'Imperious Orders', 'Vague Orders', 'Spritz', 'Brush', 'Sweep', 'Elimination',
                'Quantum Choice', 'Energized', 'Options', 'Ramble', 'Report', 'Underwire',
                'Tryst', 'Canary', 'Tingle', 'Monster', 'Argument', 'Horse', 'Eavesdropping'
              ].map(cardName => (
                <button
                  key={cardName}
                  onClick={() => {
                    console.log(`🖱️ UI: Clicking card button for "${cardName}" with upgrade "${cardUpgradeType}"`)
                    const upgrades = cardUpgradeType === 'cost-reduced' 
                      ? { costReduced: true }
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
                  {cardName}
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