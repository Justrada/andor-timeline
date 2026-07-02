/* Andor Archive — procedural interface audio (WebAudio, zero assets).
   Three families × three variants, A/B-selectable via soundlab.html.
   Prefs live in localStorage "andor-sounds-v1": {on, vol, door, confirm, reject}. */
window.AndorSound = (function () {
  "use strict";
  const KEY = "andor-sounds-v1";

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || "{}");
      return {
        on: !!s.on,
        vol: Number.isFinite(+s.vol) ? Math.min(1, Math.max(0, +s.vol)) : 0.55,
        door: ["A", "B", "C"].includes(s.door) ? s.door : "A",
        confirm: ["A", "B", "C"].includes(s.confirm) ? s.confirm : "A",
        reject: ["A", "B", "C"].includes(s.reject) ? s.reject : "A",
      };
    } catch (e) {
      return { on: false, vol: 0.55, door: "A", confirm: "A", reject: "A" };
    }
  }
  const prefs = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(prefs)) } catch (e) {} }

  let ctx = null, master = null;
  function ensure() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) {
      ctx = new AC();
      master = ctx.createGain();
      master.connect(ctx.destination);
    }
    master.gain.value = 0.4 * prefs.vol;
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  /* ---------- building blocks ---------- */
  function noiseBuf(dur) {
    const sr = ctx.sampleRate, b = ctx.createBuffer(1, Math.max(1, sr * dur | 0), sr), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  /* gain envelope: attack then exponential-ish decay */
  function env(t0, attack, decay, peak) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
    g.connect(master);
    return g;
  }
  function osc(type, f0, t0, dur) {
    const o = ctx.createOscillator();
    o.type = type; o.frequency.setValueAtTime(f0, t0);
    o.start(t0); o.stop(t0 + dur + 0.05);
    return o;
  }
  function noise(t0, dur) {
    const n = ctx.createBufferSource();
    n.buffer = noiseBuf(dur); n.start(t0); n.stop(t0 + dur + 0.05);
    return n;
  }
  function filt(type, f0, q) {
    const f = ctx.createBiquadFilter();
    f.type = type; f.frequency.value = f0; f.Q.value = q || 1;
    return f;
  }

  /* ---------- DOOR / UNSEAL ---------- */
  const DOORS = {
    /* A · BLAST DOOR — pneumatic hiss sweeping down into a heavy thunk */
    A(t) {
      const hiss = noise(t, 0.55);
      const bp = filt("bandpass", 1400, 1.2);
      bp.frequency.setValueAtTime(1400, t);
      bp.frequency.exponentialRampToValueAtTime(240, t + 0.5);
      hiss.connect(bp).connect(env(t, 0.015, 0.5, 0.5));
      const thump = osc("sine", 72, t + 0.4, 0.3);
      thump.frequency.exponentialRampToValueAtTime(38, t + 0.68);
      thump.connect(env(t + 0.4, 0.005, 0.26, 0.9));
      return 0.75;
    },
    /* B · IRIS SERVO — motor whine with a hiss bed and a latch click */
    B(t) {
      const servo = osc("sawtooth", 170, t, 0.42);
      servo.frequency.linearRampToValueAtTime(820, t + 0.2);
      servo.frequency.linearRampToValueAtTime(290, t + 0.4);
      const lp = filt("lowpass", 1300, 2);
      servo.connect(lp).connect(env(t, 0.02, 0.4, 0.22));
      const hiss = noise(t, 0.4);
      hiss.connect(filt("highpass", 2800, 1)).connect(env(t, 0.01, 0.34, 0.1));
      const click = osc("square", 1900, t + 0.44, 0.03);
      click.connect(filt("bandpass", 1900, 4)).connect(env(t + 0.44, 0.002, 0.05, 0.3));
      return 0.55;
    },
    /* C · VAULT SEAL — sub thump with a metallic ring-off and settling rumble */
    C(t) {
      const sub = osc("sine", 46, t, 0.35);
      sub.frequency.exponentialRampToValueAtTime(30, t + 0.32);
      sub.connect(env(t, 0.004, 0.3, 1.0));
      const ring = noise(t + 0.02, 0.7);
      ring.connect(filt("bandpass", 640, 14)).connect(env(t + 0.02, 0.01, 0.65, 0.28));
      const ring2 = noise(t + 0.02, 0.55);
      ring2.connect(filt("bandpass", 1080, 18)).connect(env(t + 0.02, 0.01, 0.5, 0.12));
      const rumble = noise(t, 0.85);
      rumble.connect(filt("lowpass", 180, 1)).connect(env(t, 0.02, 0.8, 0.3));
      return 0.9;
    },
  };

  /* ---------- CONFIRM ---------- */
  const CONFIRMS = {
    /* A · PING-ACK — two clean ascending tones with a shimmer on the second */
    A(t) {
      osc("sine", 660, t, 0.09).connect(env(t, 0.005, 0.09, 0.4));
      osc("sine", 990, t + 0.1, 0.14).connect(env(t + 0.1, 0.005, 0.14, 0.4));
      osc("sine", 996, t + 0.1, 0.14).connect(env(t + 0.1, 0.005, 0.14, 0.12));
      return 0.3;
    },
    /* B · DATA CHIRP — a single fast upward sweep, like a readout resolving */
    B(t) {
      const o = osc("triangle", 480, t, 0.14);
      o.frequency.exponentialRampToValueAtTime(1500, t + 0.11);
      o.connect(env(t, 0.006, 0.13, 0.45));
      return 0.2;
    },
    /* C · CONSOLE ACK — three tidy blips stepping up */
    C(t) {
      [520, 700, 940].forEach((f, i) => {
        const o = osc("square", f, t + i * 0.065, 0.045);
        o.connect(filt("lowpass", 3200, 1)).connect(env(t + i * 0.065, 0.004, 0.05, 0.22));
      });
      return 0.28;
    },
  };

  /* ---------- REJECT ---------- */
  const REJECTS = {
    /* A · DENIED BUZZ — low detuned square pair with tremolo */
    A(t) {
      const g = env(t, 0.01, 0.26, 0.3);
      const trem = ctx.createGain(); trem.gain.value = 1;
      const lfo = osc("sine", 26, t, 0.3);
      const lfoAmt = ctx.createGain(); lfoAmt.gain.value = 0.5;
      lfo.connect(lfoAmt).connect(trem.gain);
      const lp = filt("lowpass", 850, 1);
      osc("square", 110, t, 0.28).connect(lp);
      osc("square", 113, t, 0.28).connect(lp);
      lp.connect(trem).connect(g);
      return 0.32;
    },
    /* B · DOWN-TONE — a falling two-layer sweep; the request dies */
    B(t) {
      const o1 = osc("sawtooth", 420, t, 0.3);
      o1.frequency.exponentialRampToValueAtTime(230, t + 0.28);
      const o2 = osc("sawtooth", 210, t, 0.3);
      o2.frequency.exponentialRampToValueAtTime(115, t + 0.28);
      const lp = filt("lowpass", 1100, 1.5);
      o1.connect(lp); o2.connect(lp);
      lp.connect(env(t, 0.01, 0.28, 0.28));
      return 0.34;
    },
    /* C · DOUBLE NEGATIVE — two clipped nasal bursts: no. no. */
    C(t) {
      [0, 0.16].forEach(off => {
        const bp = filt("bandpass", 480, 3);
        osc("square", 160, t + off, 0.08).connect(bp);
        osc("square", 164, t + off, 0.08).connect(bp);
        bp.connect(env(t + off, 0.004, 0.09, 0.4));
      });
      return 0.32;
    },
  };

  const FAMILIES = { door: DOORS, confirm: CONFIRMS, reject: REJECTS };

  function playVariant(kind, variant) {
    if (!ensure()) return 0;
    const fam = FAMILIES[kind];
    if (!fam || !fam[variant]) return 0;
    return fam[variant](ctx.currentTime + 0.02);
  }
  function play(kind) {
    if (!prefs.on) return;
    playVariant(kind, prefs[kind] || "A");
  }
  function set(k, v) { prefs[k] = v; save(); if (k === "vol" && master) master.gain.value = 0.4 * prefs.vol; }

  return { play, playVariant, prefs, set, ensure };
})();
