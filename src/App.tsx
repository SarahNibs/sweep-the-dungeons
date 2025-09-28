import { useGameStore } from './store'
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
import { useEffect } from 'react'

function getRelicIcon(relicName: string): string {
  switch (relicName) {
    case 'Double Broom':
      return '🧹'
    case 'Dust Bunny':
      return '🐰'
    case 'Frilly Dress':
      return '👗'
    case 'Busy Canary':
      return '🐦' // Same as Canary card
    case 'Mop':
      return '🧽' // Different from default star
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
    purchaseShopItem,
    removeSelectedCard,
    exitShop,
    getAllCardsInCollection,
    viewPile,
    closePileView,
    debugWinLevel,
    toggleAnnotationButton
  } = useGameStore()

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
            
            {/* Debug Win Button at bottom */}
            {gameStatus.status === 'playing' && (
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
                  color: 'white'
                }}
                title="Debug: Instantly win the current level"
              >
                ▶
              </div>
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
    </div>
  )
}

export default App