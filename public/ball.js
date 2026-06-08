/* Interactive 3D tennis ball for the hero. Uses Three.js if available and
   WebGL works; otherwise the CSS fallback ball stays visible. */
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
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0, 6.2);

    // ---- lights ----
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 1.15);
    key.position.set(4, 5, 6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xd8f04a, 0.5);
    rim.position.set(-5, -2, -4);
    scene.add(rim);

    // ---- felt texture (optic yellow with subtle speckle) ----
    function feltTexture() {
      const c = document.createElement("canvas");
      c.width = 1024; c.height = 512;
      const x = c.getContext("2d");
      const g = x.createLinearGradient(0, 0, 0, 512);
      g.addColorStop(0, "#e7fb55");
      g.addColorStop(0.5, "#d4ee3f");
      g.addColorStop(1, "#c2dd2f");
      x.fillStyle = g; x.fillRect(0, 0, 1024, 512);
      // felt speckle
      for (let i = 0; i < 24000; i++) {
        const px = Math.random() * 1024, py = Math.random() * 512;
        const light = Math.random() > 0.5;
        x.fillStyle = light ? "rgba(255,255,255,0.06)" : "rgba(120,140,20,0.10)";
        x.fillRect(px, py, 1.4, 1.4);
      }
      const t = new THREE.CanvasTexture(c);
      t.anisotropy = 4;
      return t;
    }

    const ball = new THREE.Group();
    const geo = new THREE.SphereGeometry(1.55, 96, 96);
    const mat = new THREE.MeshStandardMaterial({
      map: feltTexture(), roughness: 0.92, metalness: 0.0,
    });
    ball.add(new THREE.Mesh(geo, mat));

    // ---- seam: a curve that weaves around the sphere, drawn as a white tube ----
    const R = 1.565;
    const seamPts = [];
    const SEG = 400;
    for (let i = 0; i <= SEG; i++) {
      const t = (i / SEG) * Math.PI * 2;
      // inclination wobbles above/below the equator twice -> classic seam look
      const incl = Math.PI / 2 + 0.62 * Math.sin(2 * t);
      const az = t + 0.30 * Math.sin(2 * t);
      seamPts.push(new THREE.Vector3(
        R * Math.sin(incl) * Math.cos(az),
        R * Math.cos(incl),
        R * Math.sin(incl) * Math.sin(az)
      ));
    }
    const seamCurve = new THREE.CatmullRomCurve3(seamPts, true);
    const seamGeo = new THREE.TubeGeometry(seamCurve, 420, 0.07, 14, true);
    const seamMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.65 });
    ball.add(new THREE.Mesh(seamGeo, seamMat));

    ball.rotation.set(0.5, 0.2, 0.15);
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

    let t0 = 0;
    function animate(t) {
      requestAnimationFrame(animate);
      if (!dragging) {
        ball.rotation.y += vx + 0.003;
        ball.rotation.x += vy;
        vx += (0.004 - vx) * 0.02; // ease back to steady spin
        vy += (0.0016 - vy) * 0.02;
      }
      // gentle bob
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
