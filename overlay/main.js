import {
	getDatabase,
	ref,
	onValue,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { db } from "../scripts/firebase.js";
import {
	chainValue,
	formatCurrency,
	formatTimer,
	nextChainValue,
	phaseLabel,
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

function render(game) {
	setText("bank", formatCurrency(game.bank));
	setText("cash", formatCurrency(chainValue(game)));
	setText("prev-chain", formatCurrency(chainValue(game)));
	setText("next-chain", formatCurrency(nextChainValue(game)));
	setText("status", phaseLabel(game.phase));
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
	$("status").textContent = "Code de partie requis";
	$("timer").textContent = "Ajoutez ?room=ABC-DEF-GHI";
} else if (!validCode.test(code)) {
	$("status").textContent = "Code de partie invalide";
	$("timer").textContent = "Format attendu : ABC-DEF-GHI";
} else if (code === "DEBUG") {
	const demo = {
		bank: 450,
		chainIndex: 5,
		round: 2,
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
			$("status").textContent = "Partie introuvable";
			$("timer").textContent = "Vérifiez le code";
			return;
		}
		gameState = game;
		render(gameState);
		startTimer();
	});
}
