import { activePlayers, chainValues, phaseLabel } from "./game-calculations.js";

const $ = (id) => document.getElementById(id);

export function showView(view) {
    ["role-selection", "player-view", "gm-view"].forEach((id) => $(id).classList.toggle("hidden", id !== view));
}

export function renderGame(game, context) {
    const cash = chainValues[game.chainIndex] || 0;
    $("connection-status").textContent = `Salon ${context.roomId} synchronisé.`;
    $("player-bank-display").textContent = `Banque : ${game.bank || 0}€`;
    $("player-chain-display").textContent = `Palier : ${cash}€`;
    $("player-cash-display").textContent = `Cash en jeu : ${cash}€`;
    $("player-status").textContent = phaseLabel(game.phase);
    $("gm-bank-total").textContent = `Banque globale : ${game.bank || 0}€`;
    $("gm-current-chain").textContent = `Palier : ${cash}€`;
    if (context.role === "player") renderPlayer(game, context);
    if (context.role === "gm") renderHost(game, context);
}

function renderPlayer(game, context) {
    const player = game.players?.[context.clientId];
    $("btn-bank").disabled = !(player?.active && game.phase === "playing" && !game.bankRequest);
    $("player-vote").classList.toggle("hidden", game.phase !== "voting" || !player?.active);
    const voted = Boolean(game.votes?.[context.clientId]);
    $("vote-options").replaceChildren(...activePlayers(game).filter(([id]) => id !== context.clientId).map(([id, playerToVote]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = playerToVote.name;
        button.disabled = voted;
        button.onclick = () => context.voteFor(id);
        return button;
    }));
}

function renderHost(game, context) {
    const question = context.questions[game.questionIndex || 0];
    const votes = Object.values(game.votes || {}).reduce((out, id) => ({ ...out, [id]: (out[id] || 0) + 1 }), {});
    $("gm-bank-requests").textContent = game.bankRequest ? `BANQUE demandée par : ${game.bankRequest.name}` : "Aucune demande de banque.";
    $("btn-validate-bank").disabled = !game.bankRequest || game.phase !== "playing";
    $("gm-question-text").textContent = question ? `Question : ${question.question}` : "Aucune question chargée.";
    $("gm-answer-text").textContent = question ? `Réponse attendue : ${question.reponse}` : "";
    $("gm-round-status").textContent = `${phaseLabel(game.phase)} - ${activePlayers(game).length} joueur(s) en course.`;
    $("gm-player-list").replaceChildren(...Object.entries(game.players || {}).map(([id, player]) => {
        const item = document.createElement("div");
        item.className = "player-item";
        item.textContent = `${player.name}${player.active ? "" : " (éliminé)"}${game.phase === "voting" ? ` - ${votes[id] || 0} vote(s)` : ""}`;
        return item;
    }));
    $("btn-start").disabled = game.phase === "playing";
    $("btn-vote").disabled = game.phase !== "playing" || activePlayers(game).length < 2;
    $("btn-eliminate").disabled = game.phase !== "voting" || !Object.keys(game.votes || {}).length;
}
