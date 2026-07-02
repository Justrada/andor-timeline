/* Andor Archive — interface audio.
   Nine sourced sound effects (freesound.org, mastered & normalized), selectable
   per family in soundlab.html. Prefs live in localStorage "andor-sounds-v1":
   {on, vol, door, confirm, reject}.

   Sources — all freesound.org, used non-commercially with attribution:
     door A    "Pneumatic Airlock Door Short 019" · Debsound (#725109, CC BY-NC 4.0)
     door B    "Pressurized Door Opening" · NeoSpica (#425090, CC0)
     door C    "Sci Fi Door Hydrolic Swish" · michael_grinnell (#512479, CC0)
     confirm A "UI Beep — Confirmation" · RescopicSound (#749809, CC BY-NC 4.0)
     confirm B "Beep confirmation OK" · SamsterBirdies (#581603, CC0)
     confirm C "Accepted Sweet" · akelley6 (#825716, CC BY 4.0)
     reject A  "Error Signal 2" · Breviceps (#445978, CC0)
     reject B  "Error 3" · qubodup (#722377, CC BY 4.0)
     reject C  "NEGATIVE" · DExUS5 (#392183, CC0) */
window.AndorSound = (function () {
  "use strict";
  const KEY = "andor-sounds-v1";
  const FILES = {
    door:    { A: "assets/sfx/door_a.mp3",    B: "assets/sfx/door_b.mp3",    C: "assets/sfx/door_c.mp3" },
    confirm: { A: "assets/sfx/confirm_a.mp3", B: "assets/sfx/confirm_b.mp3", C: "assets/sfx/confirm_c.mp3" },
    reject:  { A: "assets/sfx/reject_a.mp3",  B: "assets/sfx/reject_b.mp3",  C: "assets/sfx/reject_c.mp3" },
  };

  /* v2: locked-in default set — door A (Pneumatic Airlock), confirm C
     (Sweet Accept), reject B (Harsh Denial). Bumping the version resets
     variant picks to the new defaults while keeping on/vol. */
  const V = 2;
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || "{}");
      const fresh = s.v !== V;
      return {
        v: V,
        on: !!s.on,
        vol: Number.isFinite(+s.vol) ? Math.min(1, Math.max(0, +s.vol)) : 0.55,
        door: !fresh && ["A", "B", "C"].includes(s.door) ? s.door : "A",
        confirm: !fresh && ["A", "B", "C"].includes(s.confirm) ? s.confirm : "C",
        reject: !fresh && ["A", "B", "C"].includes(s.reject) ? s.reject : "B",
      };
    } catch (e) {
      return { v: V, on: false, vol: 0.55, door: "A", confirm: "C", reject: "B" };
    }
  }
  const prefs = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(prefs)) } catch (e) {} }

  let ctx = null, master = null;
  const buffers = {}, loading = {};

  function ensure() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) {
      ctx = new AC();
      master = ctx.createGain();
      master.connect(ctx.destination);
      /* warm the currently selected set */
      ["door", "confirm", "reject"].forEach(k => fetchBuf(FILES[k][prefs[k]]));
    }
    master.gain.value = 0.9 * prefs.vol + 0.05;
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function fetchBuf(url) {
    if (buffers[url]) return Promise.resolve(buffers[url]);
    if (!loading[url]) {
      loading[url] = fetch(url)
        .then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer() })
        .then(a => ctx.decodeAudioData(a))
        .then(b => { buffers[url] = b; return b })
        .catch(() => { delete loading[url]; return null });
    }
    return loading[url];
  }

  function playVariant(kind, variant) {
    if (!ensure()) return;
    const url = FILES[kind] && FILES[kind][variant];
    if (!url) return;
    fetchBuf(url).then(b => {
      if (!b) return;
      const s = ctx.createBufferSource();
      s.buffer = b;
      s.connect(master);
      s.start();
    });
  }
  function play(kind) {
    if (!prefs.on) return;
    playVariant(kind, prefs[kind] || "A");
  }
  function preloadAll() {
    if (!ensure()) return;
    Object.values(FILES).forEach(fam => Object.values(fam).forEach(fetchBuf));
  }
  function set(k, v) {
    prefs[k] = v; save();
    if (k === "vol" && master) master.gain.value = 0.9 * prefs.vol + 0.05;
  }

  return { play, playVariant, prefs, set, ensure, preloadAll };
})();
