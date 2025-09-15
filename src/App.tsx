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
    energy,
    maxEnergy,
    board,
    gameStatus,
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
    </div>
  )
}

export default App