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
	const timer =
		game.phase === "lobby" ? "" : formatTimer(remainingSeconds(game));
	setText("player-room-code", `Partie : ${context.roomId}`);
	setText("gm-room-code", `Code de la partie : ${context.roomId}`);
	setText("player-bank-display", `Banque : ${formatCurrency(game.bank)}`);
	setText("player-cash-display", `Cash du tour : ${formatCurrency(cash)}`);
	setText(
		"player-next-chain-display",
		`Prochain palier : ${formatCurrency(nextCash)}`,
	);
	const question = context.questions[game.questionIndex || 0];
	setText(
		"player-question",
		question ? question.question : "En attente de la prochaine question.",
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
	const voteName = $("vote-name");
	const voteButton = $("btn-submit-vote");
	voteName.disabled = voted;
	voteButton.disabled = voted;
	$("vote-feedback").textContent = voted ? "Vote enregistré." : "";
	$("vote-form").onsubmit = (event) => {
		event.preventDefault();
		const isValid = context.voteForName(voteName.value.trim());
		$("vote-feedback").textContent = isValid
			? "Vote enregistré."
			: "Ce pseudo ne correspond pas à un joueur actif.";
	};
}

function renderHost(game, context) {
	const question = context.questions[game.questionIndex || 0];
	const votes = Object.values(game.votes || {}).reduce(
		(out, id) => ({ ...out, [id]: (out[id] || 0) + 1 }),
		{},
	);
	$("gm-view").dataset.phase = game.phase;
	setText(
		"gm-bank-requests",
		game.bankRequest
			? `BANQUE demandée par : ${game.bankRequest.name}`
			: "Aucune demande de banque.",
	);
	$("gm-bank-requests").parentElement.classList.toggle(
		"hidden",
		!game.bankRequest,
	);
	$("btn-validate-bank").disabled =
		!game.bankRequest || game.phase !== "playing";
	$("btn-validate-bank").classList.toggle("hidden", !game.bankRequest);
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
