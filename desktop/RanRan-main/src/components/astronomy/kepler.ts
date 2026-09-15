import * as THREE from 'three';

export interface KeplerOrbit {
  a: number;
  e: number;
  i: number;
  Omega: number;
  omega: number;
  M0: number;
  n: number;
  beltIndex: number;
}

/** 由内到外的 8 条行星带，单位为场景距离 */
export const ORBIT_BELTS = [16, 23, 31, 41, 53, 67, 83, 102] as const;

const INNER_MEAN_MOTION = 0.11;

function hash01(index: number, salt: number): number {
  const x = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function createPlanetOrbit(index: number, total: number): KeplerOrbit {
  const beltCount = ORBIT_BELTS.length;
  const perBelt = Math.max(1, Math.ceil(Math.max(total, 1) / beltCount));
  const beltIndex = Math.min(beltCount - 1, Math.floor(index / perBelt));
  const slot = index - beltIndex * perBelt;
  const inBelt = Math.min(perBelt, Math.max(total - beltIndex * perBelt, 1));
  const a = ORBIT_BELTS[beltIndex];
  const e = 0.016 + hash01(index, 1) * 0.055;
  const i = (hash01(index, 2) - 0.5) * 0.09;
  const Omega = (hash01(index, 3) - 0.5) * 0.28;
  const omega = hash01(index, 4) * Math.PI * 2;
  const M0 = (slot / inBelt) * Math.PI * 2 + hash01(index, 5) * 0.2;
  const n = INNER_MEAN_MOTION * Math.pow(a / ORBIT_BELTS[0], -1.5);

  return { a, e, i, Omega, omega, M0, n, beltIndex };
}

export function createBeltGuide(beltIndex: number): KeplerOrbit {
  const a = ORBIT_BELTS[Math.min(Math.max(beltIndex, 0), ORBIT_BELTS.length - 1)];
  return {
    a,
    e: 0.035,
    i: 0,
    Omega: 0,
    omega: 0,
    M0: 0,
    n: 1,
    beltIndex,
  };
}

function keplerAnomaly(M: number, e: number): number {
  let wrapped = M % (Math.PI * 2);
  if (wrapped < 0) wrapped += Math.PI * 2;
  let E = e < 0.8 ? wrapped : Math.PI;
  for (let k = 0; k < 6; k++) {
    const dE = (E - e * Math.sin(E) - wrapped) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-6) break;
  }
  return E;
}

export function orbitPosition(orbit: KeplerOrbit, time: number, target: THREE.Vector3): THREE.Vector3 {
  const E = keplerAnomaly(orbit.M0 + orbit.n * time, orbit.e);
  const xp = orbit.a * (Math.cos(E) - orbit.e);
  const yp = orbit.a * Math.sqrt(1 - orbit.e * orbit.e) * Math.sin(E);

  const cosO = Math.cos(orbit.Omega);
  const sinO = Math.sin(orbit.Omega);
  const cosw = Math.cos(orbit.omega);
  const sinw = Math.sin(orbit.omega);
  const cosi = Math.cos(orbit.i);
  const sini = Math.sin(orbit.i);

  const x =
    xp * (cosw * cosO - sinw * sinO * cosi) -
    yp * (sinw * cosO + cosw * sinO * cosi);
  const z =
    xp * (cosw * sinO + sinw * cosO * cosi) +
    yp * (cosw * cosO * cosi - sinw * sinO);
  const y = xp * (sinw * sini) + yp * (cosw * sini);

  return target.set(x, y, z);
}

export function orbitCurvePoints(orbit: KeplerOrbit, segments = 160): Float32Array {
  const arr = new Float32Array((segments + 1) * 3);
  const scratch = new THREE.Vector3();
  const period = (Math.PI * 2) / Math.max(orbit.n, 1e-6);
  for (let i = 0; i <= segments; i++) {
    orbitPosition(orbit, (i / segments) * period, scratch);
    arr[i * 3] = scratch.x;
    arr[i * 3 + 1] = scratch.y;
    arr[i * 3 + 2] = scratch.z;
  }
  return arr;
}

export function usedBeltIndexes(totalPhotos: number): number[] {
  if (totalPhotos <= 0) return [];
  const set = new Set<number>();
  for (let i = 0; i < totalPhotos; i++) {
    set.add(createPlanetOrbit(i, totalPhotos).beltIndex);
  }
  return Array.from(set).sort((a, b) => a - b);
}
