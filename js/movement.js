/* =========================================================
   movement.js — 운동(등속 운동 · 속력 · 그래프) 계산 엔진
   ---------------------------------------------------------
   화면을 전혀 모른다. 숫자만 다룬다.

   ■ 이 엔진이 지키는 한 가지
     **시간-이동 거리 그래프의 기울기가 곧 속력이다.**

         등속 운동 :  이동 거리 = 속력 × 시간
                      → 시간-이동 거리 그래프는 원점을 지나는 직선(기울기 = 속력)
                      → 시간-속력 그래프는 시간축에 나란한 수평선

     세 그래프(잔상 간격 · 시간-이동 거리 · 시간-속력)는 모두 **아래 함수 하나**에서 나온다.
     그래서 화면이 서로 어긋날 수 없다.

   ■ 등속이 아닌 운동 두 가지 (이 앱이 정한 값 — 학습지에 없음)
     · 점점 빨라짐 : 가만히 있다가 1 m/s² 로 빨라진다   d = ½·a·t²    v = a·t
     · 점점 느려짐 : 10 m/s 로 출발해 1 m/s² 로 느려진다  d = 10t − ½·a·t²   v = 10 − a·t
     두 운동 모두 **10 초 뒤 50 m** 에 닿는다. 5 m/s 등속 운동도 10 초 뒤 50 m 다.
     "같은 곳에 같은 시간에 도착해도 운동은 다르다"를 보여 주려는 것이다.

   ⚠ 이 앱은 **직선 위의 운동**만 다룬다. 가속도라는 말은 쓰지 않는다(중3 범위 밖).
     '점점 빨라진다 / 점점 느려진다' 라고만 말한다.
   ========================================================= */
(function (global) {
  "use strict";

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function round(v, n) { var p = Math.pow(10, n || 0); return Math.round(v * p) / p; }

  var T_MAX = 10;          // s  — 관찰 시간
  var TRACK_M = 100;       // m  — 트랙 길이
  var V_MAX = 10;          // m/s
  var A = 1;               // m/s² — 빨라지고 느려지는 정도(고정)
  var KIND_V = 5;          // m/s — '등속 운동' 비교 대상의 속력. 10 s 에 50 m.

  /* ---------------------------------------------------------
     1. 운동의 종류
     --------------------------------------------------------- */
  var KINDS = [
    { key: "uniform",  name: "등속 운동",   emoji: "➡️", css: "#38bdf8", ink: "#0284c7" },
    { key: "speedup",  name: "점점 빨라짐", emoji: "🚀", css: "#fb923c", ink: "#ea580c" },
    { key: "slowdown", name: "점점 느려짐", emoji: "🛑", css: "#c4b5fd", ink: "#7c3aed" }
  ];

  function kind(key) {
    for (var i = 0; i < KINDS.length; i++) if (KINDS[i].key === key) return KINDS[i];
    return KINDS[0];
  }

  /* ---------------------------------------------------------
     2. 이동 거리 · 속력 — 모든 그림의 뿌리
        v : 등속 운동일 때의 속력 (다른 운동은 쓰지 않는다)
     --------------------------------------------------------- */
  function dist(k, v, t) {
    t = clamp(t, 0, T_MAX);
    if (k === "speedup")  return 0.5 * A * t * t;
    if (k === "slowdown") return 10 * t - 0.5 * A * t * t;
    return v * t;
  }

  function speed(k, v, t) {
    t = clamp(t, 0, T_MAX);
    if (k === "speedup")  return A * t;
    if (k === "slowdown") return 10 - A * t;
    return v;
  }

  /* 등속 운동 한정 : 이동 거리 = 속력 × 시간 */
  function distUniform(v, t) { return v * t; }

  /* 두 시각 사이의 평균 속력 = 시간-이동 거리 그래프에서 두 점을 이은 선의 기울기 */
  function slope(k, v, t1, t2) {
    if (t2 === t1) return speed(k, v, t1);
    return (dist(k, v, t2) - dist(k, v, t1)) / (t2 - t1);
  }

  /* 1초마다 이동한 거리 — '잔상 간격'.  [d(1)-d(0), d(2)-d(1), …] */
  function gaps(k, v, seconds) {
    var out = [], n = seconds == null ? T_MAX : seconds;
    for (var s = 1; s <= n; s++) out.push(dist(k, v, s) - dist(k, v, s - 1));
    return out;
  }

  /* 등속 운동인가 — 1초 간격이 모두 같은가 (검증용) */
  function isUniform(k, v) {
    var g = gaps(k, v);
    return g.every(function (x) { return Math.abs(x - g[0]) < 1e-9; });
  }

  /* ---------------------------------------------------------
     3. 두 물체 견주기 — 그래프가 더 가파른 쪽이 더 빠르다
     --------------------------------------------------------- */
  function faster(vA, vB) {
    if (Math.abs(vA - vB) < 1e-9) return "same";
    return vA > vB ? "A" : "B";
  }

  /* 한 시각의 스냅샷 — 화면과 학습지가 같이 쓴다 */
  function state(k, v, t) {
    var d = dist(k, v, t);
    return {
      k: k, t: t, d: d, v: speed(k, v, t),
      avg: t > 0 ? d / t : speed(k, v, 0)
    };
  }

  global.Movement = {
    T_MAX: T_MAX, TRACK_M: TRACK_M, V_MAX: V_MAX, A: A, KIND_V: KIND_V, KINDS: KINDS,
    clamp: clamp, round: round,
    kind: kind, dist: dist, speed: speed, distUniform: distUniform,
    slope: slope, gaps: gaps, isUniform: isUniform, faster: faster, state: state
  };
})(window);
