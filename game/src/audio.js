// All of Neon Freeway's sound is synthesised with WebAudio: no audio files, just
// oscillators and filtered noise shaped per effect. The engine hum tracks the road
// speed, and a small step sequencer loops a bass-and-arp line while you drive.

const MASTER_GAIN = 0.5;
const MUSIC_BPM = 112;
const STEP_SECONDS = 60 / MUSIC_BPM / 2; // eighth notes
// A-minor synthwave pattern: bass roots on the bar, a bright arp above them.
const BASS_LINE = [55, 0, 55, 0, 65.41, 0, 55, 0, 49, 0, 49, 0, 73.42, 0, 61.74, 0];
const ARP_LINE = [220, 261.63, 329.63, 440, 329.63, 261.63, 220, 261.63, 196, 246.94, 293.66, 392, 293.66, 246.94, 164.81, 246.94];

export class SoundEngine {
  constructor() {
    this.context = null;
    this.master = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.musicTimer = 0;
    this.musicStep = 0;
    this.nextNoteTime = 0;
    this.playing = false;
    this.muted = false;
  }

  /** Create the context on the first user gesture; later calls just resume it. */
  unlock() {
    if (this.context === null) {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return;
      this.context = new AudioCtor();
      this.master = this.context.createGain();
      this.master.gain.value = this.muted ? 0 : MASTER_GAIN;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') void this.context.resume();
  }

  /** Flip the mute switch; returns the new state. */
  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : MASTER_GAIN;
    return this.muted;
  }

  /** One shaped tone: frequency glides from `from` to `to` over `seconds`. */
  tone(from, to, seconds, type = 'square', volume = 0.2, when = 0) {
    if (!this.context || !this.master) return;
    const start = this.context.currentTime + when;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + seconds);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + seconds);
    osc.connect(gain).connect(this.master);
    osc.start(start);
    osc.stop(start + seconds + 0.02);
  }

  /** One burst of filtered noise, for crashes and nitro wind. */
  noise(seconds, volume = 0.3, frequency = 900, when = 0) {
    if (!this.context || !this.master) return;
    const start = this.context.currentTime + when;
    const length = Math.max(1, Math.floor(this.context.sampleRate * seconds));
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = frequency;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + seconds);
    source.connect(filter).connect(gain).connect(this.master);
    source.start(start);
  }

  /** A bright two-note blip when an energy cell is collected. */
  pickup() {
    this.tone(880, 1320, 0.09, 'square', 0.16);
    this.tone(1320, 1760, 0.12, 'square', 0.12, 0.06);
  }

  /** A quick downward sweep as traffic whips past within a mirror's width. */
  nearMiss() {
    this.noise(0.16, 0.22, 2400);
    this.tone(340, 180, 0.14, 'sawtooth', 0.08);
  }

  /** A heavy thud and scrape on impact. */
  crash() {
    this.noise(0.4, 0.5, 500);
    this.tone(120, 38, 0.42, 'sawtooth', 0.4);
  }

  /** The countdown beeps; the last one is the higher go. */
  countBeep(final) {
    this.tone(final ? 880 : 440, final ? 880 : 440, final ? 0.3 : 0.14, 'square', 0.2);
  }

  /** A rising chime when a new sector begins. */
  sector() {
    this.tone(523.25, 523.25, 0.1, 'triangle', 0.2);
    this.tone(659.25, 659.25, 0.1, 'triangle', 0.2, 0.09);
    this.tone(783.99, 783.99, 0.18, 'triangle', 0.2, 0.18);
  }

  /** A short descending phrase for the results screen. */
  gameOver() {
    this.tone(392, 392, 0.16, 'triangle', 0.22);
    this.tone(329.63, 329.63, 0.16, 'triangle', 0.22, 0.16);
    this.tone(261.63, 196, 0.4, 'triangle', 0.22, 0.32);
  }

  /** Start the engine hum and the music loop; call when a run begins. */
  startEngine() {
    this.unlock();
    if (!this.context || !this.master || this.playing) return;
    this.playing = true;
    this.engineOsc = this.context.createOscillator();
    this.engineOsc.type = 'sawtooth';
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    this.engineGain = this.context.createGain();
    this.engineGain.gain.value = 0.05;
    this.engineOsc.connect(filter).connect(this.engineGain).connect(this.master);
    this.engineOsc.start();
    this.nextNoteTime = this.context.currentTime + 0.06;
    this.musicStep = 0;
  }

  /** Stop the engine and the music; call when a run ends or pauses. */
  stopEngine() {
    this.playing = false;
    if (this.engineOsc) {
      try { this.engineOsc.stop(); } catch { /* already stopped */ }
      this.engineOsc = null;
    }
  }

  /** Feed the current road speed each frame; schedules music a little ahead. */
  update(speedRatio) {
    if (!this.context || !this.playing) return;
    if (this.engineOsc) this.engineOsc.frequency.value = 52 + speedRatio * 88;
    const horizon = this.context.currentTime + 0.14;
    while (this.nextNoteTime < horizon) {
      const step = this.musicStep % 16;
      const bass = BASS_LINE[step];
      if (bass) this.tone(bass, bass, STEP_SECONDS * 0.9, 'triangle', 0.16, this.nextNoteTime - this.context.currentTime);
      if (step % 2 === 0) {
        const arp = ARP_LINE[step];
        if (arp) this.tone(arp, arp, STEP_SECONDS * 0.7, 'square', 0.045, this.nextNoteTime - this.context.currentTime);
      }
      this.nextNoteTime += STEP_SECONDS;
      this.musicStep += 1;
    }
  }
}
