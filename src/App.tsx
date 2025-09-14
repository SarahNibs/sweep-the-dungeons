import { useGameStore } from './store'
import { GameStats } from './components/GameStats'
import { Hand } from './components/Hand'
import { Board } from './components/Board'

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
      backgroundColor: '#e9ecef',
      padding: '20px'
    }}>
      <GameStats />
      
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '16px',
        margin: '20px 0'
      }}>
        {getTargetingInfo() && (
          <button
            onClick={cancelCardTargeting}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              backgroundColor: '#ffc107',
              color: 'black',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        )}
        <button
          onClick={resetGame}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Reset Game
        </button>
      </div>

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