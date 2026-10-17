"use client";

import { Canvas, useFrame, useThree, type ThreeElements } from "@react-three/fiber";
import { memo, useEffect, useMemo, useRef, type RefObject } from "react";
import { ACESFilmicToneMapping, BufferGeometry, CanvasTexture, CatmullRomCurve3, CubicBezierCurve3, DoubleSide, Float32BufferAttribute, MathUtils, PCFShadowMap, SRGBColorSpace, Vector3, type Group, type OrthographicCamera } from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { categories, type Category } from "@/lib/types";
import type { DecisionExchange } from "@/lib/use-wiki-flow";

type Point = [number, number, number];
export interface SortingLabelRefs {
  source: RefObject<HTMLDivElement | null>;
  machine: RefObject<HTMLDivElement | null>;
  article: RefObject<HTMLAnchorElement | null>;
  destinations: RefObject<HTMLDivElement | null>[];
}

interface WorldProps {
  exchange: DecisionExchange | null;
  running: boolean;
  reduced: boolean;
  arrivals: Record<Category, number>;
  labels: SortingLabelRefs;
  inputTravel: number;
  outputTravel: number;
  onReady: () => void;
}

interface Layout {
  portrait: boolean;
  source: Point;
  machine: Point;
  destinations: Point[];
  input: CubicBezierCurve3;
  outputs: CubicBezierCurve3[];
}

function makeLayout(portrait: boolean): Layout {
  const source: Point = portrait ? [0, 0, -7.0] : [-5.7, 0, 0];
  const machine: Point = portrait ? [0, 0, -.7] : [-.7, 0, 0];
  const destinations: Point[] = portrait ? [-3.25, -1.08, 1.08, 3.25].map((x) => [x, 0, 3.7]) : [-3.15, -1.05, 1.05, 3.15].map((z) => [5.25, 0, z]);
  const input = portrait
    ? new CubicBezierCurve3(new Vector3(0, .69, -5.95), new Vector3(0, .69, -4.5), new Vector3(0, .69, -2.1), new Vector3(...machine).setY(.69))
    : new CubicBezierCurve3(new Vector3(-4.55, .69, 0), new Vector3(-3.8, .69, 0), new Vector3(-1.8, .69, 0), new Vector3(...machine).setY(.69));
  const outputs = destinations.map(([x, , z]) => portrait
    ? new CubicBezierCurve3(new Vector3(...machine).setY(.69), new Vector3(0, .69, 1.0), new Vector3(x, .69, 1.9), new Vector3(x, .69, z))
    : new CubicBezierCurve3(new Vector3(...machine).setY(.69), new Vector3(1.5, .69, 0), new Vector3(2.6, .69, z), new Vector3(x, .69, z)));
  return { portrait, source, machine, destinations, input, outputs };
}

type BlockProps = Omit<ThreeElements["mesh"], "args"> & { size: Point; color?: string; radius?: number; metalness?: number; roughness?: number; emissive?: string; intensity?: number };
function Block({ size, color = "#f5f5ed", radius = .1, metalness = .08, roughness = .45, emissive = "#000000", intensity = 0, ...props }: BlockProps) {
  const [w, h, d] = size;
  const geometry = useMemo(() => new RoundedBoxGeometry(w, h, d, 3, radius), [w, h, d, radius]);
  return <mesh geometry={geometry} castShadow receiveShadow {...props}><meshStandardMaterial color={color} roughness={roughness} metalness={metalness} emissive={emissive} emissiveIntensity={intensity} /></mesh>;
}

function stampTexture(title: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 640; canvas.height = 448;
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#fcfced"; context.fillRect(0, 0, 640, 448);
  context.fillStyle = "#6d7b61";
  context.font = "72px Georgia";
  context.fillText("W", 46, 100);
  context.font = "500 34px Arial";
  context.fillStyle = "#2f4231";
  let line = "", y = 176;
  for (const word of title.split(" ")) {
    if (context.measureText(`${line} ${word}`).width > 544 && line) { context.fillText(line, 46, y); line = word; y += 43; if (y > 270) break; }
    else line = line ? `${line} ${word}` : word;
  }
  context.fillText(line.slice(0, 34), 46, y);
  context.fillStyle = "#ccd2be";
  context.fillRect(46, 336, 530, 3); context.fillRect(46, 360, 375, 3); context.fillRect(46, 384, 460, 3);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function ArticleSheet({ title }: { title: string }) {
  const texture = useMemo(() => stampTexture(title), [title]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <>
    <Block size={[1.43, .055, .98]} radius={.025} color="#fffef0" roughness={.7} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .032, 0]}><planeGeometry args={[1.38, .94]} /><meshStandardMaterial map={texture} roughness={.8} /></mesh>
  </>;
}

function WikipediaStation({ position, orbit }: { position: Point; orbit: RefObject<Group | null> }) {
  return <group position={position}>
    <mesh position={[0, .02, 0]} castShadow receiveShadow><cylinderGeometry args={[1.27, 1.32, .28, 64]} /><meshStandardMaterial color="#f8f8ee" roughness={.5} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .17, 0]}><torusGeometry args={[1.14, .025, 8, 96]} /><meshStandardMaterial color="#a1bf82" emissive="#a1bf82" emissiveIntensity={.1} /></mesh>
    <mesh position={[0, 1.47, 0]} castShadow receiveShadow><sphereGeometry args={[1.01, 48, 32]} /><meshStandardMaterial color="#f0f3e7" metalness={.04} roughness={.4} /></mesh>
    <group ref={orbit} position={[0, 1.47, 0]} rotation={[.05, 0, -.16]}>
      {[-.73, -.4, 0, .4, .73].map((y) => <mesh key={y} position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[Math.sqrt(1.025 ** 2 - y ** 2), .008, 5, 72]} /><meshStandardMaterial color="#92a98a" transparent opacity={.47} /></mesh>)}
      {[0, .52, 1.04, 1.56, 2.08, 2.6].map((angle) => <mesh key={angle} rotation={[0, angle, 0]}><torusGeometry args={[1.025, .008, 5, 72]} /><meshStandardMaterial color="#92a98a" transparent opacity={.42} /></mesh>)}
      <mesh rotation={[.35, -.15, -.6]}><torusGeometry args={[1.43, .013, 6, 100]} /><meshStandardMaterial color="#9fb490" metalness={.35} roughness={.35} /></mesh>
      <mesh position={[1.3, .5, -.25]}><sphereGeometry args={[.055, 12, 12]} /><meshStandardMaterial color="#97b966" emissive="#90b56a" emissiveIntensity={.4} /></mesh>
    </group>
    {[0, 1, 2].map((i) => <Block key={i} size={[.78, .045, .57]} radius={.02} position={[-.78, .22 + i * .055, .68]} rotation={[0, -.18 + i * .04, 0]} color="#e7eade" />)}
  </group>;
}

function Conveyor({ layout, running, sending }: { layout: Layout; running: boolean; sending: boolean }) {
  const rollers = useRef<Group>(null);
  useFrame((_, delta) => { if (running && sending) rollers.current?.children.forEach((roller) => { roller.rotateY(delta * 3.5); }); });
  const length = layout.portrait ? 5.25 : 4.15;
  const center: Point = layout.portrait ? [0, 0, -3.325] : [-2.65, 0, 0];
  return <group position={center} rotation={[0, layout.portrait ? -Math.PI / 2 : 0, 0]}>
    <Block size={[length + .18, .22, 1.35]} radius={.09} position={[0, .15, 0]} color="#dce2d4" />
    <Block size={[length, .08, 1.08]} radius={.025} position={[0, .3, 0]} color="#526751" />
    <group ref={rollers}>{Array.from({ length: 18 }, (_, i) => <mesh key={i} position={[-length / 2 + .12 + i * (length - .24) / 17, .36, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[.085, .085, 1.03, 12]} /><meshStandardMaterial color={i % 3 === 0 ? "#aab89e" : "#879b7d"} roughness={.48} metalness={.2} /></mesh>)}</group>
    {[-.63, .63].map((z) => <Block key={z} size={[length + .08, .12, .07]} radius={.025} position={[0, .4, z]} color="#f4f5eb" metalness={.18} />)}
  </group>;
}

function Processor({ position, color, core, requesting }: { position: Point; color: string; core: RefObject<Group | null>; requesting: boolean }) {
  return <group position={position}>
    <Block size={[3.0, .35, 2.6]} position={[0, .12, 0]} radius={.2} color="#264a3a" roughness={.37} />
    <Block size={[2.78, .11, 2.38]} position={[0, .35, 0]} radius={.13} color="#496449" metalness={.25} />
    <Block size={[2.6, .075, 2.2]} position={[0, .42, 0]} radius={.1} color="#172f25" roughness={.3} />
    {[-1.22, 1.22].flatMap((x) => [-.99, .99].map((z) => <group key={`${x}-${z}`}><Block size={[.13, 1.26, .13]} position={[x, 1.06, z]} radius={.035} color="#294b38" metalness={.35} /><mesh position={[x, 1.72, z]}><sphereGeometry args={[.055, 10, 10]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={.5} /></mesh></group>))}
    {[-1.24, 1.24].map((x) => <Block key={x} size={[.17, .18, 2.32]} position={[x, 1.77, 0]} radius={.045} color="#33533b" metalness={.25} />)}
    {[-1.08, 1.08].map((z) => <Block key={z} size={[2.64, .18, .17]} position={[0, 1.77, z]} radius={.045} color="#33533b" metalness={.25} />)}
    {[-1.06, 1.06].map((z) => <Block key={z} size={[2.3, .035, .035]} position={[0, 1.865, z]} radius={.013} color={color} emissive={color} intensity={.6} />)}
    <mesh position={[0, 1.08, 0]}><boxGeometry args={[2.28, 1.24, 1.92]} /><meshPhysicalMaterial color="#c9e4ce" transparent opacity={.09} roughness={.05} metalness={0} depthWrite={false} side={DoubleSide} /></mesh>
    <group ref={core} position={[0, 1.25, 0]}>
      <mesh castShadow><octahedronGeometry args={[.39, 0]} /><meshStandardMaterial color={color} roughness={.25} metalness={.15} emissive={color} emissiveIntensity={requesting ? .8 : .22} /></mesh>
      {[0, 1.05, 2.1].map((angle) => <mesh key={angle} rotation={[.75, angle, .3]}><torusGeometry args={[.63, .018, 8, 64]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={.4} roughness={.3} metalness={.2} /></mesh>)}
    </group>
    <pointLight position={[0, 1.3, 0]} color={color} intensity={requesting ? 2.5 : 1.25} distance={4.5} decay={2} />
    {[-.9, -.64, -.38, .38, .64, .9].map((x) => <Block key={x} size={[.12, .045, .018]} position={[x, .17, 1.31]} radius={.008} color={color} emissive={color} intensity={.4} />)}
  </group>;
}

function ribbonGeometry(curve: CubicBezierCurve3, width: number) {
  const positions: number[] = [], normals: number[] = [], indices: number[] = [];
  const point = new Vector3(), tangent = new Vector3();
  for (let i = 0; i <= 64; i++) {
    const t = i / 64;
    curve.getPoint(t, point); curve.getTangent(t, tangent);
    const dx = -tangent.z * width / 2, dz = tangent.x * width / 2;
    positions.push(point.x - dx, .32, point.z - dz, point.x + dx, .32, point.z + dz);
    normals.push(0, 1, 0, 0, 1, 0);
    if (i < 64) { const a = i * 2; indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3)); geometry.setIndex(indices);
  return geometry;
}

function Track({ curve, color, selected }: { curve: CubicBezierCurve3; color: string; selected: boolean }) {
  const geometry = useMemo(() => ribbonGeometry(curve, .78), [curve]);
  const rails = useMemo(() => [-1, 1].map((side) => new CatmullRomCurve3(Array.from({ length: 49 }, (_, i) => {
    const p = curve.getPoint(i / 48), tangent = curve.getTangent(i / 48);
    return new Vector3(p.x - tangent.z * .41 * side, .37, p.z + tangent.x * .41 * side);
  }))), [curve]);
  const light = useMemo(() => new CatmullRomCurve3(Array.from({ length: 49 }, (_, i) => curve.getPoint(i / 48).setY(.338))), [curve]);
  return <group>
    <mesh geometry={geometry} receiveShadow><meshStandardMaterial color={selected ? "#f7f8ed" : "#d9e0d1"} roughness={.7} side={DoubleSide} /></mesh>
    {rails.map((rail, i) => <mesh key={i} castShadow><tubeGeometry args={[rail, 48, .025, 6, false]} /><meshStandardMaterial color={selected ? color : "#bac7ae"} metalness={.2} roughness={.45} emissive={selected ? color : "#000000"} emissiveIntensity={.35} /></mesh>)}
    <mesh><tubeGeometry args={[light, 48, selected ? .046 : .023, 8, false]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={selected ? .65 : 0} transparent opacity={selected ? 1 : .17} /></mesh>
  </group>;
}

function Destination({ position, color, selected, count }: { position: Point; color: string; selected: boolean; count: number }) {
  return <group position={position}>
    <mesh position={[0, .01, 0]} castShadow receiveShadow><cylinderGeometry args={[1.0, 1.04, .22, 56]} /><meshStandardMaterial color="#f5f5eb" roughness={.5} /></mesh>
    <mesh position={[0, .28, 0]} castShadow receiveShadow><cylinderGeometry args={[.91, .91, .36, 56, 1, true]} /><meshStandardMaterial color={selected ? color : "#e7ecdf"} roughness={.4} side={DoubleSide} /></mesh>
    <mesh position={[0, .18, 0]} receiveShadow><cylinderGeometry args={[.85, .85, .055, 56]} /><meshStandardMaterial color={color} roughness={.65} transparent opacity={selected ? .55 : .23} /></mesh>
    <mesh position={[0, .465, 0]} rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[.91, selected ? .047 : .027, 10, 64]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={selected ? .55 : 0} roughness={.4} /></mesh>
    {Array.from({ length: Math.min(count, 3) }, (_, i) => <Block key={i} size={[1.2, .045, .81]} radius={.025} position={[0, .23 + .05 * i, 0]} rotation={[0, (i - 1) * .075, 0]} color="#fcfced" />)}
    {selected && <pointLight position={[0, .8, 0]} color={color} intensity={1.5} distance={3} decay={2} />}
  </group>;
}

function World({ exchange, running, reduced, arrivals, labels, inputTravel, outputTravel }: Omit<WorldProps, "onReady">) {
  const { size, camera, invalidate } = useThree();
  const portrait = size.width <= 700;
  const layout = useMemo(() => makeLayout(portrait), [portrait]);
  const packet = useRef<Group>(null), core = useRef<Group>(null), orbit = useRef<Group>(null);
  const elapsed = useRef({ phase: "waiting", id: "", ms: 0 });
  const time = useRef(0);
  const temp = useMemo(() => ({ point: new Vector3(), tangent: new Vector3(), projected: new Vector3() }), []);
  const result = exchange?.result;
  const selectedIndex = categories.findIndex((item) => item.id === result?.category);
  const color = selectedIndex >= 0 ? categories[selectedIndex].color : "#c5e89a";

  useEffect(() => {
    const ortho = camera as OrthographicCamera;
    camera.position.set(...(portrait ? [0, 14, 19] : [8, 11.5, 18]) as Point);
    camera.lookAt(portrait ? new Vector3(0, .4, -.1) : new Vector3(.2, .35, 0));
    ortho.zoom = Math.min(size.width / (portrait ? 10.4 : 20.2), size.height / (portrait ? 17.5 : 11.5));
    ortho.updateProjectionMatrix(); camera.updateMatrixWorld();
    invalidate();
  }, [camera, size.width, size.height, portrait, invalidate]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, .1);
    if (running && !reduced) time.current += delta;
    const phase = exchange?.phase ?? "waiting";
    const id = exchange?.edit.id ?? "";
    const changed = phase !== "paused" && (elapsed.current.phase !== phase || elapsed.current.id !== id);
    if (changed) elapsed.current = { phase, id, ms: 0 };
    else if (running && phase !== "paused") elapsed.current.ms += rawDelta * 1000;
    const activePhase = phase === "paused" ? elapsed.current.phase : phase;
    const p = packet.current;
    if (p && exchange) {
      let progress = 0;
      if (activePhase === "sending") {
        progress = Math.min(elapsed.current.ms / inputTravel, 1);
        layout.input.getPoint(MathUtils.smoothstep(progress, 0, 1), temp.point);
        layout.input.getTangent(progress, temp.tangent);
      } else if ((activePhase === "routing" || activePhase === "routed") && selectedIndex >= 0) {
        progress = activePhase === "routed" ? 1 : Math.min(elapsed.current.ms / outputTravel, 1);
        const t = MathUtils.smoothstep(progress, 0, 1);
        layout.outputs[selectedIndex].getPoint(t, temp.point);
        layout.outputs[selectedIndex].getTangent(t, temp.tangent);
        temp.point.y -= MathUtils.smoothstep(progress, .83, 1) * .34;
      } else {
        temp.point.set(...layout.machine).setY(.69);
        temp.tangent.set(portrait ? 0 : 1, 0, portrait ? 1 : 0);
      }
      p.position.copy(temp.point);
      const heading = Math.atan2(temp.tangent.x, temp.tangent.z) - Math.PI / 2;
      p.rotation.set(0, heading, reduced ? 0 : Math.sin(progress * Math.PI) * -.035);
      p.visible = activePhase !== "routed";
    }
    if (core.current && running && !reduced) {
      core.current.rotation.y += delta * (phase === "requesting" ? 2.8 : .24);
      core.current.rotation.z = Math.sin(time.current * .7) * .08;
      core.current.scale.setScalar(phase === "requesting" ? 1 + Math.sin(time.current * 12) * .045 : 1);
    }
    if (orbit.current && running && !reduced) orbit.current.rotation.y += delta * .07;

    const project = (element: HTMLElement | null, point: Point, visible = true) => {
      if (!element) return;
      temp.projected.set(...point).project(camera);
      let x = (temp.projected.x * .5 + .5) * size.width;
      let y = (-temp.projected.y * .5 + .5) * size.height;
      if (element === labels.article.current) {
        x = portrait ? size.width / 2 : MathUtils.clamp(x, 155, size.width - 155);
        if (portrait) y = size.height - 110;
      }
      element.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`;
      element.style.opacity = visible ? "1" : "0";
      if (element === labels.article.current) element.style.visibility = visible ? "visible" : "hidden";
      if (element === labels.article.current && packet.current && !portrait) {
        temp.projected.copy(packet.current.position).project(camera);
        const cardY = (-temp.projected.y * .5 + .5) * size.height;
        element.style.setProperty("--s-leader", `${Math.max(10, cardY - y - 4).toFixed(1)}px`);
      }
    };
    const [sx, , sz] = layout.source, [mx, , mz] = layout.machine;
    project(labels.source.current, [sx, portrait ? 2.95 : 3.05, sz]);
    project(labels.machine.current, [mx, portrait ? 2.6 : 3.18, mz]);
    layout.destinations.forEach(([x, , z], i) => project(labels.destinations[i].current, portrait ? [x, .05, z + 1.24] : [x + 1.14, .55, z]));
    if (p && exchange) {
      project(labels.article.current, [p.position.x, p.position.y + (portrait ? -.12 : 1.06), p.position.z + (portrait ? .75 : 0)]);
    } else if (labels.article.current) labels.article.current.style.opacity = "0";
  });

  return <>
    <color attach="background" args={["#eff1eb"]} />
    <ambientLight intensity={1.25} />
    <hemisphereLight args={["#fffef1", "#a5b6a1", 1.5]} />
    <directionalLight position={[-3, 12, 7]} intensity={3} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12} shadow-normalBias={.035} shadow-bias={-.0001} shadow-radius={4} />
    <directionalLight position={[5, 5, -8]} color="#d6e9e4" intensity={1.7} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.85, 0]} receiveShadow><planeGeometry args={[200, 200]} /><shadowMaterial transparent opacity={.14} /></mesh>
    <Block size={portrait ? [9.3, .3, 15.0] : [17.2, .3, 9.4]} position={[0, -.47, portrait ? -1.15 : 0]} radius={.28} color="#f8f8ef" roughness={.65} />
    <Block size={portrait ? [9.0, .08, 14.7] : [16.9, .08, 9.1]} position={[0, -.275, portrait ? -1.15 : 0]} radius={.2} color="#f1f3e9" roughness={.75} />
    <Conveyor layout={layout} running={running && !reduced} sending={exchange?.phase === "sending"} />
    {layout.outputs.map((curve, i) => <Track key={i} curve={curve} color={categories[i].color} selected={selectedIndex === i} />)}
    <WikipediaStation position={layout.source} orbit={orbit} />
    <Processor position={layout.machine} color={color} core={core} requesting={exchange?.phase === "requesting"} />
    {layout.destinations.map((position, i) => <Destination key={categories[i].id} position={position} color={categories[i].color} selected={selectedIndex === i} count={arrivals[categories[i].id]} />)}
    {exchange && <group ref={packet}><ArticleSheet title={exchange.edit.title} /></group>}
  </>;
}

export default memo(function SortingWorld({ onReady, ...props }: WorldProps) {
  return <Canvas orthographic camera={{ position: [8, 11.5, 18], zoom: 70, near: .1, far: 120 }} dpr={[1, 1.5]} shadows frameloop={props.running ? "always" : "demand"} gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }} onCreated={({ gl }) => { gl.toneMapping = ACESFilmicToneMapping; gl.toneMappingExposure = 1.03; gl.shadowMap.type = PCFShadowMap; onReady(); }} fallback={<div className="s-loading s-scene-error">This browser couldn’t open the 3D scene. <a href="/console">Open the live console ↗</a></div>}>
    <World {...props} />
  </Canvas>;
});
