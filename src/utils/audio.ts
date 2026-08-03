// Centralized Audio Synthesis Controller for frictionless creator experience
export function isSoundEnabled(): boolean {
  const saved = localStorage.getItem("axe_hours_sound_enabled");
  return saved !== "false"; // Default to true if not explicitly set to false
}

export function setSoundEnabled(enabled: boolean): void {
  localStorage.setItem("axe_hours_sound_enabled", enabled ? "true" : "false");
}

export function playAudioCue(frequency: number, type: OscillatorType = "sine", duration: number = 0.25): void {
  if (!isSoundEnabled()) return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Graceful fallback for non-supported browsers or interaction blocks
  }
}
