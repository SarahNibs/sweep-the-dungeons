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

function getRelicIcon(relicName: string): string {
  switch (relicName) {
    case 'Double Broom':
      return '🧹'
    case 'Dust Bunny':
      return '🐰'
    case 'Frilly Dress':
      return '👗'
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
    debugWinLevel
  } = useGameStore()

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
            <TileCountsVertical board={board} />
            
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
                  color: 'white',
                  marginTop: 'auto' // Push to bottom of strip
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