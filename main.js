import { startGameApp } from "./scripts/game-controller.js";

if (document.getElementById("app-container")) startGameApp();
if ("serviceWorker" in navigator) {
	navigator.serviceWorker
		.register("/sw.js", { updateViaCache: "none" })
		.then((registration) => registration.update());
}
