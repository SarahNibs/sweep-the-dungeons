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
    playCard, 
    endTurn, 
    resetGame,
    canPlayCard,
    revealTile
  } = useGameStore()

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#e9ecef',
      padding: '20px'
    }}>
      <GameStats
        selectedCardName={selectedCardName}
      />
      
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '16px',
        margin: '20px 0'
      }}>
        <button
          onClick={endTurn}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          End Turn
        </button>
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

      <Board board={board} onTileClick={revealTile} />

      <Hand 
        cards={hand} 
        onCardClick={playCard} 
        canPlayCard={canPlayCard}
        deckCount={deck.length}
        discardCount={discard.length}
        energy={energy}
        maxEnergy={maxEnergy}
      />
    </div>
  )
}

export default App