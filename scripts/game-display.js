import {
	activePlayers,
	chainValue,
	formatCurrency,
	formatTimer,
	nextChainValue,
	phaseLabel,
	remainingSeconds,
} from "./game-calculations.js";

const $ = (id) => document.getElementById(id);
const setText = (id, value) => {
	const element = $(id);
	if (element.textContent !== value) element.textContent = value;
};

export function showView(view) {
	["role-selection", "player-view", "gm-view"].forEach((id) =>
		$(id).classList.toggle("hidden", id !== view),
	);
}

export function renderGame(game, context) {
	const cash = chainValue(game);
	const nextCash = nextChainValue(game);
	const timer = formatTimer(remainingSeconds(game));
	setText("connection-status", `Salon ${context.roomId} synchronisé.`);
	setText("player-bank-display", `Banque : ${formatCurrency(game.bank)}`);
	setText("player-cash-display", `Cash du tour : ${formatCurrency(cash)}`);
	setText(
		"player-next-chain-display",
		`Prochain palier : ${formatCurrency(nextCash)}`,
	);
	setText("player-status", phaseLabel(game.phase));
	setText("player-timer", `${timer}`);
	setText("gm-bank-total", `Banque globale : ${formatCurrency(game.bank)}`);
	setText("gm-cash-turn", `Cash du tour : ${formatCurrency(cash)}`);
	setText("gm-next-chain", `Prochain palier : ${formatCurrency(nextCash)}`);
	setText("gm-timer", `${timer}`);
	if (context.role === "player") renderPlayer(game, context);
	if (context.role === "gm") renderHost(game, context);
}

function renderPlayer(game, context) {
	const player = game.players?.[context.clientId];
	$("btn-bank").disabled = !(
		player?.active &&
		game.phase === "playing" &&
		!game.bankRequest
	);
	$("player-vote").classList.toggle(
		"hidden",
		game.phase !== "voting" || !player?.active,
	);
	const voted = Boolean(game.votes?.[context.clientId]);
	const signature = `${game.phase}|${voted}|${JSON.stringify(game.players || {})}`;
	if ($("vote-options").dataset.signature === signature) return;
	$("vote-options").dataset.signature = signature;
	$("vote-options").replaceChildren(
		...activePlayers(game)
			.filter(([id]) => id !== context.clientId)
			.map(([id, playerToVote]) => {
				const button = document.createElement("button");
				button.type = "button";
				button.textContent = playerToVote.name;
				button.disabled = voted;
				button.onclick = () => context.voteFor(id);
				return button;
			}),
	);
}

function renderHost(game, context) {
	const question = context.questions[game.questionIndex || 0];
	const votes = Object.values(game.votes || {}).reduce(
		(out, id) => ({ ...out, [id]: (out[id] || 0) + 1 }),
		{},
	);
	setText(
		"gm-bank-requests",
		game.bankRequest
			? `BANQUE demandée par : ${game.bankRequest.name}`
			: "Aucune demande de banque.",
	);
	$("btn-validate-bank").disabled =
		!game.bankRequest || game.phase !== "playing";
	setText(
		"gm-question-text",
		question ? `Question : ${question.question}` : "Aucune question chargée.",
	);
	setText(
		"gm-answer-text",
		question ? `Réponse attendue : ${question.reponse}` : "",
	);
	setText(
		"gm-round-status",
		`${phaseLabel(game.phase)} - ${activePlayers(game).length} joueur(s) en course.`,
	);
	const signature = `${game.phase}|${JSON.stringify(game.players || {})}|${JSON.stringify(game.votes || {})}`;
	if ($("gm-player-list").dataset.signature === signature) return;
	$("gm-player-list").dataset.signature = signature;
	$("gm-player-list").replaceChildren(
		...Object.entries(game.players || {}).map(([id, player]) => {
			const item = document.createElement("div");
			item.className = "player-item";
			item.textContent = `${player.name}${player.active ? "" : " (éliminé)"}${game.phase === "voting" ? ` - ${votes[id] || 0} vote(s)` : ""}`;
			return item;
		}),
	);
	$("btn-start").disabled = game.phase === "playing";
	$("btn-vote").disabled =
		game.phase !== "playing" || activePlayers(game).length < 2;
	$("btn-eliminate").disabled =
		game.phase !== "voting" || !Object.keys(game.votes || {}).length;
}
