// Stream Bitrate HUD v2 — YouTube-style network health graph
const { core, event, overlay, mpv, menu, preferences, console } = iina;

let visible = true;
let timer = null;
let overlayReady = false;


function num(name) {
  try {
    const v = mpv.getNumber(name);
    return typeof v === "number" && isFinite(v) ? v : null;
  } catch (e) { return null; }
}

function flag(name) {
  try { return mpv.getFlag(name); } catch (e) { return false; }
}

function videoFormat() {
  const out = { codec: null, res: null, hdr: null };
  try {
    const s = mpv.getString("video-codec"); // e.g. "h264 (High) (avc1 / 0x31637661)"
    if (s) {
      const m = s.match(/\(([a-zA-Z0-9]{4})\s*\//);
      const fourcc = m ? m[1].toLowerCase() : null;
      const t = s.toLowerCase(); // 描述可能是 "Google VP9"、"Alliance for Open Media AV1" 等
      out.codec =
        /\bav1\b|av01|open media av1/.test(t) ? "av1" :
        /\bvp9\b|vp09/.test(t) ? "vp9" :
        /\bvp8\b|vp80/.test(t) ? "vp8" :
        /\bhevc\b|h265|hvc1|hev1/.test(t) ? "hevc" :
        /\bh264\b|avc1/.test(t) ? "avc1" :
        fourcc ? fourcc : t.split(" ")[0];
    }
  } catch (e) {}
  // 分辨率：始终显示，按实际视频高度就近映射档位
  const tiers = [144, 240, 360, 480, 720, 1080, 1440, 2160, 4320];
  let tier = 0;
  try {
    // 注意：IINA 插件 API 只有 getNumber，没有 getInt！
    const h = num("video-params/h") || num("height");
    if (h > 0) {
      tier = tiers[0];
      for (const t of tiers) { if (Math.abs(t - h) < Math.abs(tier - h)) tier = t; }
      out.res = tier + "p";
    }
  } catch (e) {}

  // HDR：直接看 IINA 是否实际启用了 HDR。
  // IINA 源码 VideoView.requestEdrMode()：当且仅当
  //   「Enable HDR support 开关打开 + 视频是 HDR + 屏幕支持 EDR」
  // 三者同时满足时，才会把 mpv 选项 target-trc 设为 "pq"（EDR 直通）；
  // 否则走 setICCProfile()，target-trc 为 "auto"（SDR/色调映射）。
  // 所以读 options/target-trc 就等于读 IINA 的 HDR 实际激活状态。
  // 注：IINA/mpv 不支持杜比视界。DV Profile 8.1 兼容层按 HDR10 显示；
  // Profile 5 无兼容层，色彩异常，插件无法修正。
  try {
    const trc = (mpv.getString("options/target-trc") || "").toLowerCase();
    if (trc === "pq" || trc === "hlg") {
      const gamma = (mpv.getString("video-params/gamma") || "").toLowerCase();
      out.hdr = (gamma === "hlg" || gamma === "arib-std-b67") ? "HLG" : "HDR10";
    }
  } catch (e) {}
  return out;
}

function health(buf, stalling, paused) {
  if (paused) return "gray";
  if (stalling || buf == null || buf < 3) return "red";
  if (buf < 10) return "yellow";
  return "green";
}

function tick() {
  if (!visible || !overlayReady) return;
  const st = core.status;
  if (!st.isNetworkResource || st.idle) {
    overlay.hide();
    return;
  }
  overlay.show();

  // real network download speed (B/s); fall back to demuxer bitrate
  let speed = num("cache-speed");
  if (speed == null || speed <= 0) speed = num("demuxer-bitrate");
  const buf = num("demuxer-cache-duration");
  const bitrate = num("video-bitrate"); // bits/s
  const paused = st.paused;
  const stalling = flag("paused-for-cache");
  const vf = videoFormat();

  overlay.postMessage("stats", {
    speed: speed != null ? speed : 0,
    buf: buf,
    bitrate: bitrate,
    codec: vf.codec,
    res: vf.res,
    hdr: vf.hdr,
    paused: paused,
    stalling: stalling,
    health: health(buf, stalling, paused),
    unit: preferences.get("unit") || "auto",
    position: preferences.get("position") || "left",
  });
}

function start() {
  if (!core.window.loaded) return;
  if (!overlayReady) {
    overlay.loadFile("overlay.html");
    overlay.setClickable(false);
    overlayReady = true;
  }
  overlay.postMessage("stats", { reset: true });
  if (visible && core.status.isNetworkResource) overlay.show();
  if (!timer) timer = setInterval(tick, 1000);
}

event.on("iina.window-loaded", start);
event.on("iina.file-loaded", () => {
  if (overlayReady) overlay.postMessage("stats", { reset: true });
  start();
});
event.on("mpv.end-file", () => overlay.hide());

// toggle via Plugin menu, Shift+B
menu.addItem(menu.item("切换网络健康度图表", () => {
  visible = !visible;
  if (visible) { start(); tick(); }
  else overlay.hide();
  core.osd(visible ? "网络健康度图表：开" : "网络健康度图表：关");
}, { keyBinding: "Shift+B" }));

if (core.window.loaded) start();
console.log("stream-bitrate v2 loaded");