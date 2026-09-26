import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  TRACK_WIDTH,
  ELLIPSE_B,
  centerDistance,
  nearestCenterlineIndex,
} from "@/game/track";
import { buildEnvironment } from "@/game/environment";
import SpeedometerGauge from "@/components/racing/SpeedometerGauge";
import Minimap from "@/components/racing/Minimap";
import RaceStats, { formatRaceTime } from "@/components/racing/RaceStats";

const TOTAL_LAPS = 3;
const KMH_PER_UNIT = 176;
const MAX_SPEED = 0.65; // ≈ 114 km/h top speed

export default function RacingGame() {
  const mountRef = useRef(null);
  const [ui, setUi] = useState({ phase: "menu", speed: 0, lap: 1, time: 0 });
  const [carPos, setCarPos] = useState({ x: 0, z: ELLIPSE_B });
  const gameRef = useRef({
    phase: "menu",
    time: 0,
    countdown: 0,
    lap: 1,
    reset: () => {},
  });

  const startRace = () => {
    const g = gameRef.current;
    g.phase = "ready";
    g.countdown = 0;
    g.time = 0;
    g.lap = 1;
    setUi({ phase: "ready", speed: 0, lap: 1, time: 0 });
  };

  const handleRaceAgain = () => {
    gameRef.current.reset();
    setCarPos({ x: 0, z: ELLIPSE_B });
    startRace();
  };

  useEffect(() => {
    const g = gameRef.current;
    const mount = mountRef.current;
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 140, 420);

    const camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 1000);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);

    // Lights
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444466, 0.45));
    const sun = new THREE.DirectionalLight(0xffffff, 0.55);
    sun.position.set(60, 90, 40);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -150;
    sun.shadow.camera.right = 150;
    sun.shadow.camera.top = 150;
    sun.shadow.camera.bottom = -150;
    scene.add(sun);

    // Track, river, castle, buildings, decorations
    buildEnvironment(scene);

    // Car (front points toward -z in local space)
    const car = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xd62828 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.7, 4.4), bodyMat);
    body.position.y = 0.6;
    body.castShadow = true;
    car.add(body);

    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.6, 2),
      new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    cabin.position.set(0, 1.15, 0.2);
    cabin.castShadow = true;
    car.add(cabin);

    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.15, 0.5), bodyMat);
    spoiler.position.set(0, 1.2, 1.9);
    car.add(spoiler);

    const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const wheels = [];
    [
      [-1.05, 0.4, -1.4],
      [1.05, 0.4, -1.4],
      [-1.05, 0.4, 1.4],
      [1.05, 0.4, 1.4],
    ].forEach((p) => {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(...p);
      w.castShadow = true;
      car.add(w);
      wheels.push(w);
    });

    const lightMat = new THREE.MeshStandardMaterial({
      color: 0xffffcc,
      emissive: 0xffffaa,
    });
    [-0.6, 0.6].forEach((x) => {
      const hl = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), lightMat);
      hl.position.set(x, 0.6, -2.2);
      car.add(hl);
    });

    // Start on the bottom straight, facing +x along the track
    car.position.set(0, 0, ELLIPSE_B);
    car.rotation.y = -Math.PI / 2;
    scene.add(car);

    // Controls
    const keys = {};
    const onKeyDown = (e) => {
      keys[e.key.toLowerCase()] = true;
      if (
        ["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(
          e.key.toLowerCase()
        )
      )
        e.preventDefault();
    };
    const onKeyUp = (e) => (keys[e.key.toLowerCase()] = false);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", onResize);

    // Game state
    let velocity = 0;
    let heading = -Math.PI / 2; // facing +x
    let steerSmooth = 0;
    let progress = 0; // accumulated lap progress (index units)
    let prevIdx = nearestCenterlineIndex(0, ELLIPSE_B);
    let last = performance.now();

    g.reset = () => {
      velocity = 0;
      heading = -Math.PI / 2;
      steerSmooth = 0;
      progress = 0;
      prevIdx = nearestCenterlineIndex(0, ELLIPSE_B);
      g.time = 0;
      g.countdown = 0;
      g.lap = 1;
      car.position.set(0, 0, ELLIPSE_B);
      car.rotation.y = heading;
      camera.position.set(-12, 6, ELLIPSE_B);
      camera.lookAt(8, 2, ELLIPSE_B);
    };

    let raf;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      // Countdown driven by the game loop itself — can never get stuck
      if (g.phase === "ready" || g.phase === "go") {
        g.countdown += dt * 1000;
        if (g.phase === "ready" && g.countdown >= 1300) {
          g.phase = "go";
        } else if (g.phase === "go" && g.countdown >= 2200) {
          g.phase = "racing";
          g.time = 0;
        }
        setUi((u) => ({ ...u, phase: g.phase }));
      }

      const racing = g.phase === "racing" || g.phase === "go";

      if (racing) {
        g.time += dt * 1000;
        const onTrack =
          centerDistance(car.position.x, car.position.z) < TRACK_WIDTH / 2 + 1;

        // Accelerate / brake / coast
        if (keys["arrowup"] || keys["w"]) velocity += 0.3 * dt;
        else if (keys["arrowdown"] || keys["s"]) velocity -= 0.55 * dt;
        else velocity *= Math.max(0, 1 - (onTrack ? 0.5 : 1.8) * dt);

        const cap = onTrack ? MAX_SPEED : MAX_SPEED * 0.35;
        velocity = Math.max(-0.22, Math.min(cap, velocity));

        // Smooth steering that scales with speed
        const steerInput =
          (keys["arrowleft"] || keys["a"] ? 1 : 0) -
          (keys["arrowright"] || keys["d"] ? 1 : 0);
        steerSmooth += (steerInput - steerSmooth) * Math.min(1, 15 * dt);
        const speedFactor = 0.4 + 0.6 * Math.min(1, Math.abs(velocity) / 0.25);
        heading +=
          steerSmooth *
          2.0 *
          dt *
          speedFactor *
          Math.sign(velocity || 1);
        // Cornering scrubs a little speed
        velocity *= 1 - Math.abs(steerSmooth) * 0.3 * dt;

        const fx = -Math.sin(heading);
        const fz = -Math.cos(heading);
        car.position.x += fx * velocity * dt * 60;
        car.position.z += fz * velocity * dt * 60;
        car.rotation.y = heading;
        wheels.forEach((w) => (w.rotation.x += velocity * dt * 36));

        // Camera follows behind the car
        const k = Math.min(1, 5 * dt);
        camera.position.x += (car.position.x - fx * 12 - camera.position.x) * k;
        camera.position.y += (6 - camera.position.y) * k;
        camera.position.z += (car.position.z - fz * 12 - camera.position.z) * k;
        camera.lookAt(car.position.x + fx * 8, 2, car.position.z + fz * 8);

        // Lap progress (driving direction decreases the centerline index)
        const idx = nearestCenterlineIndex(car.position.x, car.position.z);
        let d = idx - prevIdx;
        if (d > 128) d -= 256;
        else if (d < -128) d += 256;
        progress -= d;
        prevIdx = idx;
        const newLap = 1 + Math.floor(progress / 256);
        if (newLap > TOTAL_LAPS) {
          g.phase = "finished";
        } else if (newLap !== g.lap) {
          g.lap = Math.max(1, newLap);
        }

        setUi({
          phase: g.phase,
          speed: Math.round(Math.abs(velocity) * KMH_PER_UNIT),
          lap: Math.min(Math.max(1, g.lap), TOTAL_LAPS),
          time: g.time,
        });
        setCarPos({ x: car.position.x, z: car.position.z });
      }

      renderer.render(scene, camera);
    };
    camera.position.set(-12, 6, ELLIPSE_B);
    camera.lookAt(8, 2, ELLIPSE_B);
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("resize", onResize);
      mount.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-sky-400">
      <div ref={mountRef} className="w-full h-full" />

      {/* HUD */}
      {ui.phase !== "menu" && (
        <>
          <RaceStats time={ui.time} lap={ui.lap} totalLaps={TOTAL_LAPS} />
          <div className="absolute bottom-4 left-4">
            <Minimap x={carPos.x} z={carPos.z} />
          </div>
          <div className="absolute bottom-4 right-4">
            <SpeedometerGauge speed={ui.speed} />
          </div>
        </>
      )}

      {/* Countdown */}
      {(ui.phase === "ready" || ui.phase === "go") && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className={`text-8xl font-extrabold drop-shadow-[0_4px_4px_rgba(0,0,0,0.9)] ${
              ui.phase === "ready" ? "text-amber-400" : "text-green-400"
            }`}
          >
            {ui.phase === "ready" ? "Ready!" : "Go!"}
          </div>
        </div>
      )}

      {/* Start menu */}
      {ui.phase === "menu" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md mx-4 text-center shadow-2xl">
            <h1 className="text-3xl font-extrabold mb-2 text-slate-900">
              🏁 3D Racing
            </h1>
            <p className="text-slate-500 mb-6">
              Use <span className="font-semibold">↑/↓</span> or{" "}
              <span className="font-semibold">W/S</span> to drive,{" "}
              <span className="font-semibold">←/→</span> or{" "}
              <span className="font-semibold">A/D</span> to steer. Race 3 laps
              around the river circuit — the grass slows you down!
            </p>
            <button
              onClick={startRace}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors text-lg"
            >
              Start Race
            </button>
          </div>
        </div>
      )}

      {/* Finish */}
      {ui.phase === "finished" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md mx-4 text-center shadow-2xl">
            <h1 className="text-4xl font-extrabold mb-2 text-slate-900">
              🏁 Finished!
            </h1>
            <p className="text-slate-500 mb-1">Total time</p>
            <div className="text-3xl font-bold text-slate-900 mb-6 tabular-nums">
              {formatRaceTime(ui.time)}
            </div>
            <button
              onClick={handleRaceAgain}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors text-lg"
            >
              Race Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}