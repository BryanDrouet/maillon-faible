import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, onValue, update, runTransaction } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyA_XRPwamSW91IQl1PyY61xAcF_FL8LKSE",
    authDomain: "maillon-faible-e1a83.firebaseapp.com",
    databaseURL: "https://maillon-faible-e1a83-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "maillon-faible-e1a83",
    storageBucket: "maillon-faible-e1a83.firebasestorage.app",
    messagingSenderId: "53244966173",
    appId: "1:53244966173:web:abedc58e1e0582092f5df4"
};

const db = getDatabase(initializeApp(firebaseConfig));
const values = [0, 20, 50, 100, 200, 300, 450, 600, 800, 1000];
const clientId = sessionStorage.getItem("mf-id") || crypto.randomUUID();
sessionStorage.setItem("mf-id", clientId);
const $ = (id) => document.getElementById(id);
let questions = [], roomId = "", role = "", name = "", state, lastEvent = "", audio;

function roomCode(value) { return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6); }
function roomRef() { return ref(db, `rooms/${roomId}`); }
function livePlayers(game) { return Object.entries(game.players || {}).filter(([, player]) => player.active); }
function event(type) { return { event: { id: crypto.randomUUID(), type } }; }
function phase(game) { return ({ lobby: "En attente", playing: "Manche en cours", voting: "Vote en cours", ended: "Partie terminée" })[game.phase] || "En attente"; }
function toggle(view) { ["role-selection", "player-view", "gm-view", "overlay-view"].forEach((id) => $(id).classList.toggle("hidden", id !== view)); }
function unlockAudio() { audio ||= new AudioContext(); audio.resume(); }
function sound(type) {
    if (!audio) return;
    const tones = { correct: [660, 880], wrong: [200, 140], start: [440, 660, 880], end: [880, 660, 440], bank: [740] }[type] || [];
    tones.forEach((frequency, index) => {
        const oscillator = audio.createOscillator(), gain = audio.createGain(), time = audio.currentTime + index * .12;
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(.08, time); gain.gain.exponentialRampToValueAtTime(.001, time + .1);
        oscillator.connect(gain).connect(audio.destination); oscillator.start(time); oscillator.stop(time + .1);
    });
}
function render(game) {
    if (!game) return;
    const cash = values[game.chainIndex] || 0;
    if (game.event?.id && game.event.id !== lastEvent) { lastEvent = game.event.id; sound(game.event.type); }
    $("connection-status").textContent = `Salon ${roomId} synchronisé.`;
    $("player-bank-display").textContent = `Banque : ${game.bank || 0} EUR`;
    $("player-chain-display").textContent = `Palier : ${cash} EUR`;
    $("player-cash-display").textContent = `Cash en jeu : ${cash} EUR`;
    $("player-status").textContent = phase(game);
    $("gm-bank-total").textContent = `Banque globale : ${game.bank || 0} EUR`;
    $("gm-current-chain").textContent = `Palier : ${cash} EUR`;
    $("overlay-bank").textContent = `${game.bank || 0} EUR`;
    $("overlay-chain").textContent = `${cash} EUR`;
    $("overlay-status").textContent = phase(game).toUpperCase();
    if (role === "player") renderPlayer(game);
    if (role === "gm") renderHost(game);
}
function renderPlayer(game) {
    const player = game.players?.[clientId], canBank = player?.active && game.phase === "playing" && !game.bankRequest;
    $("btn-bank").disabled = !canBank; $("btn-bank").style.opacity = canBank ? "1" : ".45";
    $("player-vote").classList.toggle("hidden", game.phase !== "voting" || !player?.active);
    const voted = Boolean(game.votes?.[clientId]);
    $("vote-options").replaceChildren(...livePlayers(game).filter(([id]) => id !== clientId).map(([id, playerToVote]) => {
        const button = document.createElement("button"); button.type = "button"; button.textContent = playerToVote.name; button.disabled = voted;
        button.onclick = () => update(ref(db, `rooms/${roomId}/votes`), { [clientId]: id }); return button;
    }));
}
function renderHost(game) {
    const question = questions[game.questionIndex || 0], votes = Object.values(game.votes || {}).reduce((out, id) => ({ ...out, [id]: (out[id] || 0) + 1 }), {});
    $("gm-bank-requests").textContent = game.bankRequest ? `BANQUE demandée par : ${game.bankRequest.name}` : "Aucune demande de banque.";
    $("btn-validate-bank").disabled = !game.bankRequest || game.phase !== "playing";
    $("gm-question-text").textContent = question ? `Question : ${question.question}` : "Aucune question chargée.";
    $("gm-answer-text").textContent = question ? `Réponse attendue : ${question.reponse}` : "";
    $("gm-round-status").textContent = `${phase(game)} - ${livePlayers(game).length} joueur(s) en course.`;
    $("gm-player-list").replaceChildren(...Object.entries(game.players || {}).map(([id, player]) => {
        const item = document.createElement("div"); item.className = "player-item";
        item.textContent = `${player.name}${player.active ? "" : " (éliminé)"}${game.phase === "voting" ? ` - ${votes[id] || 0} vote(s)` : ""}`; return item;
    }));
    $("btn-start").disabled = game.phase === "playing"; $("btn-vote").disabled = game.phase !== "playing" || livePlayers(game).length < 2;
    $("btn-eliminate").disabled = game.phase !== "voting" || !Object.keys(game.votes || {}).length;
}
function subscribe() { onValue(roomRef(), (snapshot) => { state = snapshot.val(); if (state) render(state); }); }
async function enter(create) {
    unlockAudio(); name = $("player-name").value.trim().slice(0, 24); roomId = roomCode($("room-id").value);
    if (!name || !roomId) return;
    const target = roomRef();
    if (create) {
        const result = await runTransaction(target, (current) => current || { hostId: clientId, hostName: name, phase: "lobby", bank: 0, chainIndex: 0, questionIndex: 0, players: {}, votes: {} });
        if (result.snapshot.val().hostId !== clientId) { $("connection-status").textContent = "Ce code est déjà utilisé."; return; }
        role = "gm"; $("gm-room-code").textContent = `Salon : ${roomId}`; toggle("gm-view");
    } else {
        const snapshot = await new Promise((done) => onValue(target, done, { onlyOnce: true }));
        if (!snapshot.exists()) { $("connection-status").textContent = "Salon introuvable."; return; }
        role = "player"; await update(ref(db, `rooms/${roomId}/players/${clientId}`), { name, active: true });
        $("player-title").textContent = `Joueur : ${name}`; $("player-room-code").textContent = `Salon : ${roomId}`; toggle("player-view");
    }
    subscribe();
}
function change(valuesToApply) { if (state) update(roomRef(), valuesToApply); }
function eliminate() {
    const tally = Object.values(state.votes || {}).reduce((out, id) => ({ ...out, [id]: (out[id] || 0) + 1 }), {});
    const target = Object.keys(tally).sort((left, right) => tally[right] - tally[left])[0]; if (!target) return;
    const remaining = livePlayers(state).length - 1, isFinal = remaining === 1;
    change({ [`players/${target}/active`]: false, votes: {}, phase: isFinal ? "ended" : "lobby", ...event("end") });
    if (isFinal) { const winner = livePlayers(state).find(([id]) => id !== target)?.[1], key = winner.name.toLowerCase().replace(/[^a-z0-9]/gi, "-"); runTransaction(ref(db, `seasonLeaderboard/${key}`), (entry) => ({ name: winner.name, score: (entry?.score || 0) + (state.bank || 0) })); }
}
async function init() {
    $("main-title").textContent = "Le Maillon Faible"; $("role-title").textContent = "Créer ou rejoindre une partie"; $("text-join").textContent = "Rejoindre comme joueur";
    $("player-title").textContent = "Espace Joueur"; $("gm-title").textContent = "Espace Présentateur"; $("text-bank").textContent = "BANQUE !";
    $("copyright-text").textContent = `© ${new Date().getFullYear()} ClubRadio Mauléon`;
    try { questions = await (await fetch("questions.json")).json(); } catch { $("connection-status").textContent = "Erreur de chargement de questions.json."; }
    const overlay = roomCode(new URLSearchParams(location.search).get("overlay") || "");
    if (overlay) { roomId = overlay; $("overlay-room").textContent = `LE MAILLON FAIBLE - ${roomId}`; toggle("overlay-view"); subscribe(); return; }
    $("role-form").onsubmit = (submit) => { submit.preventDefault(); enter(submit.submitter?.value === "create"); };
    $("btn-bank").onclick = () => change({ bankRequest: { id: clientId, name }, ...event("bank") });
    $("btn-correct").onclick = () => change({ chainIndex: Math.min((state.chainIndex || 0) + 1, values.length - 1), bankRequest: null, ...event("correct") });
    $("btn-wrong").onclick = () => change({ chainIndex: 0, bankRequest: null, ...event("wrong") });
    $("btn-validate-bank").onclick = () => change({ bank: (state.bank || 0) + (values[state.chainIndex] || 0), chainIndex: 0, bankRequest: null, ...event("bank") });
    $("btn-next-question").onclick = () => change({ questionIndex: ((state.questionIndex || 0) + 1) % Math.max(questions.length, 1) });
    $("btn-start").onclick = () => change({ phase: "playing", votes: {}, ...event("start") });
    $("btn-vote").onclick = () => change({ phase: "voting", votes: {}, ...event("end") });
    $("btn-eliminate").onclick = eliminate;
    $("btn-new-game").onclick = () => runTransaction(roomRef(), (game) => ({ ...game, phase: "lobby", bank: 0, chainIndex: 0, questionIndex: 0, bankRequest: null, votes: {}, players: Object.fromEntries(Object.entries(game.players || {}).map(([id, player]) => [id, { ...player, active: true }])), ...event("end") }));
    lucide.createIcons();
}
init();
