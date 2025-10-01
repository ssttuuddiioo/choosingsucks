'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FaRegHandPeace, FaRegHandPaper, FaHeartBroken } from "react-icons/fa"
import { PiHandFist } from "react-icons/pi"
import { Trophy, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRealtime } from '@/lib/hooks/use-realtime'
import { createBrowserClient } from '@/lib/utils/supabase-client'
import CardLoader from '@/components/ui/card-loader'
import type { Tables } from '@/types/supabase'

type Move = 'rock' | 'paper' | 'scissors'
type GameStatus = 'waiting' | 'playing' | 'reveal' | 'finished'

interface GenericRPSProps {
  session: Tables<'sessions'>
  participant: Tables<'participants'>
  category: 'restaurants' | 'streaming' | 'music' | 'gifts' | 'activities' | 'dates'
  onBack?: () => void
  initialMove?: string | null
  gameId?: string | null
  winnerContent?: any[] // The content that the winner gets to choose from
}

interface GameState {
  id: string
  status: GameStatus
  round: number
  moves: Record<string, Move>
  winner?: string
  winnerName?: string
}

const moveIcons = {
  rock: PiHandFist,
  paper: FaRegHandPaper,
  scissors: FaRegHandPeace,
}

const moveNames = {
  rock: 'Rock',
  paper: 'Paper', 
  scissors: 'Scissors',
}

const winnerMessages = [
  "Victory is yours!",
  "Winner winner!",
  "You've got the power!",
  "Democracy has spoken!",
  "Fate has decided!"
]

const categoryMessages = {
  restaurants: {
    noMatches: "Nobody agreed on the same restaurant. Let's settle this!",
    weapon: "Choose your weapon:",
    winnerChooses: "Winner gets to choose where you eat.",
    resultTitle: "We have a winner!"
  },
  streaming: {
    noMatches: "Nobody agreed on the same show or movie. Let's settle this!",
    weapon: "Choose your weapon:",
    winnerChooses: "Winner gets to choose what to watch.",
    resultTitle: "We have a winner!"
  },
  music: {
    noMatches: "Nobody agreed on the same music. Let's settle this!",
    weapon: "Choose your weapon:",
    winnerChooses: "Winner gets to choose what to listen to.",
    resultTitle: "We have a winner!"
  },
  gifts: {
    noMatches: "Nobody agreed on the same gift idea. Let's settle this!",
    weapon: "Choose your weapon:",
    winnerChooses: "Winner gets to choose the gift.",
    resultTitle: "We have a winner!"
  },
  activities: {
    noMatches: "Nobody agreed on the same activity. Let's settle this!",
    weapon: "Choose your weapon:",
    winnerChooses: "Winner gets to choose what to do.",
    resultTitle: "We have a winner!"
  },
  dates: {
    noMatches: "Nobody agreed on the same date idea. Let's settle this!",
    weapon: "Choose your weapon:",
    winnerChooses: "Winner gets to choose the date.",
    resultTitle: "We have a winner!"
  }
}

export default function GenericRockPaperScissors({ 
  session, 
  participant, 
  category,
  onBack, 
  initialMove, 
  gameId,
  winnerContent = []
}: GenericRPSProps) {
  
  const [gameState, setGameState] = useState<GameState>({
    id: gameId || '',
    status: initialMove ? 'playing' : 'waiting',
    round: 1,
    moves: {},
  })
  const [myMove, setMyMove] = useState<Move | null>(initialMove as Move | null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient()
  const messages = categoryMessages[category]

  // Realtime subscription for game updates
  const { broadcast } = useRealtime({
    channel: `rps:${session.id}:${category}`,
    onMessage: (payload) => {
      console.log('RPS realtime message:', payload)
      
      if (payload.event === 'game_update') {
        setGameState(payload.payload)
      } else if (payload.event === 'move_made') {
        setGameState(prev => ({
          ...prev,
          moves: {
            ...prev.moves,
            [payload.payload.participantId]: payload.payload.move
          }
        }))
      } else if (payload.event === 'round_complete') {
        handleRoundComplete(payload.payload)
      }
    },
  })

  // Initialize or join game
  useEffect(() => {
    initializeGame()
  }, [])

  async function initializeGame() {
    try {
      setLoading(true)

      let game
      
      if (gameId) {
        // Join existing game
        const { data } = await supabase
          .from('rps_games')
          .select('*')
          .eq('id', gameId)
          .single()
        
        game = data
      } else {
        // Create new game
        // Note: Insert needs 'as any' due to Supabase client's complex type inference
        const { data, error } = await (supabase as any)
          .from('rps_games')
          .insert({
            session_id: session.id,
            round_number: 1,
            status: 'waiting',
          })
          .select()
          .single()

        if (error) throw error
        game = data
      }

      if (game) {
        setGameState({
          id: game.id,
          status: game.status as GameStatus,
          round: game.round_number,
          moves: {},
        })

        // If we have an initial move, make it
        if (initialMove) {
          await makeMove(initialMove as Move)
        }
      }

    } catch (error) {
      console.error('Error initializing RPS game:', error)
    } finally {
      setLoading(false)
    }
  }

  async function makeMove(move: Move) {
    if (myMove || gameState.status !== 'playing' && gameState.status !== 'waiting') return

    setMyMove(move)

    try {
      // Update game status to playing if it was waiting
      if (gameState.status === 'waiting') {
        // Note: Update needs 'as any' due to Supabase client's complex type inference
        await (supabase as any)
          .from('rps_games')
          .update({ status: 'playing' })
          .eq('id', gameState.id)
        
        setGameState(prev => ({ ...prev, status: 'playing' }))
      }

      // Save move to database
      // Note: Insert needs 'as any' due to Supabase client's complex type inference
      await (supabase as any)
        .from('rps_moves')
        .insert({
          game_id: gameState.id,
          participant_id: participant.id,
          round_number: gameState.round,
          move,
        })

      // Broadcast move
      broadcast('move_made', {
        participantId: participant.id,
        move,
      })

      // Update local state
      const newMoves = {
        ...gameState.moves,
        [participant.id]: move,
      }

      setGameState(prev => ({
        ...prev,
        moves: newMoves,
      }))

      // Check if both players have moved
      const moveCount = Object.keys(newMoves).length
      if (moveCount >= 2) {
        // Wait a moment for dramatic effect, then reveal
        setTimeout(() => {
          determineWinner(newMoves)
        }, 1000)
      }

    } catch (error) {
      console.error('Error making move:', error)
      setMyMove(null)
    }
  }

  function determineWinner(moves: Record<string, Move>) {
    const participantIds = Object.keys(moves)
    const [player1Id, player2Id] = participantIds
    const move1 = moves[player1Id]
    const move2 = moves[player2Id]

    let winnerId: string | null = null

    // Determine winner
    if (move1 === move2) {
      // Tie - start new round
      setTimeout(() => {
        startNewRound()
      }, 2000)
      return
    }

    if (
      (move1 === 'rock' && move2 === 'scissors') ||
      (move1 === 'paper' && move2 === 'rock') ||
      (move1 === 'scissors' && move2 === 'paper')
    ) {
      winnerId = player1Id
    } else {
      winnerId = player2Id
    }

    // Update game state to show winner
    setGameState(prev => ({
      ...prev,
      status: 'reveal',
      winner: winnerId,
    }))

    // Finish the game after showing results
    setTimeout(() => {
      finishGame(winnerId!)
    }, 3000)
  }

  async function startNewRound() {
    const newRound = gameState.round + 1
    
    try {
      // Note: Update needs 'as any' due to Supabase client's complex type inference
      await (supabase as any)
        .from('rps_games')
        .update({ 
          round_number: newRound,
          status: 'playing'
        })
        .eq('id', gameState.id)

      // Clear moves for new round
      await supabase
        .from('rps_moves')
        .delete()
        .eq('game_id', gameState.id)
        .eq('round_number', gameState.round)

      setGameState(prev => ({
        ...prev,
        round: newRound,
        moves: {},
        status: 'playing'
      }))
      
      setMyMove(null)

      broadcast('round_complete', {
        round: newRound,
        moves: {},
      })

    } catch (error) {
      console.error('Error starting new round:', error)
    }
  }

  async function finishGame(winnerId: string) {
    try {
      // Get winner info
      const { data: winner } = await supabase
        .from('participants')
        .select('display_name')
        .eq('id', winnerId)
        .single()
      
      const winnerData = winner as { display_name: string | null } | null

      // Update game status
      // Note: Update needs 'as any' due to Supabase client's complex type inference
      await (supabase as any)
        .from('rps_games')
        .update({
          status: 'finished',
          winner_participant_id: winnerId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', gameState.id)

      setGameState(prev => ({
        ...prev,
        status: 'finished',
        winner: winnerId,
        winnerName: winnerData?.display_name || 'Anonymous',
      }))

    } catch (error) {
      console.error('Error finishing game:', error)
    }
  }

  function handleRoundComplete(payload: any) {
    setGameState(prev => ({
      ...prev,
      round: payload.round,
      moves: payload.moves || {},
    }))
    setMyMove(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
        <CardLoader message="Setting up the game..." />
      </div>
    )
  }

  // Game finished - show winner
  if (gameState.status === 'finished') {
    const randomMessage = winnerMessages[Math.floor(Math.random() * winnerMessages.length)]
    const isWinner = gameState.winner === participant.id

    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full text-center space-y-6"
        >
          <div className="space-y-4">
            <Trophy className="w-20 h-20 text-yellow-400 mx-auto" />
            <h1 className="text-3xl font-outfit font-bold gradient-text">
              {messages.resultTitle}
            </h1>
            <p className="text-white/80 text-lg">
              {isWinner ? randomMessage : `${gameState.winnerName} wins!`}
            </p>
          </div>

          {isWinner && winnerContent.length > 0 && (
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white">Your winning choices:</h2>
              <div className="space-y-2">
                {winnerContent.slice(0, 3).map((item, index) => (
                  <div key={index} className="bg-white/20 rounded-xl p-3 text-white text-sm">
                    {typeof item === 'string' ? item : item.title || item.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button 
            onClick={onBack}
            className="w-full bg-gradient-electric text-white py-3 rounded-xl font-bold hover:scale-105 transition-transform"
          >
            Create New Session
          </Button>
        </motion.div>
      </div>
    )
  }

  // Show moves being revealed
  if (gameState.status === 'reveal') {
    const participantIds = Object.keys(gameState.moves)
    const moves = participantIds.map(id => ({
      id,
      move: gameState.moves[id],
      isMe: id === participant.id
    }))

    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full text-center space-y-6"
        >
          <h1 className="text-2xl font-outfit font-bold text-white">Results!</h1>
          
          <div className="grid grid-cols-2 gap-4">
            {moves.map((playerMove) => {
              const Icon = moveIcons[playerMove.move]
              return (
                <motion.div
                  key={playerMove.id}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={`p-6 rounded-2xl text-center ${
                    playerMove.isMe ? 'bg-gradient-electric' : 'bg-white/20'
                  }`}
                >
                  <Icon className="w-16 h-16 text-white mx-auto mb-2" />
                  <div className="text-white font-bold">
                    {playerMove.isMe ? 'You' : 'Opponent'}
                  </div>
                  <div className="text-white/70 text-sm">
                    {moveNames[playerMove.move]}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      </div>
    )
  }

  // Waiting for other player or showing moves
  if (gameState.status === 'playing' && myMove) {
    const MyIcon = moveIcons[myMove]
    const waitingForOpponent = Object.keys(gameState.moves).length < 2

    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full text-center space-y-6"
        >
          <div className="space-y-4">
            <h1 className="text-2xl font-outfit font-bold text-white">
              {waitingForOpponent ? 'Waiting for opponent...' : 'Round Complete!'}
            </h1>
            
            <div className="bg-gradient-electric p-6 rounded-2xl">
              <MyIcon className="w-20 h-20 text-white mx-auto mb-2" />
              <div className="text-white font-bold text-lg">Your Move</div>
              <div className="text-white/80">{moveNames[myMove]}</div>
            </div>

            {waitingForOpponent && (
              <p className="text-white/70">
                Waiting for the other player to make their move...
              </p>
            )}
          </div>
        </motion.div>
      </div>
    )
  }

  // Main game interface - choose your move
  return (
    <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-md w-full text-center space-y-6"
      >
        {/* Main message */}
        <div className="space-y-3">
          <FaHeartBroken className="text-6xl text-white mx-auto" />
          <h1 className="text-2xl font-outfit font-bold gradient-text">No matches found!</h1>
          <p className="text-white/70 text-lg">
            {messages.noMatches}
          </p>
        </div>

        {/* Rock Paper Scissors - Direct Play */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">{messages.weapon}</h2>
          
          {/* RPS Icons - Direct tap to play */}
          <div className="grid grid-cols-3 gap-4">
            {(['rock', 'paper', 'scissors'] as Move[]).map((move) => {
              const Icon = moveIcons[move]
              return (
                <motion.button
                  key={move}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => makeMove(move)}
                  className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 hover:bg-white/30 transition-colors group"
                >
                  <Icon className="w-12 h-12 text-white mx-auto mb-2 group-hover:scale-110 transition-transform transform -rotate-90" />
                  <div className="text-white font-medium text-sm">{moveNames[move]}</div>
                </motion.button>
              )
            })}
          </div>
          
          <p className="text-white/60 text-sm">
            {messages.winnerChooses}
          </p>
        </div>

        {/* Alternative options */}
        <div className="pt-4 border-t border-white/10">
          <button
            onClick={onBack}
            className="w-full bg-gradient-electric text-white py-3 rounded-xl font-bold hover:scale-105 transition-transform"
          >
            Create New Swipe Session
          </button>
        </div>
      </motion.div>
    </div>
  )
}
