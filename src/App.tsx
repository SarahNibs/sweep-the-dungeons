import { useGameStore } from './store'
import { GameStats } from './components/GameStats'
import { Hand } from './components/Hand'
import { Board } from './components/Board'
import { PromptWidget } from './components/PromptWidget'

function App() {
  const { 
    deck, 
    hand, 
    discard, 
    selectedCardName, 
    energy,
    maxEnergy,
    board,
    currentPlayer,
    playCard, 
    endTurn, 
    resetGame,
    canPlayCard,
    revealTile,
    getTargetingInfo,
    cancelCardTargeting
  } = useGameStore()

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#2d3436',
      padding: '20px'
    }}>
      <GameStats onResetGame={resetGame} />
      
      <PromptWidget 
        targetingInfo={getTargetingInfo()} 
        onCancel={cancelCardTargeting}
      />

      <Board board={board} onTileClick={revealTile} targetingInfo={getTargetingInfo()} />

      <Hand 
        cards={hand} 
        onCardClick={playCard} 
        canPlayCard={canPlayCard}
        deckCount={deck.length}
        discardCount={discard.length}
        energy={energy}
        maxEnergy={maxEnergy}
        onEndTurn={endTurn}
      />
    </div>
  )
}

export default App