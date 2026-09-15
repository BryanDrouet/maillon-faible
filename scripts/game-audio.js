let audioContext;

export function unlockAudio() {
	audioContext ||= new AudioContext();
	audioContext.resume();
}

export function playGameSound(type) {
	if (!audioContext) return;
	const tones =
		{
			correct: [660, 880],
			wrong: [200, 140],
			start: [440, 660, 880],
			end: [880, 660, 440],
			bank: [740],
		}[type] || [];
	tones.forEach((frequency, index) => {
		const oscillator = audioContext.createOscillator();
		const gain = audioContext.createGain();
		const time = audioContext.currentTime + index * 0.12;
		oscillator.frequency.value = frequency;
		gain.gain.setValueAtTime(0.08, time);
		gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
		oscillator.connect(gain).connect(audioContext.destination);
		oscillator.start(time);
		oscillator.stop(time + 0.1);
	});
}
