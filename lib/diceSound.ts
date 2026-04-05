let audio: HTMLAudioElement | null = null;

export function playDiceSound() {
  try {
    if (!audio) audio = new Audio("/roll-dice.mp3");
    audio.currentTime = 0;
    audio.play().catch(() => {});
  } catch {
    // Audio not available — silently ignore
  }
}
