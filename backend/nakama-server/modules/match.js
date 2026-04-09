function matchInit(ctx, logger, nk, params) {
  return {
    state: {
      players: [], // [{ userId, symbol }]
      board: Array(9).fill(null),
      currentTurn: 0, // 0 -> X, 1 -> O
      winner: null,
      stopBroadcast: false
    },
    tickRate: 5,
    label: "default"
  };
}

function matchJoinAttempt(ctx, logger, nk, dispatcher, tick, state, presence) {
  return { state, accept: true };
}

function matchJoin(ctx, logger, nk, dispatcher, tick, state, presences) {
  presences.forEach(p => {
    // prevent duplicate joins
    if (!state.players.find(pl => pl.userId === p.userId)) {
      const symbol = state.players.length === 0 ? "X" : "O";

      state.players.push({
        userId: p.userId,
        symbol,
        nickname: p.username,
      });
    }
  });

  logger.info("Players joined: " + state.players.length);

  // send initial state
  dispatcher.broadcastMessage(2, JSON.stringify(state));


  return { state };
}

function matchLeave(ctx, logger, nk, dispatcher, tick, state, presences) {
  const leavingIds = new Set(presences.map(p => p.userId));

  state.players = state.players.filter(p => !leavingIds.has(p.userId));

  return { state };
}

function checkWinner(board) {
  const wins = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];

  for (let [a,b,c] of wins) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }

  return null;
}

function updatePlayerStats(nk, logger, players, winner) {
  players.forEach(player => {
    try {
      // 1. Read existing stats
      const records = nk.storageRead([{
        collection: "stats",
        key: "user_stats",
        userId: player.userId
      }]);

      let current = { wins: 0, losses: 0, draws: 0 };

      if (records.length > 0) {
        current = records[0].value;
      }

      // 2. Update values
      if (winner === "draw") {
        current.draws += 1;
      } else if (player.symbol === winner) {
        current.wins += 1;
      } else {
        current.losses += 1;
      }

      logger.info("Writing stats...");

      // 3. Write back
      nk.storageWrite([{
        collection: "stats",
        key: "user_stats",
        userId: player.userId,
        value: current,
        permissionRead: 2,
        permissionWrite: 0
      }]);

    } catch (err) {
      logger.error("Stats update failed for " + player.userId + ": " + err);
    }
  });
}

function matchLoop(ctx, logger, nk, dispatcher, tick, state, messages) {
  if (!state.stopBroadcast) {
    dispatcher.broadcastMessage(2, JSON.stringify(state));
  }

  messages.forEach((msg) => {

    let data;

    try {
      // ✅ decode binary → string
      const decoded = nk.binaryToString(msg.data);

      // ✅ parse JSON safely
      data = JSON.parse(decoded);
    } catch (err) {
      logger.error("Invalid JSON received: " + msg.data);
      return;
    }

    if (msg.opCode === 5) {
      state.stopBroadcast = true; // ✅ persists
      return;
    }

    if (msg.opCode === 1) {
      if (state.winner) return;

      // ✅ find player by userId
      const player = state.players.find(
        p => p.userId === msg.sender.userId
      );

      if (!player) return;

      // ✅ enforce turn using symbol
      const expectedSymbol = state.currentTurn === 0 ? "X" : "O";

      if (player.symbol !== expectedSymbol) {
        logger.info("Wrong turn attempt");
        return;
      }

      const index = data.index;

      // ❌ invalid move
      if (state.board[index] !== null) return;

      // ✅ apply move
      state.board[index] = player.symbol;

      // 🔍 check winner
      const winner = checkWinner(state.board);
      if (winner) {
        state.winner = winner;

        updatePlayerStats(nk, logger, state.players, winner);

        // 🔥 attach stats to state
        state.players = state.players.map(player => {
          const records = nk.storageRead([{
            collection: "stats",
            key: "user_stats",
            userId: player.userId
          }]);

          let stats = { wins: 0, losses: 0, draws: 0 };

          if (records.length > 0) {
            stats = records[0].value;
          }

          return {
            ...player,
            ...stats
          };
        });

        dispatcher.broadcastMessage(3, JSON.stringify(state));
        return;
      }

      const isDraw = state.board.every(cell => cell !== null);

      if (isDraw) {
        state.winner = "draw";

        state.players = state.players.map(player => {
          const records = nk.storageRead([{
            collection: "stats",
            key: "user_stats",
            userId: player.userId
          }]);

          let stats = { wins: 0, losses: 0, draws: 0 };

          if (records.length > 0) {
            stats = records[0].value;
          }

          return {
            ...player,
            ...stats
          };
        });

        dispatcher.broadcastMessage(3, JSON.stringify(state));
        return;
      }

      // 🔁 switch turn
      state.currentTurn = (state.currentTurn + 1) % 2;

      // 📡 broadcast updated state
      dispatcher.broadcastMessage(2, JSON.stringify(state));
    }
  });

  return { state };
}

function matchTerminate(ctx, logger, nk, dispatcher, tick, state, graceSeconds) {
  return { state };
}

function matchSignal(ctx, logger, nk, dispatcher, tick, state, data) {
  return { state, data };
}

function matchmakerMatched(ctx, logger, nk, entries) {
  logger.info("🔥 MATCHMAKER TRIGGERED");

  const matchId = nk.matchCreate("default", {});
  return matchId;
}

function InitModule(ctx, logger, nk, initializer) {
  logger.info("🔥 JS MODULE LOADED");

  initializer.registerMatch("default", {
    matchInit,
    matchJoinAttempt,
    matchJoin,
    matchLeave,
    matchLoop,
    matchTerminate,
    matchSignal
  });

  initializer.registerMatchmakerMatched(matchmakerMatched);
}

globalThis.InitModule = InitModule;