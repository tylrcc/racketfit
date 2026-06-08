/* Interactive 3D tennis ball for the hero. Uses Three.js when WebGL is
   available, otherwise the CSS fallback ball stays visible.
   Realism: smooth optic-yellow felt color map, a subtle fibrous bump map for
   the nap, a crisp curved white seam, and a soft "fuzz" halo rendered on the
   BACK side of a slightly larger sphere so it frizzes the silhouette only,
   never clouding the face of the ball. */
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

    const size = () => Math.min(stage.clientWidth || 420, 460);
    let S = size();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(S, S);
    renderer.domElement.classList.add("ball-canvas");
    stage.appendChild(renderer.domElement);
    const fallback = document.getElementById("ballFallback");
    if (fallback) fallback.style.display = "none";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 0, 6.0);

    // ---- lights: bright key + soft fill + warm bounce ----
    scene.add(new THREE.AmbientLight(0xffffff, 0.62));
    const key = new THREE.DirectionalLight(0xffffff, 1.05);
    key.position.set(3.5, 5, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xeef4ff, 0.4);
    fill.position.set(-4, 0.5, 3);
    scene.add(fill);

    function makeCanvas(w, h) {
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      return { c, x: c.getContext("2d") };
    }

    // ---- felt COLOR map: smooth optic yellow + gentle fine speckle ----
    function feltColorTexture() {
      const { c, x } = makeCanvas(1024, 512);
      const g = x.createLinearGradient(0, 0, 0, 512);
      g.addColorStop(0, "#e7fb5e");
      g.addColorStop(0.5, "#d8ef42");
      g.addColorStop(1, "#cbe636");
      x.fillStyle = g; x.fillRect(0, 0, 1024, 512);
      // subtle fibre speckle (low contrast so it reads as felt, not noise)
      for (let i = 0; i < 16000; i++) {
        const px = Math.random() * 1024, py = Math.random() * 512;
        const r = Math.random();
        x.fillStyle = r < 0.6 ? "rgba(255,255,255,0.05)" : "rgba(120,140,30,0.07)";
        x.fillRect(px, py, 1.3, 1.3);
      }
      const t = new THREE.CanvasTexture(c);
      t.anisotropy = 8;
      return t;
    }

    // ---- felt BUMP map: fine grayscale nap so light catches the fuzz ----
    function feltBumpTexture() {
      const { c, x } = makeCanvas(512, 256);
      x.fillStyle = "#808080"; x.fillRect(0, 0, 512, 256);
      for (let i = 0; i < 30000; i++) {
        const px = Math.random() * 512, py = Math.random() * 256;
        const v = Math.random() > 0.5 ? 235 : 30;
        x.fillStyle = `rgba(${v},${v},${v},0.18)`;
        x.fillRect(px, py, 1, 1.4);
      }
      const t = new THREE.CanvasTexture(c);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(4, 2);
      return t;
    }

    // ---- fuzz ALPHA map: scattered fine hairs (mostly transparent) ----
    function fuzzAlphaTexture() {
      const { c, x } = makeCanvas(1024, 512);
      x.fillStyle = "#000"; x.fillRect(0, 0, 1024, 512);
      for (let i = 0; i < 22000; i++) {
        const px = Math.random() * 1024, py = Math.random() * 512;
        x.strokeStyle = `rgba(255,255,255,${0.4 + Math.random() * 0.5})`;
        x.lineWidth = 0.8;
        const ang = Math.random() * Math.PI * 2;
        const len = 2 + Math.random() * 4;
        x.beginPath();
        x.moveTo(px, py);
        x.lineTo(px + Math.cos(ang) * len, py + Math.sin(ang) * len);
        x.stroke();
      }
      return new THREE.CanvasTexture(c);
    }

    const ball = new THREE.Group();
    const R0 = 1.6;

    // core felt sphere
    const geo = new THREE.SphereGeometry(R0, 128, 128);
    const mat = new THREE.MeshStandardMaterial({
      map: feltColorTexture(),
      bumpMap: feltBumpTexture(),
      bumpScale: 0.022,
      roughness: 0.95,
      metalness: 0.0,
    });
    ball.add(new THREE.Mesh(geo, mat));

    // fuzz halo: BACK side of a slightly larger sphere -> only the silhouette
    // ring shows, giving a soft furry edge without covering the face.
    const fuzzGeo = new THREE.SphereGeometry(R0 * 1.055, 96, 96);
    const fuzzMat = new THREE.MeshBasicMaterial({
      color: 0xe9ff6a,
      alphaMap: fuzzAlphaTexture(),
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      side: THREE.BackSide,
    });
    ball.add(new THREE.Mesh(fuzzGeo, fuzzMat));

    // ---- seam: crisp white curve weaving around the sphere ----
    const R = R0 * 1.005;
    const seamPts = [];
    const SEG = 400;
    for (let i = 0; i <= SEG; i++) {
      const u = (i / SEG) * Math.PI * 2;
      const incl = Math.PI / 2 + 0.62 * Math.sin(2 * u);
      const az = u + 0.30 * Math.sin(2 * u);
      seamPts.push(new THREE.Vector3(
        R * Math.sin(incl) * Math.cos(az),
        R * Math.cos(incl),
        R * Math.sin(incl) * Math.sin(az)
      ));
    }
    const seamCurve = new THREE.CatmullRomCurve3(seamPts, true);
    // faint recessed groove under the seam for depth
    const grooveGeo = new THREE.TubeGeometry(seamCurve, 440, 0.085, 16, true);
    const grooveMat = new THREE.MeshStandardMaterial({ color: 0xaebf35, roughness: 1.0 });
    ball.add(new THREE.Mesh(grooveGeo, grooveMat));
    const seamGeo = new THREE.TubeGeometry(seamCurve, 440, 0.05, 16, true);
    const seamMat = new THREE.MeshStandardMaterial({ color: 0xf8f8f0, roughness: 0.6 });
    ball.add(new THREE.Mesh(seamGeo, seamMat));

    ball.rotation.set(0.5, 0.2, 0.12);
    scene.add(ball);

    // ---- interaction: drag to spin, auto-spin otherwise ----
    let dragging = false, lastX = 0, lastY = 0, vx = 0.004, vy = 0.0016;
    const dom = renderer.domElement;
    const down = (e) => { dragging = true; const p = pt(e); lastX = p.x; lastY = p.y; };
    const move = (e) => {
      if (!dragging) return;
      const p = pt(e);
      const dx = (p.x - lastX), dy = (p.y - lastY);
      ball.rotation.y += dx * 0.01;
      ball.rotation.x += dy * 0.01;
      vx = dx * 0.0008; vy = dy * 0.0008;
      lastX = p.x; lastY = p.y;
      if (e.cancelable) e.preventDefault();
    };
    const up = () => { dragging = false; };
    const pt = (e) => e.touches ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };
    dom.addEventListener("mousedown", down);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    dom.addEventListener("touchstart", down, { passive: true });
    dom.addEventListener("touchmove", move, { passive: false });
    dom.addEventListener("touchend", up);
    dom.style.cursor = "grab";
    dom.addEventListener("mousedown", () => (dom.style.cursor = "grabbing"));
    window.addEventListener("mouseup", () => (dom.style.cursor = "grab"));

    function animate(t) {
      requestAnimationFrame(animate);
      if (!dragging) {
        ball.rotation.y += vx + 0.003;
        ball.rotation.x += vy;
        vx += (0.004 - vx) * 0.02;
        vy += (0.0016 - vy) * 0.02;
      }
      ball.position.y = Math.sin((t || 0) / 900) * 0.06;
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
