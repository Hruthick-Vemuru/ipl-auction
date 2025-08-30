
const auctionState = new Map();

export function setupSocket(io) {
  // --- CORRECTED LINE: Attach auctionState as a direct property ---
  io.auctionState = auctionState;

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    socket.on('join_tournament', (tournamentId) => {
      socket.join(tournamentId);
      console.log(`Socket ${socket.id} joined tournament ${tournamentId}`);
      socket.emit('auction_state_update', io.auctionState.get(tournamentId));
    });
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}

export function updateAndBroadcastState(io, tournamentId, newState) {
  const currentState = io.auctionState.get(tournamentId) || {
      currentBid: 0,
      currentPlayer: null,
      currentPool: 'None',
      upcomingPlayers: [],
      log: [],
  };
  const updatedState = { ...currentState, ...newState };
  io.auctionState.set(tournamentId, updatedState);
  io.to(tournamentId).emit('auction_state_update', updatedState);
}