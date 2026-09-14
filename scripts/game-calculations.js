export const chainValues = [0, 20, 50, 100, 200, 300, 450, 600, 800, 1000];

export function formatRoomCode(value) {
    return value.trim().toUpperCase().replace(/[^A-Z]/g, "").slice(0, 9).replace(/(.{3})(?=.)/g, "$1-");
}

export function createRoomCode() {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    return formatRoomCode(Array.from({ length: 9 }, () => letters[Math.floor(Math.random() * letters.length)]).join(""));
}

export function activePlayers(game) {
    return Object.entries(game.players || {}).filter(([, player]) => player.active);
}

export function gameEvent(type) {
    return { event: { id: crypto.randomUUID(), type } };
}

export function phaseLabel(phase) {
    return ({ lobby: "En attente", playing: "Manche en cours", voting: "Vote en cours", ended: "Partie terminée" })[phase] || "En attente";
}
