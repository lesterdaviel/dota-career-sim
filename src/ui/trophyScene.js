/* ============================================================
   LEGACY — NO EDITAR. Congelado el 31 ago 2026.
   ------------------------------------------------------------
   Lo que se publica es dist/index.html. Este archivo ya no forma
   parte del producto ni de los tests: le faltan, entre otras
   cosas, el mercado de agentes libres, las estadísticas de héroes
   y 19 equipos del catálogo. Ver ARCHITECTURE.md.
   ============================================================ */
/* ============================================================
   UI / TROPHY SCENE — sala 3D (Three.js bajo demanda)
   ------------------------------------------------------------
   No carga Three.js hasta mount(). Geometrías y materiales se
   reutilizan. Sin modelos GLTF ni texto en el canvas.
   ============================================================ */
(function (DCS) {
  'use strict';

  var THREE_VER = '0.147.0';
  var CDN = 'https://cdn.jsdelivr.net/npm/three@' + THREE_VER;
  var loadPromise = null;
  var session = null;

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var found = document.querySelector('script[data-dcs-src="' + src + '"]');
      if (found) {
        if (found.getAttribute('data-dcs-ready') === '1') return resolve();
        found.addEventListener('load', resolve);
        found.addEventListener('error', function () { reject(new Error('script ' + src)); });
        return;
      }
      var s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.setAttribute('data-dcs-src', src);
      s.onload = function () { s.setAttribute('data-dcs-ready', '1'); resolve(); };
      s.onerror = function () { reject(new Error('script ' + src)); };
      document.head.appendChild(s);
    });
  }

  function loadThree() {
    if (window.THREE && window.THREE.WebGLRenderer) {
      if (window.THREE.OrbitControls) return Promise.resolve(window.THREE);
      return loadScript(CDN + '/examples/js/controls/OrbitControls.js').then(function () { return window.THREE; });
    }
    if (!loadPromise) {
      loadPromise = loadScript(CDN + '/build/three.min.js')
        .then(function () { return loadScript(CDN + '/examples/js/controls/OrbitControls.js'); })
        .then(function () {
          if (!window.THREE) throw new Error('THREE missing');
          return window.THREE;
        });
    }
    return loadPromise;
  }

  function reducedMotion() {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }

  function isMobile() {
    return window.matchMedia('(max-width: 768px)').matches || ('ontouchstart' in window && window.innerWidth < 1025);
  }

  function cache(THREE) {
    var geo = {
      box: new THREE.BoxGeometry(1, 1, 1),
      cyl: new THREE.CylinderGeometry(1, 1, 1, 16),
      hex: new THREE.CylinderGeometry(1, 1, 1, 6),
      cone: new THREE.ConeGeometry(1, 1, 12),
      sph: new THREE.SphereGeometry(1, 14, 10),
      torus: new THREE.TorusGeometry(1, 0.22, 8, 16)
    };
    function std(color, metal, rough) {
      return new THREE.MeshPhongMaterial({
        color: color,
        specular: metal > 0.5 ? 0xbfc6ce : 0x555555,
        shininess: metal > 0.5 ? 42 : 16
      });
    }
    var mat = {
      gold: std(0xe8b84a, 0.72, 0.32),
      goldDeep: std(0xb47a18, 0.68, 0.38),
      steel: std(0x9aadc2, 0.55, 0.42),
      silver: std(0xd5dde6, 0.62, 0.36),
      bronze: std(0xb07a48, 0.58, 0.46),
      ember: std(0xe35a2e, 0.45, 0.4),
      teal: std(0x3ec9b0, 0.4, 0.42),
      blue: std(0x4d8fd9, 0.42, 0.44),
      violet: std(0x8b7ad9, 0.4, 0.44),
      stone: new THREE.MeshBasicMaterial({ color: 0x4a5d72 }),
      plinth: new THREE.MeshBasicMaterial({ color: 0x5d738a }),
      plaque: new THREE.MeshBasicMaterial({ color: 0x1c2430 }),
      floor: new THREE.MeshBasicMaterial({ color: 0x1a2430 }),
      wall: new THREE.MeshBasicMaterial({ color: 0x151c26 }),
      trim: new THREE.MeshBasicMaterial({ color: 0xc9a24a }),
      ghost: new THREE.MeshBasicMaterial({ color: 0x8a9aab, transparent: true, opacity: 0.4 }),
      carpet: new THREE.MeshBasicMaterial({ color: 0x243044 })
    };
    return { geo: geo, mat: mat };
  }

  function mesh(geo, mat, sx, sy, sz, y) {
    var m = new THREE.Mesh(geo, mat);
    m.scale.set(sx, sy, sz);
    if (y != null) m.position.y = y;
    m.castShadow = false;
    m.receiveShadow = false;
    return m;
  }

  /* Siluetas originales por categoría: misma base, distinta pieza. */
  function makePiece(THREE, pack, category, prestige) {
    var g = new THREE.Group();
    var geo = pack.geo, mat = pack.mat;
    var p = prestige == null ? 5 : prestige;

    function stem(h, r, m) {
      g.add(mesh(geo.cyl, m || mat.steel, r, h, r, h / 2));
    }

    switch (category) {
      case 'ti':
        stem(0.42, 0.09, mat.goldDeep);
        g.add(mesh(geo.hex, mat.gold, 0.22, 0.95, 0.22, 0.88));
        var ring = mesh(geo.torus, mat.goldDeep, 0.28, 0.28, 0.28, 1.05);
        ring.rotation.x = Math.PI / 2;
        g.add(ring);
        g.add(mesh(geo.sph, mat.gold, 0.09, 0.09, 0.09, 1.48));
        g.scale.setScalar(1.18);
        break;
      case 'pgl':
        stem(0.34, 0.08, mat.steel);
        var shield = mesh(geo.box, mat.teal, 0.42, 0.62, 0.08, 0.72);
        g.add(shield);
        g.add(mesh(geo.cone, mat.steel, 0.16, 0.18, 0.16, 1.12));
        break;
      case 'esl':
        stem(0.36, 0.07, mat.silver);
        g.add(mesh(geo.cyl, mat.silver, 0.2, 0.12, 0.2, 0.46));
        g.add(mesh(geo.cone, mat.silver, 0.22, 0.38, 0.22, 0.7));
        var h1 = mesh(geo.torus, mat.steel, 0.16, 0.16, 0.16, 0.62);
        var h2 = h1.clone();
        h1.rotation.y = Math.PI / 2;
        h2.rotation.y = Math.PI / 2;
        h1.position.x = 0.2;
        h2.position.x = -0.2;
        g.add(h1); g.add(h2);
        break;
      case 'dreamleague':
        stem(0.3, 0.07, mat.violet);
        g.add(mesh(geo.cyl, mat.goldDeep, 0.26, 0.07, 0.26, 0.38));
        g.add(mesh(geo.cyl, mat.violet, 0.2, 0.07, 0.2, 0.48));
        g.add(mesh(geo.cyl, mat.gold, 0.14, 0.07, 0.14, 0.58));
        g.add(mesh(geo.cone, mat.gold, 0.08, 0.46, 0.08, 0.86));
        break;
      case 'blast':
        stem(0.4, 0.07, mat.ember);
        var a = mesh(geo.box, mat.ember, 0.12, 0.7, 0.08, 0.82);
        var b = a.clone();
        a.rotation.z = 0.38;
        b.rotation.z = -0.38;
        a.position.x = 0.12;
        b.position.x = -0.12;
        g.add(a); g.add(b);
        g.add(mesh(geo.box, mat.steel, 0.28, 0.08, 0.08, 1.14));
        break;
      case 'elite':
        stem(0.38, 0.08, mat.goldDeep);
        g.add(mesh(geo.cone, mat.gold, 0.24, 0.42, 0.24, 0.68));
        var er = mesh(geo.torus, mat.gold, 0.2, 0.2, 0.2, 0.78);
        er.rotation.x = Math.PI / 2;
        g.add(er);
        break;
      case 'international':
        stem(0.36, 0.07, mat.blue);
        g.add(mesh(geo.cone, mat.blue, 0.2, 0.32, 0.2, 0.58));
        var inv = mesh(geo.cone, mat.steel, 0.2, 0.32, 0.2, 0.9);
        inv.rotation.x = Math.PI;
        g.add(inv);
        break;
      case 'league':
        stem(0.3, 0.06, mat.steel);
        g.add(mesh(geo.cyl, mat.steel, 0.16, 0.28, 0.16, 0.48));
        g.add(mesh(geo.cyl, mat.silver, 0.2, 0.06, 0.2, 0.64));
        break;
      default: {
        var cup = p >= 6 ? mat.silver : mat.bronze;
        stem(0.32, 0.06, cup);
        g.add(mesh(geo.cone, cup, 0.18, 0.32, 0.18, 0.52));
        g.add(mesh(geo.cyl, cup, 0.2, 0.05, 0.2, 0.7));
        break;
      }
    }
    return g;
  }

  function makeStand(THREE, pack, empty) {
    var g = new THREE.Group();
    var base = mesh(pack.geo.cyl, pack.mat.stone, 0.42, 0.12, 0.42, 0.06);
    var body = mesh(pack.geo.cyl, pack.mat.plinth, 0.28, 0.62, 0.28, 0.43);
    var top = mesh(pack.geo.cyl, pack.mat.trim, 0.34, 0.06, 0.34, 0.76);
    var plaque = mesh(pack.geo.box, pack.mat.plaque, 0.28, 0.1, 0.04, 0.4);
    plaque.position.z = 0.3;
    g.add(base); g.add(body); g.add(top); g.add(plaque);
    if (empty) {
      var ghost = mesh(pack.geo.cone, pack.mat.ghost, 0.12, 0.28, 0.12, 1.02);
      ghost.userData.ghost = true;
      g.add(ghost);
    }
    return g;
  }

  function layout(list) {
    var ti = [];
    var rest = [];
    (list || []).forEach(function (t) {
      if (t.category === 'ti') ti.push(t);
      else rest.push(t);
    });
    var spots = {};
    if (ti.length) {
      ti.forEach(function (t, i) {
        var ox = (i - (ti.length - 1) / 2) * 1.15;
        spots[t.id] = { x: ox, z: -1.15, featured: true };
      });
    }
    rest.forEach(function (t, i) {
      var n = rest.length;
      var span = Math.min(6.6, Math.max(1.4, (n - 1) * 1.45));
      var x = n === 1 ? (ti.length ? 0 : 0) : (-span / 2 + (i / Math.max(1, n - 1)) * span);
      var z = 1.85;
      if (n > 5) {
        var row = i < Math.ceil(n / 2) ? 0 : 1;
        var col = row === 0 ? i : i - Math.ceil(n / 2);
        var count = row === 0 ? Math.ceil(n / 2) : n - Math.ceil(n / 2);
        var sp = Math.min(6.6, Math.max(1.4, (count - 1) * 1.4));
        x = count === 1 ? 0 : -sp / 2 + (col / Math.max(1, count - 1)) * sp;
        z = row === 0 ? 1.55 : 2.85;
      }
      spots[t.id] = { x: x, z: z, featured: false };
    });
    return { spots: spots, ti: ti, rest: rest };
  }

  function emptySpots(hasTi) {
    var pts = [];
    if (!hasTi) pts.push({ x: 0, z: -1.15, featured: true });
    pts.push({ x: -2.2, z: 1.85 }, { x: 2.2, z: 1.85 }, { x: 0, z: 2.6 });
    return pts;
  }

  function buildRoom(THREE, pack) {
    var g = new THREE.Group();
    var floor = mesh(pack.geo.box, pack.mat.floor, 16.2, 0.08, 12.2, -0.04);
    floor.receiveShadow = true;
    g.add(floor);
    var carpet = mesh(pack.geo.box, pack.mat.carpet, 8.4, 0.02, 6.4, 0.01);
    g.add(carpet);
    var ceil = mesh(pack.geo.box, pack.mat.wall, 16.2, 0.08, 12.2, 4.15);
    g.add(ceil);
    function wall(sx, sy, sz, x, y, z) {
      var w = mesh(pack.geo.box, pack.mat.wall, sx, sy, sz, y);
      w.position.x = x; w.position.z = z;
      g.add(w);
    }
    wall(16.2, 4.2, 0.12, 0, 2.1, -6.05);
    wall(16.2, 4.2, 0.12, 0, 2.1, 6.05);
    wall(0.12, 4.2, 12.2, -8.05, 2.1, 0);
    wall(0.12, 4.2, 12.2, 8.05, 2.1, 0);
    var trim = mesh(pack.geo.box, pack.mat.trim, 6.4, 0.04, 0.08, 0.02);
    trim.position.z = -5.9;
    g.add(trim);
    return g;
  }

  function lights(THREE, scene, featured) {
    var amb = new THREE.AmbientLight(0xc5d0dc, 0.62);
    scene.add(amb);
    var hemi = new THREE.HemisphereLight(0x9aafc4, 0x241810, 0.4);
    scene.add(hemi);
    var spot = new THREE.SpotLight(0xf4ead4, 0.85, 20, 0.7, 0.4, 1);
    spot.position.set(0, 3.6, 3.2);
    spot.target.position.set(0, 0.7, 0);
    scene.add(spot); scene.add(spot.target);
    var fill = new THREE.DirectionalLight(0x7e90a8, 0.35);
    fill.position.set(-3.5, 3.4, 4.2);
    scene.add(fill);
    var feature = null;
    if (featured) {
      feature = new THREE.PointLight(0xffc247, 0.35, 5, 2);
      feature.position.set(0, 2.4, -1.1);
      scene.add(feature);
    }
    if (!isMobile() && featured) {
      spot.castShadow = true;
      spot.shadow.mapSize.set(512, 512);
      spot.shadow.camera.near = 0.5;
      spot.shadow.camera.far = 14;
    }
    return { amb: amb, hemi: hemi, spot: spot, fill: fill, feature: feature };
  }

  function defaultCam() {
    return { x: 0, y: 2.05, z: 4.85, tx: 0, ty: 0.95, tz: -0.2 };
  }

  function createSession(THREE, host, list, opts) {
    opts = opts || {};
    var pack = cache(THREE);
    var renderer = new THREE.WebGLRenderer({ antialias: !isMobile(), alpha: false, powerPreference: 'low-power', preserveDrawingBuffer: true });
    renderer.setClearColor(0x0c121a, 1);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = !isMobile();
    renderer.shadowMap.type = THREE.BasicShadowMap;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.tabIndex = -1;
    host.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0c121a, 12, 22);
    var camera = new THREE.PerspectiveCamera(46, 1, 0.1, 40);
    var d = defaultCam();
    camera.position.set(d.x, d.y, d.z);
    var target = new THREE.Vector3(d.tx, d.ty, d.tz);
    camera.lookAt(target);

    var controls = null;
    if (THREE.OrbitControls) {
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = !reducedMotion();
      controls.dampingFactor = 0.08;
      controls.minDistance = 3.2;
      controls.maxDistance = 10.5;
      controls.minPolarAngle = 0.28;
      controls.maxPolarAngle = Math.PI * 0.48;
      controls.enablePan = false;
      controls.target.copy(target);
      controls.rotateSpeed = 0.55;
      controls.touchRotateSpeed = 0.45;
    }

    scene.add(buildRoom(THREE, pack));
    var lay = layout(list);
    var lightSet = lights(THREE, scene, lay.ti.length > 0);
    var stands = [];
    var pieces = {};
    var trophiesRoot = new THREE.Group();
    scene.add(trophiesRoot);

    function placeStand(x, z, empty) {
      var st = makeStand(THREE, pack, empty);
      st.position.set(x, 0, z);
      trophiesRoot.add(st);
      stands.push({ x: x, z: z });
      return st;
    }

    (list || []).forEach(function (t) {
      var sp = lay.spots[t.id] || { x: 0, z: 1.8 };
      placeStand(sp.x, sp.z, false);
      var piece = makePiece(THREE, pack, t.category, t.prestige);
      piece.position.set(sp.x, 0.82, sp.z);
      piece.userData.trophyId = t.id;
      piece.traverse(function (ch) {
        if (ch.isMesh) {
          ch.userData.trophyId = t.id;
          ch.castShadow = !isMobile();
        }
      });
      trophiesRoot.add(piece);
      pieces[t.id] = piece;
    });

    var empties = emptySpots(lay.ti.length > 0);
    if (!(list && list.length)) {
      empties.forEach(function (p) { placeStand(p.x, p.z, true); });
    } else if (list.length < 4) {
      empties.forEach(function (p) {
        var taken = stands.some(function (s) { return Math.abs(s.x - p.x) < 0.4 && Math.abs(s.z - p.z) < 0.4; });
        if (!taken) placeStand(p.x, p.z, true);
      });
    }

    var marker = mesh(pack.geo.torus, pack.mat.gold, 0.4, 0.4, 0.4, 0.8);
    marker.rotation.x = Math.PI / 2;
    marker.visible = false;
    trophiesRoot.add(marker);

    var ray = new THREE.Raycaster();
    var ptr = new THREE.Vector2();
    var selected = null;
    var raf = 0;
    var running = false;
    var celebrate = { ids: [], t0: 0, done: true };
    var drag = { x: 0, y: 0, moved: false };

    function dpr() {
      var r = window.devicePixelRatio || 1;
      return Math.min(r, isMobile() ? 1.2 : 1.5);
    }

    function resize() {
      var w = host.clientWidth || 1;
      var h = host.clientHeight || 1;
      renderer.setPixelRatio(dpr());
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }

    function clampCam() {
      var p = camera.position;
      if (p.x < -7.15) p.x = -7.15;
      if (p.x > 7.15) p.x = 7.15;
      if (p.z < -5.15) p.z = -5.15;
      if (p.z > 5.15) p.z = 5.15;
      if (p.y < 0.62) p.y = 0.62;
      if (p.y > 3.55) p.y = 3.55;
      stands.forEach(function (s) {
        var dx = p.x - s.x, dz = p.z - s.z;
        var dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < 1.12) {
          var k = 1.12 / (dist || 0.001);
          p.x = s.x + dx * k;
          p.z = s.z + dz * k;
        }
      });
      if (controls) {
        var tg = controls.target;
        if (tg.y < 0.4) tg.y = 0.4;
        if (tg.y > 2.2) tg.y = 2.2;
        if (tg.x < -3) tg.x = -3;
        if (tg.x > 3) tg.x = 3;
        if (tg.z < -3) tg.z = -3;
        if (tg.z > 3) tg.z = 3;
        if (p.distanceTo(tg) < 2.15) {
          var dir = p.clone().sub(tg).normalize();
          p.copy(tg).addScaledVector(dir, 2.15);
        }
      }
    }

    function pick(ev) {
      var rect = renderer.domElement.getBoundingClientRect();
      ptr.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      ptr.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      ray.setFromCamera(ptr, camera);
      var hits = ray.intersectObjects(trophiesRoot.children, true);
      for (var i = 0; i < hits.length; i++) {
        var id = hits[i].object.userData.trophyId;
        if (id) return id;
      }
      return null;
    }

    function setSelected(id) {
      selected = id;
      var piece = id ? pieces[id] : null;
      if (!piece) {
        marker.visible = false;
        return;
      }
      marker.visible = true;
      marker.position.set(piece.position.x, 0.8, piece.position.z);
    }

    function onDown(ev) {
      drag.x = ev.clientX; drag.y = ev.clientY; drag.moved = false;
    }
    function onMove(ev) {
      if (Math.abs(ev.clientX - drag.x) + Math.abs(ev.clientY - drag.y) > 8) drag.moved = true;
    }
    function onUp(ev) {
      if (drag.moved) return;
      var id = pick(ev);
      if (id && opts.onSelect) opts.onSelect(id);
    }

    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointermove', onMove);
    renderer.domElement.addEventListener('pointerup', onUp);

    function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

    function tick(now) {
      if (!running) return;
      raf = requestAnimationFrame(tick);
      if (document.hidden) return;
      if (controls) controls.update();
      clampCam();
      if (!celebrate.done && celebrate.ids.length) {
        var u = Math.min(1, (now - celebrate.t0) / 720);
        var e = easeOut(u);
        celebrate.ids.forEach(function (id) {
          var piece = pieces[id];
          if (!piece) return;
          var s = 0.12 + 0.88 * e;
          piece.scale.setScalar(s);
          piece.position.y = 0.82 + (1 - e) * 0.18;
        });
        if (u >= 1) {
          celebrate.done = true;
          if (opts.onCelebrateEnd) opts.onCelebrateEnd();
        }
      }
      renderer.render(scene, camera);
    }

    function start() {
      if (running) return;
      running = true;
      resize();
      clampCam();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    }
    function stop() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    var vis = function () {
      if (document.hidden) stop();
      else if (session === api) start();
    };
    document.addEventListener('visibilitychange', vis);
    var ro = new ResizeObserver(resize);
    ro.observe(host);

    var api = {
      THREE: THREE,
      host: host,
      renderer: renderer,
      scene: scene,
      camera: camera,
      controls: controls,
      pack: pack,
      pieces: pieces,
      resize: resize,
      start: start,
      stop: stop,
      setSelected: setSelected,
      resetCamera: function () {
        var d0 = defaultCam();
        camera.position.set(d0.x, d0.y, d0.z);
        if (controls) {
          controls.target.set(d0.tx, d0.ty, d0.tz);
          controls.update();
        }
      },
      celebrate: function (ids) {
        if (!ids || !ids.length || reducedMotion()) {
          celebrate.done = true;
          if (opts.onCelebrateEnd) opts.onCelebrateEnd();
          return;
        }
        celebrate.ids = ids.slice();
        celebrate.t0 = performance.now();
        celebrate.done = false;
        ids.forEach(function (id) {
          var piece = pieces[id];
          if (piece) { piece.scale.setScalar(0.12); piece.position.y = 1.0; }
        });
      },
      skipCelebrate: function () {
        celebrate.done = true;
        celebrate.ids.forEach(function (id) {
          var piece = pieces[id];
          if (piece) { piece.scale.setScalar(1); piece.position.y = 0.82; }
        });
        if (opts.onCelebrateEnd) opts.onCelebrateEnd();
      },
      dispose: function () {
        stop();
        document.removeEventListener('visibilitychange', vis);
        if (ro) ro.disconnect();
        renderer.domElement.removeEventListener('pointerdown', onDown);
        renderer.domElement.removeEventListener('pointermove', onMove);
        renderer.domElement.removeEventListener('pointerup', onUp);
        if (controls) controls.dispose();
        scene.traverse(function (obj) {
          if (obj.isLight && obj.dispose) obj.dispose();
        });
        Object.keys(pack.geo).forEach(function (k) { pack.geo[k].dispose(); });
        Object.keys(pack.mat).forEach(function (k) { pack.mat[k].dispose(); });
        renderer.dispose();
        if (renderer.domElement && renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
        try {
          var gl = renderer.getContext();
          var lose = gl && gl.getExtension && gl.getExtension('WEBGL_lose_context');
          if (lose) lose.loseContext();
        } catch (e) { }
        if (lightSet.spot.shadow && lightSet.spot.shadow.map) lightSet.spot.shadow.map.dispose();
      }
    };
    return api;
  }

  DCS.ui = DCS.ui || {};
  DCS.ui.trophyScene = {
    loadThree: loadThree,
    mount: function (host, list, opts) {
      return loadThree().then(function (THREE) {
        if (session) {
          session.dispose();
          session = null;
        }
        session = createSession(THREE, host, list, opts);
        session.start();
        return session;
      });
    },
    current: function () { return session; },
    dispose: function () {
      if (session) {
        session.dispose();
        session = null;
      }
    }
  };
})(window.DCS = window.DCS || {});
