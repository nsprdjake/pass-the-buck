"use client";

// =================================================================
// Lightweight Web Audio sound effects for the game.
//
// All sounds are synthesized at runtime — no audio assets to ship.
// Triggered exclusively from user gestures (ROLL taps, animation
// callbacks fired after a gesture), so they stay within browser
// autoplay rules.
// =================================================================

export type SfxName =
  | "slam"
  | "roll"
  | "dieLand"
  | "reveal"
  | "slideLeft"
  | "slideRight"
  | "pot"
  | "keep"
  | "winner"
  | "pass"
  | "joinClick";

const MASTER_VOLUME = 0.7;

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let muted = false;

const MUTE_KEY = "ptb:muted";

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      masterGain = ctx.createGain();
      masterGain.gain.value = muted ? 0 : MASTER_VOLUME;
      masterGain.connect(ctx.destination);
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

export function setMuted(value: boolean) {
  muted = value;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(MUTE_KEY, value ? "1" : "0");
    } catch {
      // ignore
    }
  }
  if (masterGain) {
    masterGain.gain.value = muted ? 0 : MASTER_VOLUME;
  }
}

export function isMuted(): boolean {
  if (typeof window === "undefined") return false;
  if (muted) return true;
  try {
    return window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

// Sync the in-memory mute flag once on first access (client only).
function syncMuteFromStorage() {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem(MUTE_KEY) === "1") muted = true;
  } catch {
    // ignore
  }
}
syncMuteFromStorage();

// =================================================================
// Primitive helpers
// =================================================================

function noiseBuffer(c: AudioContext, durSec: number): AudioBuffer {
  const len = Math.max(1, Math.floor(c.sampleRate * durSec));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

type ToneOpts = {
  freq: number;
  dur: number;
  type?: OscillatorType;
  startVolume?: number;
  endVolume?: number;
  attack?: number;
  freqEnd?: number;
  pan?: number;
  delay?: number;
};

function playTone(c: AudioContext, opts: ToneOpts) {
  if (!masterGain) return;
  const t0 = c.currentTime + (opts.delay ?? 0);
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = opts.type ?? "sine";
  osc.frequency.setValueAtTime(opts.freq, t0);
  if (opts.freqEnd) {
    osc.frequency.exponentialRampToValueAtTime(opts.freqEnd, t0 + opts.dur);
  }
  const start = opts.startVolume ?? 0.4;
  const end = opts.endVolume ?? 0.0001;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.linearRampToValueAtTime(start, t0 + (opts.attack ?? 0.01));
  gain.gain.exponentialRampToValueAtTime(end, t0 + opts.dur);
  let last: AudioNode = gain;
  if (opts.pan !== undefined && c.createStereoPanner) {
    const panner = c.createStereoPanner();
    panner.pan.value = opts.pan;
    gain.connect(panner);
    last = panner;
  }
  osc.connect(gain);
  last.connect(masterGain);
  osc.start(t0);
  osc.stop(t0 + opts.dur + 0.05);
}

type NoiseOpts = {
  dur: number;
  filter?: BiquadFilterType;
  freq?: number;
  q?: number;
  freqEnd?: number;
  volume?: number;
  pan?: number;
  delay?: number;
};

function playNoise(c: AudioContext, opts: NoiseOpts) {
  if (!masterGain) return;
  const t0 = c.currentTime + (opts.delay ?? 0);
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, opts.dur);
  const filter = c.createBiquadFilter();
  filter.type = opts.filter ?? "bandpass";
  filter.frequency.setValueAtTime(opts.freq ?? 1000, t0);
  if (opts.freqEnd) {
    filter.frequency.exponentialRampToValueAtTime(opts.freqEnd, t0 + opts.dur);
  }
  filter.Q.value = opts.q ?? 1;
  const gain = c.createGain();
  gain.gain.setValueAtTime(opts.volume ?? 0.4, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
  let last: AudioNode = gain;
  if (opts.pan !== undefined && c.createStereoPanner) {
    const panner = c.createStereoPanner();
    panner.pan.value = opts.pan;
    gain.connect(panner);
    last = panner;
  }
  src.connect(filter);
  filter.connect(gain);
  last.connect(masterGain);
  src.start(t0);
  src.stop(t0 + opts.dur + 0.05);
}

// =================================================================
// Specific sound effects
// =================================================================

function sfxSlam(c: AudioContext) {
  // Low thump + small click
  playTone(c, {
    freq: 110,
    freqEnd: 50,
    type: "sine",
    dur: 0.18,
    startVolume: 0.7,
    attack: 0.005,
  });
  playNoise(c, {
    dur: 0.08,
    freq: 1800,
    q: 0.7,
    volume: 0.35,
  });
}

function sfxRoll(c: AudioContext) {
  // Continuous tumble noise + a few staggered clicks
  playNoise(c, {
    dur: 0.55,
    freq: 1200,
    freqEnd: 600,
    q: 0.8,
    volume: 0.25,
  });
  for (let i = 0; i < 5; i++) {
    playNoise(c, {
      dur: 0.07,
      freq: 1600 + Math.random() * 800,
      q: 5,
      volume: 0.3,
      delay: i * 0.09 + Math.random() * 0.04,
    });
  }
}

function sfxDieLand(c: AudioContext) {
  playNoise(c, {
    dur: 0.07,
    freq: 1500,
    q: 5,
    volume: 0.5,
  });
  playTone(c, {
    freq: 230,
    type: "triangle",
    dur: 0.09,
    startVolume: 0.3,
  });
}

function sfxReveal(c: AudioContext) {
  // Upward sweep "swoosh"
  playTone(c, {
    freq: 280,
    freqEnd: 880,
    type: "sine",
    dur: 0.22,
    startVolume: 0.45,
  });
  playNoise(c, {
    dur: 0.16,
    freq: 800,
    freqEnd: 2400,
    q: 0.9,
    volume: 0.2,
  });
}

function sfxSlide(c: AudioContext, pan: number) {
  // Whoosh with stereo pan toward direction
  playNoise(c, {
    dur: 0.32,
    freq: 1200,
    freqEnd: 380,
    q: 0.6,
    volume: 0.45,
    pan,
  });
  playTone(c, {
    freq: 560,
    freqEnd: 260,
    type: "sawtooth",
    dur: 0.25,
    startVolume: 0.18,
    pan,
  });
}

function sfxPot(c: AudioContext) {
  // 3 metallic clicks in quick succession + low rumble
  for (let i = 0; i < 4; i++) {
    playNoise(c, {
      dur: 0.06,
      freq: 1800 + Math.random() * 400,
      q: 8,
      volume: 0.5,
      delay: i * 0.04,
    });
  }
  playTone(c, {
    freq: 150,
    type: "sine",
    dur: 0.25,
    startVolume: 0.35,
    delay: 0.06,
  });
}

function sfxKeep(c: AudioContext) {
  // Bright chord (root + maj 3rd + 5th)
  playTone(c, {
    freq: 523.25, // C5
    type: "triangle",
    dur: 0.34,
    startVolume: 0.3,
  });
  playTone(c, {
    freq: 659.25, // E5
    type: "triangle",
    dur: 0.34,
    startVolume: 0.28,
  });
  playTone(c, {
    freq: 783.99, // G5
    type: "triangle",
    dur: 0.34,
    startVolume: 0.25,
  });
}

function sfxWinner(c: AudioContext) {
  // Rising arpeggio + cymbal noise
  const notes = [
    523.25, // C5
    659.25, // E5
    783.99, // G5
    1046.5, // C6
  ];
  notes.forEach((f, i) => {
    playTone(c, {
      freq: f,
      type: "triangle",
      dur: 0.42,
      startVolume: 0.35,
      delay: i * 0.11,
    });
  });
  // sustained high "shimmer"
  playTone(c, {
    freq: 1568, // G6
    type: "sine",
    dur: 0.9,
    startVolume: 0.15,
    delay: 0.45,
  });
  playNoise(c, {
    dur: 0.7,
    filter: "highpass",
    freq: 3000,
    q: 0.5,
    volume: 0.18,
    delay: 0.45,
  });
}

function sfxPass(c: AudioContext) {
  // Soft chime: two notes
  playTone(c, {
    freq: 660,
    type: "sine",
    dur: 0.22,
    startVolume: 0.3,
  });
  playTone(c, {
    freq: 880,
    type: "sine",
    dur: 0.32,
    startVolume: 0.25,
    delay: 0.08,
  });
}

function sfxJoinClick(c: AudioContext) {
  playTone(c, {
    freq: 800,
    type: "square",
    dur: 0.06,
    startVolume: 0.25,
  });
}

// =================================================================
// Public API
// =================================================================

export function playSfx(name: SfxName) {
  if (muted) return;
  const c = getCtx();
  if (!c) return;
  try {
    switch (name) {
      case "slam":
        return sfxSlam(c);
      case "roll":
        return sfxRoll(c);
      case "dieLand":
        return sfxDieLand(c);
      case "reveal":
        return sfxReveal(c);
      case "slideLeft":
        return sfxSlide(c, -0.9);
      case "slideRight":
        return sfxSlide(c, 0.9);
      case "pot":
        return sfxPot(c);
      case "keep":
        return sfxKeep(c);
      case "winner":
        return sfxWinner(c);
      case "pass":
        return sfxPass(c);
      case "joinClick":
        return sfxJoinClick(c);
    }
  } catch {
    // synth errors silently fail
  }
}

/** Prime/resume the audio context. Call from a user gesture. */
export function unlockAudio() {
  getCtx();
}
