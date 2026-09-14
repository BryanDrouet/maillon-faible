import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { db } from "../scripts/firebase.js";
import { chainValues, phaseLabel } from "../scripts/game-calculations.js";
const code = (new URLSearchParams(location.search).get("room") || "").toUpperCase();

if (code) {
    onValue(ref(db, `rooms/${code}`), (snapshot) => {
        const game = snapshot.val();
        if (!game) return;
        document.getElementById("bank").textContent = `${game.bank || 0}€`;
        document.getElementById("chain").textContent = `${chainValues[game.chainIndex] || 0}€`;
        document.getElementById("status").textContent = phaseLabel(game.phase);
    });
}