function matchInit(ctx, logger, nk, params) {
return {
state: {
players: [],
board: [null, null, null, null, null, null, null, null, null],
currentTurn: 0,
winner: null
},
tickRate: 5,
label: "default"
};
}

function matchJoinAttempt(ctx, logger, nk, dispatcher, tick, state, presence) {
return { state: state, accept: true };
}

function matchJoin(ctx, logger, nk, dispatcher, tick, state, presences) {
  presences.forEach(p => {
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

  dispatcher.broadcastMessage(2, JSON.stringify(state));

  return { state };
}

function matchLeave(ctx, logger, nk, dispatcher, tick, state, presences) {
return { state: state };
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
return { state: state };
}

function matchSignal(ctx, logger, nk, dispatcher, tick, state, data) {
return { state: state };
}

function matchmakerMatched(ctx, logger, nk, entries) {
var matchId = nk.matchCreate("default", {});
return matchId;
}

function InitModule(ctx, logger, nk, initializer) {
initializer.registerMatch("default", {
matchInit: matchInit,
matchJoinAttempt: matchJoinAttempt,
matchJoin: matchJoin,
matchLeave: matchLeave,
matchLoop: matchLoop,
matchTerminate: matchTerminate,
matchSignal: matchSignal
});

initializer.registerMatchmakerMatched(matchmakerMatched);
}

globalThis.InitModule = InitModule;
