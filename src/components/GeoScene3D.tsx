import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Html, Lightformer, Line, Sparkles } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";

// "Géo-Vision" — 3D geological cut-away block with a looping drilling sequence,
// core box, CPT curve, water table and seismic pulses. Fully procedural.
const W = 10, D = 5, TOTAL = 6;
const LAYERS = [
  { name: "Remblai / terre végétale", h: 0.5, day: "#8a6e4b", night: "#2a3a5c" },
  { name: "Sable", h: 0.9, day: "#d9c7a3", night: "#33486e" },
  { name: "Argile", h: 1.1, day: "#b98b5e", night: "#2b3d63" },
  { name: "Graves", h: 0.9, day: "#a08e76", night: "#24365a" },
  { name: "Calcaire / marne", h: 1.2, day: "#c4baa0", night: "#1e2f52" },
  { name: "Substratum rocheux", h: 1.4, day: "#6b7280", night: "#152443" },
];
const QC = [2, 3, 4, 6, 5, 7, 9, 11, 10, 13, 14, 16, 18, 17, 21, 24, 26, 25, 28, 31];
const wave = (x: number, z: number, k: number) => Math.sin(x * 0.6 + k * 1.7) * 0.12 + Math.sin(z * 0.9 + x * 0.3 + k) * 0.06 - x * 0.025 * k;

function layerBounds() {
  let top = TOTAL / 2; const out: { top: number; bot: number; k: number }[] = [];
  LAYERS.forEach((l, k) => { out.push({ top, bot: top - l.h, k }); top -= l.h; });
  return out;
}

function Stratum({ i, top, bot, dark }: { i: number; top: number; bot: number; dark: boolean }) {
  const geo = useMemo(() => {
    const g = new THREE.BoxGeometry(W, 1, D, 40, 1, 16);
    const p = g.attributes.position;
    for (let v = 0; v < p.count; v++) {
      const x = p.getX(v), z = p.getZ(v), isTop = p.getY(v) > 0;
      const y = isTop ? top + (i === 0 ? wave(x, z, 0) * 0.4 : wave(x, z, i)) : bot + wave(x, z, i + 1);
      p.setY(v, y);
    }
    g.computeVertexNormals();
    return g;
  }, [i, top, bot]);
  const tex = useMemo(() => {
    const c = document.createElement("canvas"); c.width = c.height = 128; const x = c.getContext("2d")!;
    x.fillStyle = "#fff"; x.fillRect(0, 0, 128, 128);
    for (let n = 0; n < 900; n++) { const g = 200 + Math.random() * 55; x.fillStyle = `rgb(${g},${g},${g})`; x.fillRect(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 2, 1 + Math.random() * 2); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 1); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, []);
  const l = LAYERS[i];
  const contour = useMemo(() => Array.from({ length: 41 }, (_, k) => { const x = -W / 2 + (k / 40) * W; return new THREE.Vector3(x, bot + wave(x, D / 2, i + 1), D / 2 + 0.01); }), [bot, i]);
  return (
    <group>
      <mesh geometry={geo} castShadow receiveShadow>
        <meshStandardMaterial map={tex} color={dark ? l.night : l.day} roughness={0.92} metalness={0.02} />
      </mesh>
      <Line points={contour} color={dark ? "#2F7BDB" : "#1F5FAD"} lineWidth={1.4} transparent opacity={dark ? 0.9 : 0.6} />
    </group>
  );
}

function Rig({ bounds, dark, reduce }: { bounds: ReturnType<typeof layerBounds>; dark: boolean; reduce: boolean }) {
  const pipe = useRef<THREE.Mesh>(null), tip = useRef<THREE.Mesh>(null), head = useRef<THREE.Group>(null);
  const cores = useRef<THREE.Group>(null), pulse = useRef<THREE.Mesh>(null), cpt = useRef<{ geometry: THREE.BufferGeometry }>(null);
  const label = useRef<HTMLDivElement>(null);
  const X = -1.8, top = TOTAL / 2;
  const coreCols = useMemo(() => Array.from({ length: 12 }, (_, c) => { const d = top - ((c + 0.5) / 12) * TOTAL; const L = bounds.find((b) => d <= b.top && d >= b.bot) ?? bounds[5]; return dark ? new THREE.Color(LAYERS[L.k].day).multiplyScalar(0.85) : new THREE.Color(LAYERS[L.k].day); }), [bounds, dark, top]);
  const cptPts = useMemo(() => QC.map((q, i) => new THREE.Vector3(W / 2 + 0.6 + q * 0.05, top - (i / (QC.length - 1)) * TOTAL * 0.95, D / 2)), [top]);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const cyc = reduce ? 0.6 : (t % 24) / 24;
    const depth = Math.min(1, cyc / 0.8) * TOTAL * 0.95;
    if (pipe.current) { pipe.current.scale.y = Math.max(0.01, depth + 1.2); pipe.current.position.y = top + 1.2 - (depth + 1.2) / 2; }
    if (tip.current) { tip.current.position.y = top - depth; tip.current.rotation.y = t * 8; }
    if (head.current) head.current.position.y = top + 1.6 + Math.sin(t * 12) * 0.03;
    const n = Math.floor((depth / TOTAL) * 12.6);
    cores.current?.children.forEach((c, i) => (c.visible = i < n));
    const L = bounds.find((b) => top - depth <= b.top && top - depth >= b.bot);
    if (label.current && L) label.current.textContent = `▶ ${LAYERS[L.k].name} · ${(depth * 5).toFixed(1).replace(".", ",")} m`;
    const shown = Math.max(2, Math.floor((depth / (TOTAL * 0.95)) * QC.length));
    cpt.current?.geometry.setDrawRange(0, shown * 1);
    if (pulse.current) { const p = (t % 6) / 6; pulse.current.scale.setScalar(0.2 + p * 7); (pulse.current.material as THREE.MeshBasicMaterial).opacity = (1 - p) * 0.55; }
  });
  const steel = dark ? "#cfd8e6" : "#0B1F3A";
  return (
    <group>
      {/* derrick */}
      <group position={[X, top, 0.6]}>
        {[[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]].map(([x, z], i) => (
          <mesh key={i} position={[x * 0.6, 1.3, z * 0.6]} rotation={[z * 0.25, 0, -x * 0.25]} castShadow><cylinderGeometry args={[0.03, 0.04, 2.6]} /><meshStandardMaterial color={steel} metalness={0.6} roughness={0.35} /></mesh>
        ))}
        <mesh position={[0, 0.08, 0]} castShadow><boxGeometry args={[1.4, 0.16, 1.1]} /><meshStandardMaterial color={steel} metalness={0.4} roughness={0.5} /></mesh>
        <mesh position={[0, 2.6, 0]}><boxGeometry args={[0.5, 0.08, 0.5]} /><meshStandardMaterial color={steel} /></mesh>
        <group ref={head} position={[0, 1.6, 0]}><mesh castShadow><boxGeometry args={[0.36, 0.26, 0.36]} /><meshStandardMaterial color="#F6B921" emissive="#F6B921" emissiveIntensity={0.25} /></mesh></group>
      </group>
      <mesh ref={pipe} position={[X, top, 0.6]}><cylinderGeometry args={[0.05, 0.05, 1]} /><meshStandardMaterial color={steel} metalness={0.8} roughness={0.25} /></mesh>
      <mesh ref={tip} position={[X, top, 0.6]}><coneGeometry args={[0.12, 0.3, 6]} /><meshStandardMaterial color="#F6B921" emissive="#F6B921" emissiveIntensity={0.8} /></mesh>
      <Html position={[X + 0.4, top - 2.5, D / 2]} className="pointer-events-none select-none"><div ref={label} className="whitespace-nowrap text-[11px] font-semibold" style={{ color: "#F6B921", textShadow: "0 1px 4px #0008" }} /></Html>
      {/* core box */}
      <group position={[1.2, top + 0.15, -1.2]}>
        <mesh position={[1.1, -0.06, 0.3]}><boxGeometry args={[2.6, 0.08, 1]} /><meshStandardMaterial color={dark ? "#3a2f22" : "#7a5a3a"} /></mesh>
        <group ref={cores}>{coreCols.map((c, i) => <mesh key={i} position={[(i % 6) * 0.42, 0.08, Math.floor(i / 6) * 0.45 + 0.1]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.12, 0.12, 0.38, 16]} /><meshStandardMaterial color={c} roughness={0.8} /></mesh>)}</group>
      </group>
      {/* CPT curve + ruler */}
      <Line ref={cpt as never} points={cptPts} color="#F6B921" lineWidth={2.5} />
      <Html position={[W / 2 + 0.6, top + 0.35, D / 2]} className="pointer-events-none select-none"><div className="whitespace-nowrap text-[10px] font-semibold" style={{ color: dark ? "#dbe6f7" : "#0B1F3A" }}>CPT · qc (MPa) — qc 14 MPa · N SPT 32</div></Html>
      {[0, 5, 10, 15, 20, 25, 30].map((m) => <Html key={m} position={[-W / 2 - 0.25, top - (m / 30) * TOTAL, D / 2]} className="pointer-events-none select-none"><div className="text-[10px] tabular-nums" style={{ color: dark ? "#b8c6dd" : "#0B1F3A" }}>{m} m</div></Html>)}
      {/* geophones + seismic ripple on front face */}
      {Array.from({ length: 6 }, (_, g) => <mesh key={g} position={[1.5 + g * 0.5, top + 0.05, D / 2 - 0.2]}><boxGeometry args={[0.08, 0.1, 0.08]} /><meshStandardMaterial color="#2F7BDB" emissive="#2F7BDB" emissiveIntensity={1.2} /></mesh>)}
      <mesh ref={pulse} position={[2.7, top, D / 2 + 0.02]}><ringGeometry args={[0.48, 0.5, 64, 1, Math.PI, Math.PI]} /><meshBasicMaterial color="#2F7BDB" transparent toneMapped={false} side={THREE.DoubleSide} /></mesh>
    </group>
  );
}

function WaterTable({ y }: { y: number }) {
  const m = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => { if (m.current) m.current.opacity = 0.28 + Math.sin(clock.getElapsedTime() * 1.6) * 0.08; });
  return <mesh position={[0, y, 0]} rotation-x={-Math.PI / 2}><planeGeometry args={[W + 0.02, D + 0.02]} /><meshStandardMaterial ref={m} color="#2F7BDB" emissive="#2F7BDB" emissiveIntensity={0.4} transparent opacity={0.3} depthWrite={false} /></mesh>;
}

function Fault() {
  const pts = useMemo(() => [new THREE.Vector3(3.2, TOTAL / 2, D / 2 + 0.02), new THREE.Vector3(2.4, -TOTAL / 2, D / 2 + 0.02)], []);
  return <Line points={pts} color="#F6B921" lineWidth={1} dashed dashSize={0.15} gapSize={0.1} transparent opacity={0.6} />;
}

function CameraRig({ reduce }: { reduce: boolean }) {
  const { camera, pointer } = useThree();
  const t0 = useRef<number | null>(null);
  useFrame(({ clock }, dt) => {
    const t = clock.getElapsedTime(); if (t0.current === null) t0.current = t;
    const intro = Math.min(1, (t - t0.current) / 3); const e = 1 - Math.pow(1 - intro, 3);
    const orbit = reduce ? 0 : Math.sin(t * 0.08) * 0.18;
    const ang = 0.55 + orbit + pointer.x * 0.1, r = 17 - e * 4;
    const target = new THREE.Vector3(Math.sin(ang) * r, 3.2 + pointer.y * 0.8, Math.cos(ang) * r);
    camera.position.lerp(target, 1 - Math.exp(-3 * Math.min(dt, 0.05)));
    camera.lookAt(0.6, 0.3, 0);
  });
  return null;
}

export default function GeoScene3D({ dark, reduce }: { dark: boolean; reduce: boolean }) {
  const bounds = useMemo(layerBounds, []);
  const bg = dark ? "#07142a" : "#efe2c6";
  return (
    <Canvas shadows dpr={[1, 1.75]} camera={{ position: [10, 4, 14], fov: 38 }} gl={{ antialias: true }} frameloop={reduce ? "demand" : "always"}>
      <color attach="background" args={[bg]} />
      <fog attach="fog" args={[bg, 16, 34]} />
      <ambientLight intensity={dark ? 0.35 : 0.6} />
      <directionalLight position={[6, 12, 8]} intensity={dark ? 1.1 : 2.2} color={dark ? "#9fc1ff" : "#fff1d6"} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <pointLight position={[-1.8, 4.6, 1]} intensity={dark ? 6 : 2} color="#F6B921" distance={6} />
      <Environment resolution={64}>
        <Lightformer intensity={2} position={[0, 6, 0]} scale={[12, 12, 1]} rotation-x={Math.PI / 2} />
        <Lightformer intensity={1} color={dark ? "#2F7BDB" : "#ffe9c4"} position={[-6, 1, -2]} rotation-y={Math.PI / 2} scale={[20, 2, 1]} />
      </Environment>
      <group rotation-y={-0.2}>
        {bounds.map((b) => <Stratum key={b.k} i={b.k} top={b.top} bot={b.bot} dark={dark} />)}
        <WaterTable y={bounds[1].bot + 0.1} />
        <Fault />
        <Rig bounds={bounds} dark={dark} reduce={reduce} />
        <mesh position={[0, -TOTAL / 2 - 0.02, 0]} rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[60, 60]} /><shadowMaterial opacity={0.25} /></mesh>
        {!reduce && <Sparkles count={70} scale={[W, 2, D]} position={[0, TOTAL / 2 + 1.2, 0]} size={2.2} speed={0.25} color={dark ? "#9fc1ff" : "#b08a52"} opacity={0.6} />}
      </group>
      <CameraRig reduce={reduce} />
    </Canvas>
  );
}
