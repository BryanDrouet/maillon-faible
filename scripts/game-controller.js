import {
	onValue,
	ref,
	remove,
	runTransaction,
	update,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { db } from "./firebase.js";
import {
	activePlayers,
	chainValue,
	chainValues,
	createRoomCode,
	formatRoomCode,
	gameEvent,
	remainingSeconds,
	roundDuration,
} from "./game-calculations.js";
import { playGameSound, unlockAudio } from "./game-audio.js";
import { renderGame, showView } from "./game-display.js";

const $ = (id) => document.getElementById(id);
const clientId = sessionStorage.getItem("mf-id") || crypto.randomUUID();
sessionStorage.setItem("mf-id", clientId);
let questions = [],
	roomId = "",
	role = "",
	name = "",
	state,
	lastEvent = "",
	timerId;
const roomRef = () => ref(db, `rooms/${roomId}`);
const change = (valuesToApply) => {
	if (state) update(roomRef(), valuesToApply);
};

const savedSession = () => ({
	roomId: sessionStorage.getItem("mf-room"),
	role: sessionStorage.getItem("mf-role"),
	name: sessionStorage.getItem("mf-name"),
});

function subscribe() {
	onValue(roomRef(), (snapshot) => {
		state = snapshot.val();
		if (!state) return;
		if (state.event?.id && state.event.id !== lastEvent) {
			lastEvent = state.event.id;
			playGameSound(state.event.type);
		}
		renderGame(state, {
			roomId,
			role,
			clientId,
			questions,
			voteForName: (voteName) => {
				const target = activePlayers(state).find(
					([id, player]) =>
						id !== clientId &&
						player.name.localeCompare(voteName, "fr", { sensitivity: "accent" }) === 0,
				);
				if (!target) return false;
				update(ref(db, `rooms/${roomId}/votes`), { [clientId]: target[0] });
				return true;
			},
		});
	});
	clearInterval(timerId);
	timerId = setInterval(() => {
		if (!state) return;
		renderGame(state, {
			roomId,
			role,
			clientId,
			questions,
			voteForName: (voteName) => {
				const target = activePlayers(state).find(
					([id, player]) =>
						id !== clientId &&
						player.name.localeCompare(voteName, "fr", { sensitivity: "accent" }) === 0,
				);
				if (!target) return false;
				update(ref(db, `rooms/${roomId}/votes`), { [clientId]: target[0] });
				return true;
			},
		});
		if (
			role === "gm" &&
			state.phase === "playing" &&
			remainingSeconds(state) === 0
		)
			change({ phase: "voting", ...gameEvent("end") });
	}, 1000);
}

async function enterRoom(create, resume = false) {
	unlockAudio();
	const saved = savedSession();
	name = resume ? saved.name : $("player-name").value.trim().slice(0, 24);
	roomId = resume
		? saved.roomId
		: create
			? createRoomCode()
			: formatRoomCode($("room-id").value);
	if (!name || (!create && !roomId)) {
		$("connection-status").textContent =
			"Indiquez votre pseudo et le code de la partie.";
		return;
	}
	if (create && !resume) {
		const result = await runTransaction(
			roomRef(),
			(current) =>
				current || {
					hostId: clientId,
					hostName: name,
					phase: "lobby",
					round: 0,
					endsAt: 0,
					bank: 0,
					chainIndex: 0,
					questionIndex: 0,
					players: {},
					votes: {},
				},
		);
		if (result.snapshot.val().hostId !== clientId) return enterRoom(true);
		role = "gm";
		showView("gm-view");
	} else if (resume && saved.role === "gm") {
		const snapshot = await new Promise((done) =>
			onValue(roomRef(), done, { onlyOnce: true }),
		);
		if (!snapshot.exists() || snapshot.val().hostId !== clientId) return;
		role = "gm";
		showView("gm-view");
	} else {
		const snapshot = await new Promise((done) =>
			onValue(roomRef(), done, { onlyOnce: true }),
		);
		if (!snapshot.exists()) {
			$("connection-status").textContent = "Salon introuvable.";
			return;
		}
		role = "player";
		await update(ref(db, `rooms/${roomId}/players/${clientId}`), {
			name,
			active: true,
		});
		showView("player-view");
	}
	sessionStorage.setItem("mf-room", roomId);
	sessionStorage.setItem("mf-role", role);
	sessionStorage.setItem("mf-name", name);
	subscribe();
}

function eliminate() {
	const totals = Object.values(state.votes || {}).reduce(
		(out, id) => ({ ...out, [id]: (out[id] || 0) + 1 }),
		{},
	);
	const target = Object.keys(totals).sort(
		(left, right) => totals[right] - totals[left],
	)[0];
	if (!target) return;
	const remaining = activePlayers(state).length - 1;
	change({
		[`players/${target}/active`]: false,
		votes: {},
		phase: remaining === 1 ? "ended" : "lobby",
		...gameEvent("end"),
	});
	if (remaining === 1) {
		const winner = activePlayers(state).find(([id]) => id !== target)?.[1];
		const key = winner.name.toLowerCase().replace(/[^a-z0-9]/gi, "-");
		runTransaction(ref(db, `seasonLeaderboard/${key}`), (entry) => ({
			name: winner.name,
			score: (entry?.score || 0) + (state.bank || 0),
		}));
	}
}

export async function startGameApp() {
	try {
		questions = await (await fetch("questions.json")).json();
	} catch {
		$("connection-status").textContent =
			"Erreur de chargement de questions.json.";
	}
	$("room-id").addEventListener("input", () => {
		$("room-id").value = formatRoomCode($("room-id").value);
	});
	const roomCodeGroup = $("room-code-group");
	const roomIdInput = $("room-id");
	const btnSubmit = $("btn-submit");
	const choiceGm = $("choice-gm");
	const choicePlayer = $("choice-player");
	let createSelected = true;
	const updateRoleUI = () => {
		choiceGm.classList.toggle("active", createSelected);
		choiceGm.setAttribute("aria-pressed", String(createSelected));
		choicePlayer.classList.toggle("active", !createSelected);
		choicePlayer.setAttribute("aria-pressed", String(!createSelected));
		roomCodeGroup.classList.toggle("hidden", createSelected);
		roomCodeGroup.setAttribute("aria-hidden", String(createSelected));
		roomIdInput.required = !createSelected;
		btnSubmit.textContent = createSelected ? "Je présente" : "Je joue";
	};
	choiceGm.onclick = () => {
		createSelected = true;
		updateRoleUI();
	};
	choicePlayer.onclick = () => {
		createSelected = false;
		updateRoleUI();
	};
	updateRoleUI();
	const saved = savedSession();
	if (saved.roomId && saved.role && saved.name) {
		enterRoom(saved.role === "gm", true);
	}
	$("role-form").onsubmit = (submit) => {
		submit.preventDefault();
		enterRoom(createSelected);
	};
	$("btn-bank").onclick = () =>
		change({ bankRequest: { id: clientId, name }, ...gameEvent("bank") });
	$("btn-correct").onclick = () =>
		change({
			chainIndex: Math.min((state.chainIndex || 0) + 1, chainValues.length - 1),
			bankRequest: null,
			...gameEvent("correct"),
		});
	$("btn-wrong").onclick = () =>
		change({ chainIndex: 0, bankRequest: null, ...gameEvent("wrong") });
	$("btn-validate-bank").onclick = () =>
		change({
			bank: (state.bank || 0) + chainValue(state),
			chainIndex: 0,
			bankRequest: null,
			...gameEvent("bank"),
		});
	$("btn-next-question").onclick = () =>
		change({
			questionIndex:
				((state.questionIndex || 0) + 1) % Math.max(questions.length, 1),
		});
	$("btn-start").onclick = () => {
		const round = (state.round || 0) + 1;
		change({
			phase: "playing",
			round,
			endsAt: Date.now() + roundDuration(round) * 1000,
			votes: {},
			...gameEvent("start"),
		});
	};
	$("btn-vote").onclick = () =>
		change({ phase: "voting", votes: {}, ...gameEvent("end") });
	$("btn-eliminate").onclick = eliminate;
	$("btn-stop-game").onclick = () => {
		if (!state || state.phase === "ended") return;
		change({
			phase: "ended",
			endsAt: 0,
			bankRequest: null,
			votes: {},
			...gameEvent("end"),
		});
	};
	$("btn-delete-room").onclick = async () => {
		if (!state || !confirm("Supprimer définitivement ce salon ?")) return;
		await remove(roomRef());
		["mf-room", "mf-role", "mf-name"].forEach((key) =>
			sessionStorage.removeItem(key),
		);
		clearInterval(timerId);
		showView("role-selection");
		$("connection-status").textContent = "Salon supprimé.";
	};
	$("btn-new-game").onclick = () =>
		runTransaction(roomRef(), (game) => ({
			...game,
			phase: "lobby",
			round: 0,
			endsAt: 0,
			bank: 0,
			chainIndex: 0,
			questionIndex: 0,
			bankRequest: null,
			votes: {},
			players: Object.fromEntries(
				Object.entries(game.players || {}).map(([id, player]) => [
					id,
					{ ...player, active: true },
				]),
			),
			...gameEvent("end"),
		}));
	$("btn-copy-overlay").onclick = async () => {
		await navigator.clipboard.writeText(
			`${location.origin}/overlay/?room=${roomId}`,
		);
		$("connection-status").textContent = "Lien overlay copié.";
	};
}
