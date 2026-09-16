import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { db } from "../scripts/firebase.js";
import {
	chainValues,
	formatCurrency,
	formatTimer,
	remainingSeconds,
} from "../scripts/game-calculations.js";
const code = (
	new URLSearchParams(location.search).get("room") || ""
).toUpperCase();
const validCode = /^(DEBUG|[A-Z]{3}-[A-Z]{3}-[A-Z]{3})$/;
const $ = (id) => document.getElementById(id);
const setText = (id, value) => {
	if ($(id).textContent !== value) $(id).textContent = value;
};
let gameState;
let timerId;
let ladderIndex = -1;

function scale(game) {
	return 1 + ((game.round || 1) - 1) * 0.25;
}

function buildLadder(game) {
	if (ladderIndex === (game.chainIndex ?? 0) && ladderIndex !== -1) return;
	ladderIndex = game.chainIndex ?? 0;
	const factor = scale(game);
	const items = chainValues.map((value, index) => {
		const chip = document.createElement("li");
		chip.className = "chip";
		if (index === ladderIndex) chip.classList.add("current");
		chip.innerHTML =
			index === 0
				? `<strong>0€</strong>`
				: `<strong>${formatCurrency(value * factor)}</strong>`;
		return chip;
	});
	$("ladder").replaceChildren(...items);
}

function render(game) {
	buildLadder(game);
	setText("ladder-bank", formatCurrency(game.bank));
	const voteNames = Object.values(game.votes || {})
		.map((id) => game.players?.[id]?.name)
		.filter(Boolean);
	const voteBubbles = $("vote-bubbles");
	voteBubbles.replaceChildren(
		...voteNames.map((name) => {
			const bubble = document.createElement("span");
			bubble.className = "vote-bubble";
			bubble.textContent = name;
			return bubble;
		}),
	);
	setText(
		"timer",
		game.phase === "lobby" ? "" : formatTimer(remainingSeconds(game)),
	);
}

function startTimer() {
	clearInterval(timerId);
	timerId = setInterval(() => render(gameState), 1000);
}

if (!code) {
	$("timer").textContent = "Code requis";
} else if (!validCode.test(code)) {
	$("timer").textContent = "Code invalide";
} else if (code === "DEBUG") {
	const demo = {
		bank: 300,
		chainIndex: 4,
		round: 1,
		phase: "playing",
		endsAt: Date.now() + 54000,
	};
	gameState = demo;
	render(gameState);
	startTimer();
} else {
	onValue(ref(db, `rooms/${code}`), (snapshot) => {
		const game = snapshot.val();
		if (!game) {
			$("timer").textContent = "Partie introuvable";
			return;
		}
		gameState = game;
		render(gameState);
		startTimer();
	});
}
