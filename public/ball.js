/* Hero animation: a 3D tennis court that slowly spins, with a ball rallying
   (bouncing) across it. Uses Three.js when WebGL is available; otherwise the
   CSS fallback stays visible. Drag to spin the court yourself. */
(function () {
  "use strict";

  function init() {
    const stage = document.getElementById("ballStage");
    if (!stage || typeof THREE === "undefined") return; // CSS fallback remains

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) {
      return; // no WebGL, keep fallback
    }

    const size = () => Math.min(stage.clientWidth || 420, 480);
    let S = size();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(S, S);
    renderer.domElement.classList.add("ball-canvas");
    stage.appendChild(renderer.domElement);
    const fallback = document.getElementById("ballFallback");
    if (fallback) fallback.style.display = "none";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 4.4, 6.6);
    camera.lookAt(0, -0.2, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(3, 7, 4);
    scene.add(sun);

    function makeCanvas(w, h) {
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      return { c, x: c.getContext("2d") };
    }

    const L = 1024, W = 512;     // texture pixels
    const CL = 7, CW = 3.5;       // court size in scene units (length x width)

    // ---- court surface texture: green with white line markings ----
    function courtTexture() {
      const { c, x } = makeCanvas(L, W);
      x.fillStyle = "#3f9e63"; x.fillRect(0, 0, L, W);
      for (let i = 0; i < 16; i++) { // subtle mow stripes
        x.fillStyle = i % 2 ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.04)";
        x.fillRect(i * (L / 16), 0, L / 16, W);
      }
      x.strokeStyle = "#f5f8f3"; x.lineWidth = 6;
      const mx = 70, my = 64;
      const innerW = W - 2 * my, alley = innerW * 0.125;
      x.strokeRect(mx, my, L - 2 * mx, innerW); // doubles boundary
      x.beginPath(); // singles sidelines
      x.moveTo(mx, my + alley); x.lineTo(L - mx, my + alley);
      x.moveTo(mx, W - my - alley); x.lineTo(L - mx, W - my - alley);
      x.stroke();
      x.lineWidth = 8; // net line
      x.beginPath(); x.moveTo(L / 2, my); x.lineTo(L / 2, W - my); x.stroke();
      x.lineWidth = 6;
      const sl = (L / 2 - mx) * (21 / 39); // service lines
      const sL = L / 2 - sl, sR = L / 2 + sl;
      x.beginPath();
      x.moveTo(sL, my + alley); x.lineTo(sL, W - my - alley);
      x.moveTo(sR, my + alley); x.lineTo(sR, W - my - alley);
      x.moveTo(sL, W / 2); x.lineTo(sR, W / 2);        // center service line
      x.moveTo(mx, W / 2); x.lineTo(mx + 18, W / 2);   // center marks
      x.moveTo(L - mx, W / 2); x.lineTo(L - mx - 18, W / 2);
      x.stroke();
      const t = new THREE.CanvasTexture(c); t.anisotropy = 8; return t;
    }

    // ---- net texture: white tape + mesh, transparent between strands ----
    function netTexture() {
      const { c, x } = makeCanvas(512, 128);
      x.clearRect(0, 0, 512, 128);
      x.strokeStyle = "rgba(255,255,255,0.55)"; x.lineWidth = 1;
      for (let i = 0; i <= 512; i += 9) { x.beginPath(); x.moveTo(i, 20); x.lineTo(i, 128); x.stroke(); }
      for (let j = 20; j <= 128; j += 9) { x.beginPath(); x.moveTo(0, j); x.lineTo(512, j); x.stroke(); }
      x.fillStyle = "#f5f8f3"; x.fillRect(0, 0, 512, 18); // top tape
      return new THREE.CanvasTexture(c);
    }

    const court = new THREE.Group();

    const surf = new THREE.Mesh(
      new THREE.PlaneGeometry(CL, CW),
      new THREE.MeshStandardMaterial({ map: courtTexture(), roughness: 0.95, metalness: 0 })
    );
    surf.rotation.x = -Math.PI / 2;
    court.add(surf);

    // court base slab (gives it thickness/edge)
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(CL + 0.3, 0.18, CW + 0.3),
      new THREE.MeshStandardMaterial({ color: 0x2c6f47, roughness: 1 })
    );
    slab.position.y = -0.1;
    court.add(slab);

    // net
    const net = new THREE.Mesh(
      new THREE.PlaneGeometry(CW, 0.55),
      new THREE.MeshBasicMaterial({ map: netTexture(), transparent: true, side: THREE.DoubleSide, depthWrite: false })
    );
    net.rotation.y = Math.PI / 2;
    net.position.y = 0.275;
    court.add(net);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x1c2530, roughness: 0.6 });
    [-CW / 2, CW / 2].forEach((z) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.62, 16), postMat);
      post.position.set(0, 0.31, z);
      court.add(post);
    });

    // ball + its drop shadow
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 32, 32),
      new THREE.MeshStandardMaterial({ color: 0xe6f64a, roughness: 0.85 })
    );
    court.add(ball);
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.16, 24),
      new THREE.MeshBasicMaterial({ color: 0x123018, transparent: true, opacity: 0.28 })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.011;
    court.add(shadow);

    court.rotation.set(0, 0.5, 0);
    scene.add(court);

    // ---- interaction: drag to spin, gentle auto-spin otherwise ----
    let dragging = false, lastX = 0, lastY = 0, vY = 0.0035, vX = 0;
    const dom = renderer.domElement;
    const pt = (e) => e.touches ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };
    const down = (e) => { dragging = true; const p = pt(e); lastX = p.x; lastY = p.y; };
    const move = (e) => {
      if (!dragging) return;
      const p = pt(e);
      const dx = p.x - lastX, dy = p.y - lastY;
      court.rotation.y += dx * 0.01;
      court.rotation.x = Math.max(-0.2, Math.min(1.1, court.rotation.x + dy * 0.006));
      vY = dx * 0.0009;
      lastX = p.x; lastY = p.y;
      if (e.cancelable) e.preventDefault();
    };
    const up = () => { dragging = false; };
    dom.addEventListener("mousedown", down);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    dom.addEventListener("touchstart", down, { passive: true });
    dom.addEventListener("touchmove", move, { passive: false });
    dom.addEventListener("touchend", up);
    dom.style.cursor = "grab";
    dom.addEventListener("mousedown", () => (dom.style.cursor = "grabbing"));
    window.addEventListener("mouseup", () => (dom.style.cursor = "grab"));

    let T = 0;
    function animate() {
      requestAnimationFrame(animate);
      T += 0.016;
      if (!dragging) {
        court.rotation.y += vY + 0.0032;
        vY += (0.0035 - vY) * 0.02;
      }
      // ball rallies across the court with realistic bounces
      const x = Math.sin(T * 0.62) * 2.9;
      const z = Math.cos(T * 0.62) * 0.85;
      const h = Math.abs(Math.sin(T * 1.85)) * 1.25;
      ball.position.set(x, 0.14 + h, z);
      ball.rotation.x += 0.08; ball.rotation.z += 0.05;
      shadow.position.set(x, 0.011, z);
      const sc = 1 - h * 0.4;
      shadow.scale.set(sc, sc, sc);
      shadow.material.opacity = 0.30 * sc;
      renderer.render(scene, camera);
    }
    requestAnimationFrame(animate);

    function resize() {
      S = size();
      renderer.setSize(S, S);
      camera.aspect = 1;
      camera.updateProjectionMatrix();
    }
    window.addEventListener("resize", resize);
    resize();
  }

  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", () => setTimeout(init, 0));
  } else {
    setTimeout(init, 0);
  }
})();
