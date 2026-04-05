let audioCtx: AudioContext | null = null;

export function playDiceSound() {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    const ctx = audioCtx;

    const now = ctx.currentTime;

    // Short burst of noise to simulate dice hitting a surface
    const duration = 0.15;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      // Noise that decays quickly
      const t = i / bufferSize;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // Bandpass filter to make it sound like a click/tap
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 3000;
    filter.Q.value = 0.8;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + duration);

    // Second tap for "double click" dice feel
    const delay = 0.08;
    const buffer2 = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.1), ctx.sampleRate);
    const data2 = buffer2.getChannelData(0);
    for (let i = 0; i < data2.length; i++) {
      const t = i / data2.length;
      data2[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 4);
    }

    const noise2 = ctx.createBufferSource();
    noise2.buffer = buffer2;
    const filter2 = ctx.createBiquadFilter();
    filter2.type = "bandpass";
    filter2.frequency.value = 2200;
    filter2.Q.value = 1;
    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0.2, now + delay);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.1);

    noise2.connect(filter2);
    filter2.connect(gain2);
    gain2.connect(ctx.destination);

    noise2.start(now + delay);
    noise2.stop(now + delay + 0.1);
  } catch {
    // Audio not available — silently ignore
  }
}
