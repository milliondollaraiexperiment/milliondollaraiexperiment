"use client";

import dynamic from "next/dynamic";
import Image from "next/image";

/**
 * Client-only lazy wrapper for RobotArt3D. Three.js and react-three-fiber
 * cannot SSR safely (some modules expect `window`), and they would also
 * inflate the initial bundle. `next/dynamic` with `ssr: false` keeps the
 * 3D code out of the server render and out of the main JS chunk. While
 * the chunk is loading (or on browsers without WebGL), the original PNG
 * stays on screen.
 */
const RobotArt3D = dynamic(
  () => import("./RobotArt3D").then((m) => m.RobotArt3D),
  {
    ssr: false,
    loading: () => (
      <Image
        src="/hero.png"
        alt="A small white robot holding an empty bowl"
        width={400}
        height={400}
        priority
        className="aspect-square w-full object-contain"
      />
    ),
  },
);

export function RobotArt3DLazy() {
  return (
    <div className="absolute inset-0 h-full w-full">
      <RobotArt3D />
    </div>
  );
}
