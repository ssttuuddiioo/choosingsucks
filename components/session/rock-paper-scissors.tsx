'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FaRegHandPeace, FaRegHandPaper } from "react-icons/fa"
import { PiHandFist } from "react-icons/pi"
import { Trophy, Sparkles, Utensils } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRealtime } from '@/lib/hooks/use-realtime'
import { createBrowserClient } from '@/lib/utils/supabase-client'
import type { Tables } from '@/types/supabase'

type Move = 'rock' | 'paper' | 'scissors'
type GameStatus = 'waiting' | 'playing' | 'reveal' | 'finished'

interface RockPaperScissorsProps {
  session: Tables<'sessions'>
  participant: Tables<'participants'>
  onBack?: () => void
  initialMove?: string | null
  gameId?: string | null
}

interface GameState {
  id: string
  status: GameStatus
  round: number
  moves: Record<string, Move>
  winner?: string
  winnerName?: string
}

interface Candidate {
  id: string
  name: string
  place_id: string
  photo_ref?: string | null
  rating?: number | null
  price_level?: number | null
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
  "Victory is yours! 🎉",
  "Winner winner, chicken dinner! 🍗",
  "You've got the power! ⚡",
  "Democracy has spoken! 🗳️",
  "The RPS gods have chosen! 🎲",
  "Fate has decided! ✨"
]

export default function RockPaperScissors({ session, participant, onBack, initialMove, gameId }: RockPaperScissorsProps) {
  const [gameState, setGameState] = useState<GameState>({
    id: gameId || '',
    status: initialMove ? 'playing' : 'waiting',
    round: 1,
    moves: {},
  })
  const [myMove, setMyMove] = useState<Move | null>(initialMove as Move | null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [winnerRestaurants, setWinnerRestaurants] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient()

  // Realtime subscription for game updates
  const { broadcast } = useRealtime({
    channel: `rps:${session.id}`,
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
      // Check if there's an existing active game for this session
      const { data: existingGame } = await supabase
        .from('rps_games')
        .select('*')
        .eq('session_id', session.id)
        .eq('status', 'waiting')
        .single()

      if (existingGame) {
        // Join existing game
        setGameState({
          id: existingGame.id,
          status: 'waiting',
          round: existingGame.round_number,
          moves: {},
        })
      } else {
        // Create new game
        const { data: newGame, error } = await supabase
          .from('rps_games')
          .insert({
            session_id: session.id,
            status: 'waiting',
            round_number: 1,
          })
          .select()
          .single()

        if (error) throw error

        setGameState({
          id: newGame.id,
          status: 'waiting',
          round: 1,
          moves: {},
        })

        // Broadcast game creation
        broadcast('game_update', {
          id: newGame.id,
          status: 'waiting',
          round: 1,
          moves: {},
        })
      }
    } catch (error) {
      console.error('Error initializing RPS game:', error)
    } finally {
      setLoading(false)
    }
  }

  async function makeMove(move: Move) {
    if (myMove || gameState.status !== 'playing') return

    setMyMove(move)

    try {
      // Save move to database
      await supabase
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
      // Update database
      await supabase
        .from('rps_games')
        .update({
          round_number: newRound,
          updated_at: new Date().toISOString(),
        })
        .eq('id', gameState.id)

      // Reset state for new round
      setGameState(prev => ({
        ...prev,
        status: 'playing',
        round: newRound,
        moves: {},
      }))
      setMyMove(null)

      // Broadcast new round
      broadcast('game_update', {
        ...gameState,
        status: 'playing',
        round: newRound,
        moves: {},
      })

    } catch (error) {
      console.error('Error starting new round:', error)
    }
  }

  async function finishGame(winnerId: string) {
    try {
      // Get winner's name
      const { data: winner } = await supabase
        .from('participants')
        .select('display_name')
        .eq('id', winnerId)
        .single()

      // Get winner's liked restaurants
      const { data: likedRestaurants } = await supabase
        .from('swipes')
        .select(`
          candidate_id,
          candidates (
            id,
            name,
            place_id,
            photo_ref,
            rating,
            price_level
          )
        `)
        .eq('session_id', session.id)
        .eq('participant_id', winnerId)
        .eq('vote', 1)

      const restaurants = likedRestaurants?.map(swipe => swipe.candidates).filter(Boolean) || []

      // Update game status
      await supabase
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
        winnerName: winner?.display_name || 'Anonymous',
      }))
      
      setWinnerRestaurants(restaurants)

    } catch (error) {
      console.error('Error finishing game:', error)
    }
  }

  function startGame() {
    setGameState(prev => ({ ...prev, status: 'playing' }))
    broadcast('game_update', { ...gameState, status: 'playing' })
    
    // Start countdown
    let count = 3
    setCountdown(count)
    
    const countdownInterval = setInterval(() => {
      count--
      if (count > 0) {
        setCountdown(count)
      } else {
        setCountdown(null)
        clearInterval(countdownInterval)
      }
    }, 1000)
  }

  async function handleRoundComplete(payload: any) {
    // Handle round completion logic
    console.log('Round complete:', payload)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/30 mx-auto"></div>
          <p className="mt-4 text-white/70">Setting up the battle...</p>
        </div>
      </div>
    )
  }

  // Waiting for players
  if (gameState.status === 'waiting') {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full text-center space-y-6"
        >
          <div className="space-y-3">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-8xl"
            >
              ✊
            </motion.div>
            <h1 className="text-3xl font-outfit font-bold gradient-text">
              Rock Paper Scissors!
            </h1>
            <p className="text-white/70 text-lg">
              Let fate decide who gets to choose where you eat
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
            <p className="text-white/90 mb-4">
              Since nobody could agree, let's settle this the old-fashioned way!
            </p>
            <Button
              onClick={startGame}
              className="w-full bg-gradient-electric text-white font-semibold py-3 text-lg"
              size="lg"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              Start Battle!
            </Button>
          </div>

          {onBack && (
            <Button
              onClick={onBack}
              variant="ghost"
              className="text-white/70 hover:text-white"
            >
              Back to Options
            </Button>
          )}
        </motion.div>
      </div>
    )
  }

  // Game in progress
  if (gameState.status === 'playing') {
    const moveCount = Object.keys(gameState.moves).length
    const waitingForMoves = moveCount < 2

    return (
      <div className="min-h-screen bg-gradient-primary flex flex-col justify-center items-center p-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-md text-center space-y-8"
        >
          {/* Round indicator */}
          <div className="text-white/70">
            Round {gameState.round}
          </div>

          {/* Countdown */}
          <AnimatePresence>
            {countdown && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="text-8xl font-bold text-white"
              >
                {countdown}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Instructions */}
          {!countdown && !myMove && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-outfit font-bold gradient-text">
                Choose your weapon!
              </h2>
              
              {/* Move selection */}
              <div className="grid grid-cols-3 gap-4 mt-8">
                {(['rock', 'paper', 'scissors'] as Move[]).map((move) => {
                  const Icon = moveIcons[move]
                  return (
                    <motion.button
                      key={move}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => makeMove(move)}
                      className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 hover:bg-white/20 transition-colors"
                    >
                      <Icon className="w-12 h-12 text-white mx-auto mb-2" />
                      <div className="text-white font-medium">{moveNames[move]}</div>
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* Waiting for other player */}
          {myMove && waitingForMoves && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <div className="text-6xl">⏳</div>
              <h3 className="text-xl font-semibold text-white">
                Waiting for the other player...
              </h3>
              <p className="text-white/70">
                You chose {moveNames[myMove]}
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>
    )
  }

  // Reveal phase
  if (gameState.status === 'reveal') {
    const participantIds = Object.keys(gameState.moves)
    const [player1Id, player2Id] = participantIds
    const move1 = gameState.moves[player1Id]
    const move2 = gameState.moves[player2Id]
    const isTie = move1 === move2
    const isWinner = gameState.winner === participant.id

    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full text-center space-y-6"
        >
          {/* Show moves */}
          <div className="grid grid-cols-2 gap-6">
            {participantIds.map((playerId) => {
              const move = gameState.moves[playerId]
              const Icon = moveIcons[move]
              const isMe = playerId === participant.id
              
              return (
                <motion.div
                  key={playerId}
                  initial={{ rotateY: 180 }}
                  animate={{ rotateY: 0 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                  className="bg-white/10 backdrop-blur-sm rounded-2xl p-6"
                >
                  <Icon className="w-16 h-16 text-white mx-auto mb-2" />
                  <div className="text-white font-medium">{moveNames[move]}</div>
                  <div className="text-white/70 text-sm mt-1">
                    {isMe ? 'You' : 'Opponent'}
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Result */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="space-y-3"
          >
            {isTie ? (
              <>
                <div className="text-6xl">🤝</div>
                <h2 className="text-2xl font-outfit font-bold gradient-text">
                  It's a tie!
                </h2>
                <p className="text-white/70">
                  Let's go again...
                </p>
              </>
            ) : (
              <>
                <div className="text-6xl">{isWinner ? '🎉' : '😅'}</div>
                <h2 className="text-2xl font-outfit font-bold gradient-text">
                  {isWinner ? 'You won!' : 'You lost!'}
                </h2>
              </>
            )}
          </motion.div>
        </motion.div>
      </div>
    )
  }

  // Game finished - show winner and their restaurants
  if (gameState.status === 'finished') {
    const isWinner = gameState.winner === participant.id
    const randomMessage = winnerMessages[Math.floor(Math.random() * winnerMessages.length)]

    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full text-center space-y-6"
        >
          {/* Winner announcement */}
          <div className="space-y-3">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Trophy className="w-20 h-20 text-yellow-400 mx-auto" />
            </motion.div>
            
            <h1 className="text-3xl font-outfit font-bold gradient-text">
              {isWinner ? randomMessage : `${gameState.winnerName} wins!`}
            </h1>
            
            <p className="text-white/70 text-lg">
              {isWinner ? "You get to choose where to eat!" : "They get to choose where to eat!"}
            </p>
          </div>

          {/* Winner's restaurants */}
          {winnerRestaurants.length > 0 ? (
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center justify-center gap-2">
                <Utensils className="h-5 w-5" />
                {isWinner ? "Your" : "Their"} Liked Restaurants
              </h3>
              
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {winnerRestaurants.map((restaurant) => (
                  <motion.div
                    key={restaurant.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white/5 rounded-lg p-3 text-left"
                  >
                    <div className="font-medium text-white">{restaurant.name}</div>
                    {restaurant.rating && (
                      <div className="text-white/70 text-sm">
                        ⭐ {restaurant.rating}
                        {restaurant.price_level && (
                          <span className="ml-2">
                            {'$'.repeat(restaurant.price_level)}
                          </span>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
              <p className="text-white/90">
                {isWinner 
                  ? "You didn't like any restaurants, so you get to pick anywhere you want!" 
                  : "They didn't like any of the options, so they get to choose anywhere!"
                }
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={() => window.location.href = '/'}
              className="w-full bg-gradient-electric text-white font-semibold"
              size="lg"
            >
              Start New Session
            </Button>
            
            {onBack && (
              <Button
                onClick={onBack}
                variant="ghost"
                className="text-white/70 hover:text-white"
              >
                Back to Options
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    )
  }

  return null
}
