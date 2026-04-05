let audio: HTMLAudioElement | null = null;

export function playDiceSound() {
  try {
    if (!audio) audio = new Audio("/roll-dice.m4a");
    audio.currentTime = 0;
    audio.play().catch(() => {});
  } catch {
    // Audio not available — silently ignore
  }
}
