function matchInit(ctx, logger, nk, params) {
return {
state: {
players: [],
board: [null, null, null, null, null, null, null, null, null],
currentTurn: 0,
winner: null
},
tickRate: 1,
label: "default"
};
}

function matchJoinAttempt(ctx, logger, nk, dispatcher, tick, state, presence) {
return { state: state, accept: true };
}

function matchJoin(ctx, logger, nk, dispatcher, tick, state, presences) {
for (var i = 0; i < presences.length; i++) {
var p = presences[i];

```
var exists = false;
for (var j = 0; j < state.players.length; j++) {
  if (state.players[j].userId === p.userId) {
    exists = true;
    break;
  }
}

if (!exists) {
  var symbol = state.players.length === 0 ? "X" : "O";

  state.players.push({
    userId: p.userId,
    symbol: symbol
  });
}
```

}

dispatcher.broadcastMessage(2, JSON.stringify(state));
return { state: state };
}

function matchLeave(ctx, logger, nk, dispatcher, tick, state, presences) {
return { state: state };
}

function matchLoop(ctx, logger, nk, dispatcher, tick, state, messages) {
dispatcher.broadcastMessage(2, JSON.stringify(state));
return { state: state };
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
