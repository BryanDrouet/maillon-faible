export const chainValues = [0, 20, 50, 100, 200, 300, 450, 600, 800, 1000];

export function roundDuration(round = 1) {
	return Math.max(30, 90 - (round - 1) * 10);
}

export function chainValue(game) {
	return Math.round(
		(chainValues[game.chainIndex] || 0) * (1 + ((game.round || 1) - 1) * 0.25),
	);
}

export function nextChainValue(game) {
	const nextIndex = Math.min(
		(game.chainIndex || 0) + 1,
		chainValues.length - 1,
	);
	return Math.round(
		(chainValues[nextIndex] || 0) * (1 + ((game.round || 1) - 1) * 0.25),
	);
}

export function remainingSeconds(game, now = Date.now()) {
	return Math.max(0, Math.ceil(((game.endsAt || now) - now) / 1000));
}

export function formatTimer(seconds) {
	return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function formatCurrency(value) {
	return `${Math.round(value || 0)
		.toLocaleString("fr-FR")
		.replace(/\u202f/g, " ")}€`;
}

export function formatRoomCode(value) {
	return value
		.trim()
		.toUpperCase()
		.replace(/[^A-Z]/g, "")
		.slice(0, 9)
		.replace(/(.{3})(?=.)/g, "$1-");
}

export function createRoomCode() {
	const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	return formatRoomCode(
		Array.from(
			{ length: 9 },
			() => letters[Math.floor(Math.random() * letters.length)],
		).join(""),
	);
}

export function activePlayers(game) {
	return Object.entries(game.players || {}).filter(
		([, player]) => player.active,
	);
}

export function gameEvent(type) {
	return { event: { id: crypto.randomUUID(), type } };
}

export function phaseLabel(phase) {
	return (
		{
			lobby: "En attente",
			playing: "Manche en cours",
			voting: "Vote en cours",
			ended: "Partie terminée",
		}[phase] || "En attente"
	);
}
