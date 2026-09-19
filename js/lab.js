/* =========================================================
   lab.js — 등속 운동과 그래프 실험실
   ---------------------------------------------------------
   계산은 movement.js 가 하고, 이 파일은 그것을 '보이게' 만든다.

   화면의 핵심 장치 세 가지
     ① **시각 t 하나**가 모든 것을 움직인다.
        트랙 위의 수레 · 1초 간격 잔상 · 두 그래프의 점이 같은 t 를 따라간다.
     ② **잔상 간격 = 1초 동안 이동한 거리.**
        등속 운동은 간격이 일정하고, 등속이 아닌 운동은 간격이 변한다.
     ③ 그래프의 점은 **트랙의 수레와 같은 값**이다 — 같은 함수(Movement.dist / speed)에서 나온다.

   ⚠ **그려진 길이가 곧 값이다.** 트랙의 눈금은 1 m 당 같은 px 이고,
      그래프의 눈금도 선형이다. 잔상 사이의 px 가 곧 그 1초 동안 간 거리다.
   ========================================================= */
(function () {
  "use strict";

  var M = window.Movement;

  var S = {
    scene: "run",
    t: 0, playing: false,
    v: 3, vA: 6, vB: 3,
    mission: null, predictPick: null, missionState: "ready"
  };

  var canvas, ctx, cssW = 900, cssH = 556;
  var records = [];
  var seen = { t4: false, v5t4: false, diff5: false, vs: {}, kinds10: false, t5: false };
  var raf = 0, lastFrame = 0;

  var COL = { ink: "#e2e8f0", faint: "#64748b", line: "#94a3b8", now: "#fde047" };

  /* 트랙 여백 — 눈금·차·잔상이 모두 이 값을 쓴다 */
  var MARGIN_L = 84, MARGIN_R = 24;

  function $(id) { return document.getElementById(id); }
  function clamp(v, a, b) { return M.clamp(v, a, b); }
  function f1(v) { return String(Math.round(v * 10) / 10); }        // 5 → "5", 12.5 → "12.5"
  function fT(t) { return (Math.round(t * 10) / 10).toFixed(1); }   // 4 → "4.0"

  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  /* ---------------------------------------------------------
     1. 지금 장면에서 보여 줄 운동들
     --------------------------------------------------------- */
  function sceneKind() {
    if (S.scene === "mission") return S.mission ? S.mission.scene : "run";
    return S.scene;
  }

  function series() {
    var k = sceneKind();
    var out;
    if (k === "compare") {
      out = [
        { key: "A", name: "A", kind: "uniform", v: S.vA, stage: "#38bdf8", ink: "#0284c7" },
        { key: "B", name: "B", kind: "uniform", v: S.vB, stage: "#fbbf24", ink: "#d97706" }
      ];
    } else if (k === "kinds") {
      out = M.KINDS.map(function (K) {
        return { key: K.key, name: K.name, kind: K.key, v: M.KIND_V, stage: K.css, ink: K.ink };
      });
    } else {
      out = [{ key: "run", name: "수레", kind: "uniform", v: S.v, stage: "#38bdf8", ink: "#0284c7" }];
    }
    out.forEach(function (s) {
      s.d = function (t) { return M.dist(s.kind, s.v, t); };
      s.sp = function (t) { return M.speed(s.kind, s.v, t); };
    });
    return out;
  }

  /* ---------------------------------------------------------
     2. 미션
        ⚠ 시작 상태에서 목표가 모두 false 여야 한다 (시작하자마자 깨지면 미션이 아니다)
     --------------------------------------------------------- */
  var MISSIONS = [
    {
      id: 1, star: "🚗", title: "간격이 일정하다",
      story: "수레가 <b>3 m/s</b> 로 달린다. ▶ 를 눌러 <b>4초 넘게</b> 달리게 하면서 " +
             "1초마다 찍히는 <b>잔상의 간격</b>을 지켜보자.",
      scene: "run", setup: { t: 0, v: 3 }, allow: ["v", "t"],
      predict: { q: "1초마다 찍히는 잔상 사이의 간격은?",
                 opts: ["점점 커진다", "<b>일정하다</b>", "점점 작아진다"], ans: 1 },
      goals: [{ key: "t4", text: "시각을 <b>4 초 이후</b>까지 보내 잔상 관찰하기" }],
      why: "<b>일정합니다.</b> 1초마다 <b>3 m</b> 씩 갔어요.<br>" +
           "이렇게 <b>속력이 일정한</b> 운동을 <b>등속 운동</b>이라고 합니다."
    },
    {
      id: 2, star: "📏", title: "얼마나 갔을까",
      story: "이번엔 속력을 <b>5 m/s</b> 로 맞추고, <b>4초</b> 동안 달려 보자. 이동 거리는 몇 m 일까?",
      scene: "run", setup: { t: 0, v: 3 }, allow: ["v", "t"],
      predict: { q: "5 m/s 로 4초 동안 달리면 이동 거리는?",
                 opts: ["9 m", "<b>20 m</b>", "5 m"], ans: 1 },
      goals: [{ key: "v5t4", text: "속력을 <b>5 m/s</b> 로 두고 시각을 <b>4 초 이상</b>으로 보내기" }],
      why: "<b>20 m</b> 입니다. <b>이동 거리 = 속력 × 시간</b> = 5 m/s × 4 s = 20 m.<br>" +
           "1초에 5 m 씩, 4번이니까요. 눈금을 읽어 확인해 보세요."
    },
    {
      id: 3, star: "🏁", title: "그래프가 더 가파른 쪽",
      story: "<b>A</b> 와 <b>B</b> 가 나란히 달린다. 두 물체의 <b>속력을 서로 다르게</b> 바꾸고 " +
             "<b>5초 이후</b>까지 달려 보자. 시간-이동 거리 그래프의 두 선은 어떻게 다를까?",
      scene: "compare", setup: { t: 0, vA: 4, vB: 4 }, allow: ["vA", "vB", "t"],
      predict: { q: "더 빠른 물체의 시간-이동 거리 그래프는?",
                 opts: ["<b>더 가파르다</b>", "더 완만하다", "두 선이 같다"], ans: 0 },
      goals: [{ key: "diff5", text: "A 와 B 의 속력을 <b>다르게</b> 하고, 시각을 <b>5 초 이후</b>로 보내기" }],
      why: "<b>더 가파릅니다.</b> 같은 시간 동안 <b>더 멀리</b> 가니까요.<br>" +
           "그래프의 <b>기울기 = 이동 거리 ÷ 걸린 시간 = 속력</b> 입니다. " +
           "가파를수록 빠른 물체예요."
    },
    {
      id: 4, star: "➖", title: "속력 그래프는 수평선",
      story: "수레의 속력을 바꿔 가며 <b>시간-속력 그래프</b>를 관찰하자. " +
             "<b>서로 다른 두 속력</b>에서 시각을 1초 이상 보내 보자.",
      scene: "run", setup: { t: 0, v: 3 }, allow: ["v", "t"],
      predict: { q: "등속 운동의 시간-속력 그래프는 어떤 모양일까?",
                 opts: ["오른쪽 위로 올라가는 직선", "<b>시간축에 나란한 수평선</b>", "오른쪽 아래로 내려가는 직선"], ans: 1 },
      goals: [{ key: "vs", text: "<b>서로 다른 두 속력</b>에서 시각을 1초 이상 보내 보기" }],
      why: "<b>시간축에 나란한 수평선</b>입니다. 시간이 지나도 속력이 <b>변하지 않으니까요.</b><br>" +
           "속력이 클수록 수평선이 <b>위쪽</b>에 놓입니다."
    },
    {
      id: 5, star: "🚀", title: "점점 빨라지는 운동",
      story: "🔀 세 운동을 함께 달려 보자. <b>10초</b>까지 끝까지 보내면서 " +
             "<b>🚀 점점 빨라짐</b>의 잔상 간격과 그래프 모양을 살펴보자.",
      scene: "kinds", setup: { t: 0 }, allow: ["t"],
      predict: { q: "점점 빨라지는 운동의 시간-이동 거리 그래프는?",
                 opts: ["원점을 지나는 직선", "<b>갈수록 가팔라지는 곡선</b>", "시간축에 나란한 수평선"], ans: 1 },
      goals: [{ key: "kinds10", text: "시각을 <b>10 초</b>까지 끝까지 보내기" }],
      why: "<b>갈수록 가팔라지는 곡선</b>입니다. 기울기가 곧 속력인데 속력이 점점 커지니까요.<br>" +
           "잔상 간격도 <b>0.5 m → 1.5 m → 2.5 m …</b> 처럼 점점 넓어집니다."
    },
    {
      id: 6, star: "🏆", title: "같은 곳에 도착해도",
      story: "세 운동은 모두 <b>10초 뒤 50 m</b> 에 닿는다. 그렇다면 도중인 <b>5초</b> 때는 " +
             "누가 가장 앞에 있을까? 시각을 5초에 맞춰 보자.",
      scene: "kinds", setup: { t: 0 }, allow: ["t"],
      predict: { q: "5초 때 가장 앞선 운동은?",
                 opts: ["➡️ 등속 운동", "🚀 점점 빨라짐", "<b>🛑 점점 느려짐</b>"], ans: 2 },
      goals: [{ key: "t5", text: "시각을 <b>5 초</b>에 맞춰 세 운동을 견주기" }],
      why: "<b>🛑 점점 느려짐</b>이 가장 앞섭니다 (37.5 m).<br>" +
           "5초 때 — 점점 느려짐 <b>37.5 m</b> · 등속 <b>25 m</b> · 점점 빨라짐 <b>12.5 m</b>.<br>" +
           "처음에 빨랐던 쪽이 앞서다가, 마지막에 셋이 <b>같은 50 m</b> 에서 만납니다."
    }
  ];

  /* ---------------------------------------------------------
     3. 화면 만들기
     --------------------------------------------------------- */
  function layout() {
    if (!canvas) return;
    var r = canvas.getBoundingClientRect();
    cssW = Math.max(320, Math.round(r.width || 900));
    cssH = Math.max(200, Math.round(r.height || cssW / 1.62));
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function pxPerM() { return (cssW - MARGIN_L - MARGIN_R) / M.TRACK_M; }
  function trackX(d) { return MARGIN_L + d * pxPerM(); }

  function car(g, cx, yc, col) {
    g.fillStyle = col;
    roundRect(g, cx - 22, yc - 14, 44, 18, 5); g.fill();
    g.fillStyle = "rgba(255,255,255,.55)";
    roundRect(g, cx - 9, yc - 24, 20, 11, 3); g.fill();
    g.fillStyle = "#0f172a";
    g.beginPath(); g.arc(cx - 12, yc + 5, 5, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(cx + 12, yc + 5, 5, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "rgba(226,232,240,.7)"; g.lineWidth = 1.2;
    roundRect(g, cx - 22, yc - 14, 44, 18, 5); g.stroke();
  }

  function draw() {
    if (!ctx) return;
    var g = ctx;
    var grad = g.createLinearGradient(0, 0, 0, cssH);
    grad.addColorStop(0, "#0b1220"); grad.addColorStop(1, "#1e293b");
    g.fillStyle = grad; g.fillRect(0, 0, cssW, cssH);

    var ser = series();
    var k = sceneKind();
    var ppm = pxPerM();

    /* ---- 제목 · 시각 ---- */
    g.textAlign = "left"; g.fillStyle = COL.faint; g.font = "14px sans-serif";
    g.fillText(k === "compare" ? "🏁 같은 출발선에서 동시에 출발"
             : (k === "kinds" ? "🔀 세 운동 모두 10초 뒤 50 m 에 닿는다" : "🚗 수레 한 대가 달린다"), 16, 24);
    g.fillStyle = COL.now; g.font = "bold 18px sans-serif";
    g.fillText("시각 t = " + fT(S.t) + " s", 16, 48);

    /* ---- 눈금자 (0 ~ 100 m) : 1 m 당 ppm px 로 **선형** ---- */
    var rulerY = 80;
    g.strokeStyle = "rgba(226,232,240,.6)"; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(trackX(0), rulerY); g.lineTo(trackX(M.TRACK_M), rulerY); g.stroke();
    var labelStep = ppm * 10 >= 34 ? 10 : 20;
    g.fillStyle = COL.line; g.font = "12px sans-serif"; g.textAlign = "center";
    for (var m = 0; m <= M.TRACK_M; m += 10) {
      var tx = trackX(m);
      g.beginPath(); g.moveTo(tx, rulerY); g.lineTo(tx, rulerY + (m % 20 === 0 ? 9 : 6)); g.stroke();
      if (m % labelStep === 0) g.fillText(m + (m === M.TRACK_M ? " m" : ""), tx, rulerY - 6);
    }

    /* ---- 길(레인) ---- */
    var top = 104, bottom = cssH - 64;
    var pitch = (bottom - top) / ser.length;
    ser.forEach(function (s, i) {
      var yc = top + pitch * (i + 0.5);
      var dNow = s.d(S.t);

      g.fillStyle = "rgba(148,163,184,.13)";
      g.fillRect(trackX(0), yc - 20, trackX(M.TRACK_M) - trackX(0), 40);
      g.strokeStyle = "rgba(226,232,240,.30)"; g.lineWidth = 1; g.setLineDash([8, 7]);
      g.beginPath(); g.moveTo(trackX(0), yc); g.lineTo(trackX(M.TRACK_M), yc); g.stroke();
      g.setLineDash([]);
      g.strokeStyle = "#4ade80"; g.lineWidth = 2;                  // 출발선
      g.beginPath(); g.moveTo(trackX(0), yc - 22); g.lineTo(trackX(0), yc + 22); g.stroke();

      /* 레인 이름 */
      g.textAlign = "left"; g.fillStyle = s.stage; g.font = "bold 13px sans-serif";
      var nm = s.name;
      if (k === "run") nm = "수레";
      g.fillText(nm, 10, yc + 4);
      if (k !== "kinds") {
        g.fillStyle = COL.faint; g.font = "12px sans-serif";
        g.fillText(f1(s.v) + " m/s", 10, yc + 20);
      } else if (s.kind === "uniform") {
        g.fillStyle = COL.faint; g.font = "12px sans-serif";
        g.fillText(f1(s.v) + " m/s", 10, yc + 20);
      }

      /* 잔상 — 1초마다 한 점. 점과 점 사이의 px 가 그 1초 동안 간 거리다. */
      var lastLabelX = -999, prev = null;
      for (var sec = 0; sec <= Math.floor(S.t + 1e-9); sec++) {
        var dS = s.d(sec), xS = trackX(dS);
        g.fillStyle = s.stage;
        g.beginPath(); g.arc(xS, yc, 4, 0, Math.PI * 2); g.fill();
        if (xS - lastLabelX >= 26) {
          g.fillStyle = COL.faint; g.font = "12px sans-serif"; g.textAlign = "center";
          g.fillText(sec + "초", xS, yc + 36);
          lastLabelX = xS;
        }
        /* 간격 표시 — 자리가 넉넉할 때만 */
        if (prev != null && pitch >= 100 && xS - prev.x >= 56) {
          var by = yc - 40;
          g.strokeStyle = s.stage; g.lineWidth = 1.5;
          g.beginPath(); g.moveTo(prev.x, by); g.lineTo(xS, by);
          g.moveTo(prev.x, by - 4); g.lineTo(prev.x, by + 4);
          g.moveTo(xS, by - 4); g.lineTo(xS, by + 4); g.stroke();
          g.fillStyle = s.stage; g.font = "bold 13px sans-serif"; g.textAlign = "center";
          g.fillText("+" + f1(dS - prev.d) + " m", (prev.x + xS) / 2, by - 7);
        }
        prev = { x: xS, d: dS };
      }

      /* 지금 위치 */
      var cx = trackX(dNow);
      g.fillStyle = COL.now;
      g.beginPath();
      g.moveTo(cx, yc - 27); g.lineTo(cx - 6, yc - 37); g.lineTo(cx + 6, yc - 37); g.closePath(); g.fill();
      car(g, cx, yc, s.stage);
      g.fillStyle = COL.ink; g.font = "bold 13px sans-serif"; g.textAlign = "center";
      var labelX = clamp(cx, MARGIN_L + 24, cssW - 40);
      if (pitch >= 110) g.fillText(f1(dNow) + " m", labelX, yc + 52);
    });

    /* ---- 아래 설명 ---- */
    g.textAlign = "center"; g.font = "bold 14px sans-serif";
    if (k === "run") {
      g.fillStyle = "#86efac";
      g.fillText(S.t >= 2 ? "1초마다 " + f1(S.v) + " m 씩 → 잔상 간격이 일정하다 (등속 운동)"
                          : "▶ 를 눌러 달려 보세요", cssW / 2, cssH - 52);
    } else if (k === "compare") {
      var fa = M.faster(S.vA, S.vB);
      g.fillStyle = "#fde047";
      g.fillText(fa === "same" ? "두 속력이 같아서 나란히 달린다"
                               : (fa === "A" ? "A 가 더 빠르다 — 같은 시간에 더 멀리 간다"
                                             : "B 가 더 빠르다 — 같은 시간에 더 멀리 간다"), cssW / 2, cssH - 52);
    } else {
      g.fillStyle = "#fde047";
      g.fillText("잔상 간격이 변하는 운동은 등속 운동이 아니다", cssW / 2, cssH - 52);
    }
  }

  /* ---------------------------------------------------------
     4. 그래프 두 장 — 시간-이동 거리 · 시간-속력
     --------------------------------------------------------- */
  function drawGraph(id, which) {
    var c = $(id);
    if (!c) return;
    var r = c.getBoundingClientRect();
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = Math.max(200, Math.round(r.width)), h = Math.max(100, Math.round(r.height));
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    }
    var g = c.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = "#fff"; g.fillRect(0, 0, w, h);

    var k = sceneKind();
    var ser = series();
    var pad = { l: 46, r: 16, t: ser.length > 1 ? 30 : 14, b: 34 };
    var ymax = which === "d" ? (k === "kinds" ? 50 : 100) : 10;
    var ystep = which === "d" ? (k === "kinds" ? 10 : 20) : 2;

    function X(t) { return pad.l + (w - pad.l - pad.r) * clamp(t / M.T_MAX, 0, 1); }
    function Y(y) { return (h - pad.b) - (h - pad.b - pad.t) * clamp(y / ymax, 0, 1); }

    /* 격자와 눈금 */
    g.font = "12px sans-serif";
    g.strokeStyle = "#e2e8f0"; g.lineWidth = 1; g.fillStyle = "#64748b";
    g.textAlign = "right";
    for (var y = 0; y <= ymax + 1e-9; y += ystep) {
      g.beginPath(); g.moveTo(pad.l, Y(y)); g.lineTo(w - pad.r, Y(y)); g.stroke();
      g.fillText(String(y), pad.l - 6, Y(y) + 4);
    }
    g.textAlign = "center";
    for (var t = 0; t <= M.T_MAX; t++) {
      g.strokeStyle = "#f1f5f9";
      g.beginPath(); g.moveTo(X(t), pad.t); g.lineTo(X(t), h - pad.b); g.stroke();
      if (t % 2 === 0) { g.fillStyle = "#64748b"; g.fillText(String(t), X(t), h - pad.b + 15); }
    }
    g.strokeStyle = "#94a3b8"; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(pad.l, pad.t); g.lineTo(pad.l, h - pad.b); g.lineTo(w - pad.r, h - pad.b); g.stroke();

    g.fillStyle = "#475569"; g.font = "12px sans-serif"; g.textAlign = "center";
    g.fillText("시간 (s)", pad.l + (w - pad.l - pad.r) / 2, h - 5);
    g.save(); g.translate(12, (pad.t + h - pad.b) / 2); g.rotate(-Math.PI / 2);
    g.fillText(which === "d" ? "이동 거리 (m)" : "속력 (m/s)", 0, 0); g.restore();

    /* 곡선 — 앞으로 갈 부분은 흐리게, 지나온 부분은 진하게 */
    ser.forEach(function (s, si) {
      var fn = which === "d" ? s.d : s.sp;
      var dash = (si === 1 && k === "compare" && which === "v");     // 두 선이 겹칠 때도 보이게
      g.lineJoin = "round";
      g.strokeStyle = s.ink; g.globalAlpha = 0.28; g.lineWidth = 2;
      g.beginPath();
      for (var tt = 0; tt <= M.T_MAX + 1e-9; tt += 0.1) {
        var px = X(tt), py = Y(fn(tt));
        if (tt === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.stroke();
      g.globalAlpha = 1; g.lineWidth = 3.2;
      if (dash) g.setLineDash([7, 5]);
      g.beginPath();
      for (var t2 = 0; t2 <= S.t + 1e-9; t2 += 0.1) {
        var qx = X(Math.min(t2, S.t)), qy = Y(fn(Math.min(t2, S.t)));
        if (t2 === 0) g.moveTo(qx, qy); else g.lineTo(qx, qy);
      }
      g.lineTo(X(S.t), Y(fn(S.t)));
      g.stroke();
      g.setLineDash([]);
    });

    /* 지금 시각의 점 — 트랙의 수레와 같은 값 */
    var lastLabelY = -99;
    ser.forEach(function (s) {
      var fn = which === "d" ? s.d : s.sp;
      var val = fn(S.t), px = X(S.t), py = Y(val);
      g.strokeStyle = s.ink; g.globalAlpha = 0.55; g.lineWidth = 1; g.setLineDash([4, 3]);
      g.beginPath(); g.moveTo(px, py); g.lineTo(pad.l, py);
      g.moveTo(px, py); g.lineTo(px, h - pad.b); g.stroke();
      g.setLineDash([]); g.globalAlpha = 1;
      g.fillStyle = s.ink;
      g.beginPath(); g.arc(px, py, 5.5, 0, Math.PI * 2); g.fill();
      if (Math.abs(py - lastLabelY) > 13) {
        g.font = "bold 12px sans-serif"; g.textAlign = "left";
        g.fillText(f1(val) + (which === "d" ? " m" : " m/s"), Math.min(px + 8, w - pad.r - 46), py < pad.t + 12 ? py + 18 : py - 8);
        lastLabelY = py;
      }
    });

    /* 범례 (두 개 이상일 때) */
    if (ser.length > 1) {
      g.font = "bold 12px sans-serif"; g.textAlign = "left";
      var lx = pad.l + 10;
      ser.forEach(function (s) {
        g.fillStyle = s.ink; g.fillRect(lx, 8, 14, 4);
        g.fillText(s.name, lx + 18, 14);
        lx += 22 + g.measureText(s.name).width + 12;
      });
    }
  }

  function drawGraphs() { drawGraph("graphD", "d"); drawGraph("graphV", "v"); }

  /* ---------------------------------------------------------
     5. 계기판
     --------------------------------------------------------- */
  function ro(i, name, val, unit) {
    $("roName" + i).textContent = name; $("roVal" + i).textContent = val;
    $("roUnit" + i).textContent = unit || "";
  }

  function updatePanel() {
    var k = sceneKind();
    var ser = series();
    var t = S.t;

    if (k === "compare") {
      var a = ser[0], b = ser[1];
      var dA = a.d(t), dB = b.d(t);
      $("gaugeTitle").textContent = "🏁 누가 더 빠를까";
      $("gaugeSub").innerHTML = "그래프가 <b>가파를수록</b> 빠르다";
      ro(1, "시각", fT(t), " s");
      ro(2, "A 이동 거리", f1(dA), " m");
      ro(3, "B 이동 거리", f1(dB), " m");
      var lead = Math.abs(dA - dB) < 1e-9 ? "같다" : (dA > dB ? "A +" + f1(dA - dB) : "B +" + f1(dB - dA));
      ro(4, "앞선 쪽", lead, Math.abs(dA - dB) < 1e-9 ? "" : " m");
      if (t > 0) {
        $("fLaw").innerHTML = '<span class="k">A</span> 기울기 = ' + f1(dA) + ' m ÷ ' + fT(t) + ' s = <span class="t">' + f1(dA / t) + ' m/s</span>';
        $("fWhy").innerHTML = '<span class="r">B</span> 기울기 = ' + f1(dB) + ' m ÷ ' + fT(t) + ' s = <span class="t">' + f1(dB / t) + ' m/s</span>';
      } else {
        $("fLaw").innerHTML = '기울기 = <span class="k">이동 거리</span> ÷ <span class="t">걸린 시간</span> = 속력';
        $("fWhy").innerHTML = '<em>시각을 0 보다 크게 해 보세요</em>';
      }
    } else if (k === "kinds") {
      var u = ser[0], up = ser[1], dn = ser[2];
      $("gaugeTitle").textContent = "🔀 등속이 아닌 운동";
      $("gaugeSub").innerHTML = "도착은 같아도 <b>운동은 다르다</b>";
      ro(1, "시각", fT(t), " s");
      ro(2, "➡️ 등속 거리", f1(u.d(t)), " m");
      ro(3, "🚀 빨라짐 거리", f1(up.d(t)), " m");
      ro(4, "🛑 느려짐 거리", f1(dn.d(t)), " m");
      $("fLaw").innerHTML = '지금 속력 — <span class="k">등속 ' + f1(u.sp(t)) + '</span> · ' +
                            '<span class="r">빨라짐 ' + f1(up.sp(t)) + '</span> · ' +
                            '<span class="t">느려짐 ' + f1(dn.sp(t)) + '</span> m/s';
      $("fWhy").innerHTML = '<em>등속만 속력이 그대로이고, 나머지는 시간에 따라 변한다</em>';
    } else {
      var s0 = ser[0];
      var st = M.state("uniform", S.v, t);
      $("gaugeTitle").textContent = "🚗 달려 보기";
      $("gaugeSub").innerHTML = "시간이 흐르면 <b>얼마나</b> 갔을까";
      ro(1, "시각", fT(t), " s");
      ro(2, "이동 거리", f1(st.d), " m");
      ro(3, "속력", f1(st.v), " m/s");
      ro(4, "거리 ÷ 시간", t > 0 ? f1(st.avg) : "-", t > 0 ? " m/s" : "");
      $("fLaw").innerHTML = '이동 거리 = <span class="k">속력</span> × <span class="t">시간</span> = ' +
                            f1(S.v) + ' × ' + fT(t) + ' = <span class="r">' + f1(st.d) + ' m</span>';
      $("fWhy").innerHTML = '<em>언제 재도 <b>거리 ÷ 시간</b>이 같다 — 속력이 일정하다</em>';
    }

    $("valV").textContent = f1(S.v) + " m/s";
    $("valVA").textContent = f1(S.vA) + " m/s";
    $("valVB").textContent = f1(S.vB) + " m/s";
    $("valT").textContent = fT(t) + " s";
    if (Math.abs(parseFloat($("rngT").value) - t) > 1e-6) $("rngT").value = t;
    $("tip").textContent = tipText();
    syncMissionGoals();
  }

  function tipText() {
    var k = sceneKind();
    if (k === "compare") return "속력을 바꿔 두 선의 가파름을 견주세요";
    if (k === "kinds") return "잔상 간격과 그래프 모양을 함께 보세요";
    return "▶ 를 누르거나 시각을 끌어 보세요";
  }

  /* ---------------------------------------------------------
     6. 조작 패널
     --------------------------------------------------------- */
  function syncControls() {
    var k = sceneKind();
    var allow = (S.scene === "mission" && S.mission) ? S.mission.allow : null;
    document.querySelectorAll("[data-for]").forEach(function (el) {
      var scenes = el.getAttribute("data-for").split(/\s+/);
      var need = el.getAttribute("data-need");
      var okScene = scenes.indexOf(S.scene) >= 0 || scenes.indexOf(k) >= 0;
      /* 미션 밖에서는 장면에 맞는 것만, 미션 안에서는 미션이 허락한 것만 */
      if (S.scene === "mission") okScene = scenes.indexOf(k) >= 0;
      var okNeed = true;
      if (S.scene === "mission" && need) okNeed = !!allow && allow.indexOf(need) >= 0;
      el.classList.toggle("hidden", !(okScene && okNeed));
    });
    $("missionCard").classList.toggle("hidden", S.scene !== "mission");
    $("btnPlay").textContent = S.playing ? "⏸ 멈춤" : "▶ 재생";
  }

  /* ---------------------------------------------------------
     7. 시간 흐르기
     --------------------------------------------------------- */
  function tick(now) {
    if (!S.playing) return;
    var dt = Math.min(0.1, (now - lastFrame) / 1000);
    lastFrame = now;
    S.t = Math.min(M.T_MAX, S.t + dt);
    if (S.t >= M.T_MAX) S.playing = false;
    syncControls(); refresh();
    if (S.playing) raf = requestAnimationFrame(tick);
  }

  function play() {
    if (S.playing) { S.playing = false; syncControls(); return; }
    if (S.t >= M.T_MAX - 1e-9) S.t = 0;
    S.playing = true; lastFrame = performance.now();
    syncControls();
    raf = requestAnimationFrame(tick);
  }

  function stopPlay() { S.playing = false; if (raf) cancelAnimationFrame(raf); }

  /* ---------------------------------------------------------
     8. 미션
     --------------------------------------------------------- */
  function loadProgress() {
    try { return JSON.parse(sessionStorage.getItem("mv_missions") || "[]"); } catch (e) { return []; }
  }
  function saveProgress(l) { try { sessionStorage.setItem("mv_missions", JSON.stringify(l)); } catch (e) {} }

  function renderMissionList() {
    var done = loadProgress(), host = $("missionList");
    host.innerHTML = "";
    MISSIONS.forEach(function (Ms) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "mcard" + (S.mission && S.mission.id === Ms.id ? " on" : "") +
                    (done.indexOf(Ms.id) >= 0 ? " done" : "");
      b.innerHTML = '<span class="mno">미션 ' + Ms.id + (done.indexOf(Ms.id) >= 0 ? " ✅" : "") + '</span>' +
                    '<span class="mtitle"><span class="mstar">' + Ms.star + '</span> ' + Ms.title + '</span>';
      b.addEventListener("click", function () { pickMission(Ms); });
      host.appendChild(b);
    });
    $("missionScore").textContent = done.length + " / " + MISSIONS.length;
  }

  function resetSeen() { seen = { t4: false, v5t4: false, diff5: false, vs: {}, kinds10: false, t5: false }; }

  function pickMission(Ms) {
    stopPlay();
    S.scene = "mission";
    $("scenes").querySelectorAll(".scene-btn").forEach(function (x) {
      x.classList.toggle("on", x.getAttribute("data-scene") === "mission");
    });
    S.mission = Ms; S.predictPick = null;
    S.missionState = Ms.predict ? "predict" : "ready";
    Object.keys(Ms.setup || {}).forEach(function (kk) { S[kk] = Ms.setup[kk]; });
    resetSeen();
    $("rngV").value = S.v; $("rngVA").value = S.vA; $("rngVB").value = S.vB; $("rngT").value = S.t;
    syncControls(); renderMissionList(); renderMissionBody(); refresh();
  }

  function renderMissionBody() {
    var Ms = S.mission, body = $("missionBody");
    if (!Ms) { body.classList.add("hidden"); return; }
    body.classList.remove("hidden");
    $("mTitle").textContent = Ms.star + " 미션 " + Ms.id + " · " + Ms.title;
    $("mStory").innerHTML = Ms.story;

    var pd = $("mPredict");
    if (Ms.predict && S.missionState === "predict") {
      pd.classList.remove("hidden");
      $("mQ").innerHTML = Ms.predict.q;
      var opts = $("mOpts"); opts.innerHTML = "";
      Ms.predict.opts.forEach(function (t, i) {
        var b = document.createElement("button");
        b.type = "button"; b.className = "opt"; b.innerHTML = t;
        b.addEventListener("click", function () {
          S.predictPick = i; S.missionState = "ready"; renderMissionBody();
        });
        opts.appendChild(b);
      });
    } else pd.classList.add("hidden");

    var gl = $("mGoals");
    if (Ms.goals && S.missionState !== "predict") {
      gl.classList.remove("hidden");
      gl.innerHTML = '<div class="q">목표</div>' + Ms.goals.map(function (gg) {
        var ok = checkGoal(gg.key);
        return '<div class="goal' + (ok ? " ok" : "") + '">' + (ok ? "✅ " : "⬜ ") + gg.text + '</div>';
      }).join("");
    } else gl.classList.add("hidden");

    var vd = $("mVerdict");
    if (S.missionState === "won") {
      vd.className = "verdict ok";
      vd.innerHTML = "<b>🎉 성공!</b>" + Ms.why +
        (Ms.predict && S.predictPick != null
          ? "<br><br>" + (S.predictPick === Ms.predict.ans
              ? "예측도 <b>맞았습니다.</b> 잘했어요!"
              : "예측은 달랐지만 <b>직접 확인해서 알아냈습니다.</b> 그것이 더 중요해요.")
          : "");
      vd.classList.remove("hidden");
    } else if (S.missionState === "predict") vd.classList.add("hidden");
    else {
      vd.className = "verdict no";
      vd.innerHTML = "<b>직접 확인하세요</b>목표를 모두 채우면 이유가 열립니다.";
      vd.classList.remove("hidden");
    }
  }

  function checkGoal(key) {
    switch (key) {
      case "t4": return !!seen.t4;
      case "v5t4": return !!seen.v5t4;
      case "diff5": return !!seen.diff5;
      case "vs": return Object.keys(seen.vs).length >= 2;
      case "kinds10": return !!seen.kinds10;
      case "t5": return !!seen.t5;
      default: return false;
    }
  }

  function noteSeen() {
    var k = sceneKind();
    if (k === "run") {
      if (S.t >= 4) seen.t4 = true;
      if (S.t >= 4 && Math.abs(S.v - 5) < 1e-9) seen.v5t4 = true;
      if (S.t >= 1) seen.vs[f1(S.v)] = true;
    }
    if (k === "compare" && S.t >= 5 && Math.abs(S.vA - S.vB) > 1e-9) seen.diff5 = true;
    if (k === "kinds") {
      if (S.t >= M.T_MAX - 0.05) seen.kinds10 = true;
      if (Math.abs(S.t - 5) < 0.15) seen.t5 = true;
    }
  }

  function syncMissionGoals() {
    if (S.scene !== "mission" || !S.mission || S.missionState === "predict") return;
    var Ms = S.mission;
    if (!Ms.goals) return;
    var all = Ms.goals.every(function (gg) { return checkGoal(gg.key); });
    if (all && S.missionState !== "won") {
      S.missionState = "won";
      var done = loadProgress();
      if (done.indexOf(Ms.id) < 0) { done.push(Ms.id); saveProgress(done); }
      renderMissionList(); renderMissionBody();
    } else if (S.missionState !== "won") {
      var gl = $("mGoals");
      if (!gl.classList.contains("hidden")) {
        var rows = gl.querySelectorAll(".goal");
        Ms.goals.forEach(function (gg, i) {
          if (!rows[i]) return;
          var ok = checkGoal(gg.key);
          rows[i].className = "goal" + (ok ? " ok" : "");
          rows[i].innerHTML = (ok ? "✅ " : "⬜ ") + gg.text;
        });
      }
    }
  }

  /* ---------------------------------------------------------
     9. 실험 기록
     --------------------------------------------------------- */
  function addRecord() {
    var k = sceneKind();
    series().forEach(function (s) {
      var label = k === "run" ? "수레 (" + f1(s.v) + " m/s)"
                : (k === "compare" ? s.name + " (" + f1(s.v) + " m/s)" : s.name);
      records.push({
        name: label, t: fT(S.t) + " s",
        d: f1(s.d(S.t)) + " m", v: f1(s.sp(S.t)) + " m/s"
      });
    });
    renderRecords();
    window.PdfKit.toast("기록했습니다. (" + records.length + "번째)", "ok");
  }

  function renderRecords() {
    var body = $("recBody");
    body.innerHTML = "";
    records.forEach(function (r, i) {
      var tr = document.createElement("tr");
      tr.innerHTML = "<td>" + (i + 1) + "</td><td>" + r.name + "</td><td>" + r.t +
                     "</td><td><b>" + r.d + "</b></td><td>" + r.v + "</td>";
      body.appendChild(tr);
    });
    $("recEmpty").classList.toggle("hidden", records.length > 0);
  }

  function refresh() { noteSeen(); draw(); updatePanel(); drawGraphs(); }

  /* ---------------------------------------------------------
     10. 연결
     --------------------------------------------------------- */
  function bind() {
    $("scenes").addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest(".scene-btn") : null;
      if (!b) return;
      stopPlay();
      $("scenes").querySelectorAll(".scene-btn").forEach(function (x) { x.classList.remove("on"); });
      b.classList.add("on");
      S.scene = b.getAttribute("data-scene");
      if (S.scene === "mission" && !S.mission) pickMission(MISSIONS[0]);
      else { syncControls(); refresh(); }
      renderMissionList();
    });

    $("btnPlay").addEventListener("click", play);
    $("btnStep").addEventListener("click", function () {
      stopPlay();
      S.t = Math.min(M.T_MAX, Math.floor(S.t + 1e-9) + 1);
      syncControls(); refresh();
    });
    $("btnReset").addEventListener("click", function () {
      stopPlay();
      S.t = 0; S.v = 3; S.vA = 6; S.vB = 3;
      $("rngV").value = 3; $("rngVA").value = 6; $("rngVB").value = 3; $("rngT").value = 0;
      syncControls(); refresh();
    });
    $("btnRecord").addEventListener("click", addRecord);
    $("btnClearRec").addEventListener("click", function () {
      if (!records.length) return;
      if (!confirm("기록을 모두 지울까요?")) return;
      records.length = 0; renderRecords();
    });

    $("rngT").addEventListener("input", function () { stopPlay(); S.t = parseFloat(this.value); syncControls(); refresh(); });
    $("rngV").addEventListener("input", function () { S.v = parseFloat(this.value); refresh(); });
    $("rngVA").addEventListener("input", function () { S.vA = parseFloat(this.value); refresh(); });
    $("rngVB").addEventListener("input", function () { S.vB = parseFloat(this.value); refresh(); });

    var relayout = function () { layout(); draw(); drawGraphs(); };
    if (window.ResizeObserver) {
      new ResizeObserver(relayout).observe(canvas);
      new ResizeObserver(drawGraphs).observe($("graphD"));
    } else {
      window.addEventListener("resize", relayout);
    }
  }

  function boot() {
    canvas = $("stage");
    layout(); bind(); syncControls();
    renderMissionList(); renderRecords(); refresh();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.MvLab = {
    S: S, MISSIONS: MISSIONS,
    _test: {
      set: function (k, v) { S[k] = v; syncControls(); refresh(); },
      scene: function (n) { stopPlay(); S.scene = n; syncControls(); refresh(); },
      pick: function (id) { pickMission(MISSIONS[id - 1]); },
      answer: function (i) { S.predictPick = i; S.missionState = "ready"; renderMissionBody(); refresh(); },
      goals: function () {
        if (!S.mission || !S.mission.goals) return null;
        return S.mission.goals.map(function (gg) { return [gg.key, checkGoal(gg.key)]; });
      },
      state: function () { return S.missionState; },
      records: function () { return records; },
      series: series,
      geometry: function () { return { cssW: cssW, cssH: cssH, mL: MARGIN_L, ppm: pxPerM() }; },
      draw: function () { draw(); drawGraphs(); return true; }
    }
  };
})();
