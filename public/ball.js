/* Interactive, photoreal-ish 3D tennis ball for the hero. Uses Three.js if
   available and WebGL works; otherwise the CSS fallback ball stays visible.
   Realism comes from: a fine multi-tone felt color map, a fibrous bump map,
   a translucent "fuzz" halo shell that frizzes the silhouette, and a slightly
   recessed white seam. */
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
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(4, 5, 6);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xeaf2ff, 0.45);
    fill.position.set(-4, 1, 4);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xe9ff7a, 0.55);
    rim.position.set(-5, -3, -5);
    scene.add(rim);

    function makeCanvas(w, h) {
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      return { c, x: c.getContext("2d") };
    }

    // ---- felt COLOR map: optic-yellow base + dense fine fibre speckle ----
    function feltColorTexture() {
      const { c, x } = makeCanvas(1024, 512);
      const g = x.createLinearGradient(0, 0, 0, 512);
      g.addColorStop(0, "#eaff63");
      g.addColorStop(0.5, "#d9ef3e");
      g.addColorStop(1, "#c3dc2c");
      x.fillStyle = g; x.fillRect(0, 0, 1024, 512);
      // fine fibres: short strokes in mixed tones for a matte felt look
      for (let i = 0; i < 60000; i++) {
        const px = Math.random() * 1024, py = Math.random() * 512;
        const r = Math.random();
        if (r < 0.4) x.strokeStyle = "rgba(255,255,255,0.10)";
        else if (r < 0.7) x.strokeStyle = "rgba(150,170,40,0.16)";
        else x.strokeStyle = "rgba(95,110,20,0.14)";
        x.lineWidth = 0.8;
        const ang = Math.random() * Math.PI;
        const len = 1.5 + Math.random() * 2.5;
        x.beginPath();
        x.moveTo(px, py);
        x.lineTo(px + Math.cos(ang) * len, py + Math.sin(ang) * len);
        x.stroke();
      }
      const t = new THREE.CanvasTexture(c);
      t.anisotropy = 8;
      return t;
    }

    // ---- felt BUMP map: grayscale fibrous noise so light catches the nap ----
    function feltBumpTexture() {
      const { c, x } = makeCanvas(512, 256);
      x.fillStyle = "#808080"; x.fillRect(0, 0, 512, 256);
      for (let i = 0; i < 45000; i++) {
        const px = Math.random() * 512, py = Math.random() * 256;
        const v = Math.random() > 0.5 ? 255 : 0;
        x.fillStyle = `rgba(${v},${v},${v},0.20)`;
        x.fillRect(px, py, 1, 1.6);
      }
      const t = new THREE.CanvasTexture(c);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(3, 2);
      return t;
    }

    // ---- fuzz ALPHA map: scattered fine hairs, mostly transparent ----
    function fuzzAlphaTexture() {
      const { c, x } = makeCanvas(1024, 512);
      x.fillStyle = "#000"; x.fillRect(0, 0, 1024, 512); // transparent base
      for (let i = 0; i < 26000; i++) {
        const px = Math.random() * 1024, py = Math.random() * 512;
        const a = 0.25 + Math.random() * 0.5;
        x.strokeStyle = `rgba(255,255,255,${a})`;
        x.lineWidth = 0.7 + Math.random() * 0.6;
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
    const R0 = 1.55;

    // core felt sphere
    const geo = new THREE.SphereGeometry(R0, 128, 128);
    const mat = new THREE.MeshStandardMaterial({
      map: feltColorTexture(),
      bumpMap: feltBumpTexture(),
      bumpScale: 0.035,
      roughness: 1.0,
      metalness: 0.0,
    });
    ball.add(new THREE.Mesh(geo, mat));

    // fuzz halo: a slightly larger shell that frizzes the silhouette
    const fuzzGeo = new THREE.SphereGeometry(R0 * 1.045, 96, 96);
    const fuzzMat = new THREE.MeshStandardMaterial({
      color: 0xe9ff63,
      alphaMap: fuzzAlphaTexture(),
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      roughness: 1.0,
      side: THREE.DoubleSide,
    });
    ball.add(new THREE.Mesh(fuzzGeo, fuzzMat));

    // ---- seam: white curve weaving around the sphere, slightly recessed ----
    const R = R0 * 1.012;
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
    // faint darker groove under the seam for depth
    const grooveGeo = new THREE.TubeGeometry(seamCurve, 440, 0.10, 16, true);
    const grooveMat = new THREE.MeshStandardMaterial({ color: 0xb6c637, roughness: 1.0 });
    ball.add(new THREE.Mesh(grooveGeo, grooveMat));
    const seamGeo = new THREE.TubeGeometry(seamCurve, 440, 0.062, 16, true);
    const seamMat = new THREE.MeshStandardMaterial({ color: 0xf7f7ef, roughness: 0.7 });
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
