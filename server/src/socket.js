const auctionState = new Map();

export function setupSocket(io) {
  io.auctionState = auctionState;

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on("join_tournament", (tournamentId) => {
      socket.join(tournamentId);
      console.log(`Socket ${socket.id} joined tournament ${tournamentId}`);
      socket.emit("auction_state_update", io.auctionState.get(tournamentId));
    });

    // --- THIS IS THE NEW, CRITICAL EVENT LISTENER ---
    // When the admin clicks '+' or '-', this event is received.
    socket.on("admin_update_bid", ({ tournamentId, newBid }) => {
      // Find the current state for this tournament
      const currentState = io.auctionState.get(tournamentId);
      if (currentState && currentState.currentPlayer) {
        // Update only the currentBid
        const updatedState = { ...currentState, currentBid: newBid };
        io.auctionState.set(tournamentId, updatedState);

        // Broadcast the new state to everyone in the room
        io.to(tournamentId).emit("auction_state_update", updatedState);
      }
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}

export function updateAndBroadcastState(io, tournamentId, newState) {
  const currentState = io.auctionState.get(tournamentId) || {
    currentBid: 0,
    currentPlayer: null,
    currentPool: "None",
    upcomingPlayers: [],
    log: [],
  };
  const updatedState = { ...currentState, ...newState };
  io.auctionState.set(tournamentId, updatedState);
  io.to(tournamentId).emit("auction_state_update", updatedState);
}
