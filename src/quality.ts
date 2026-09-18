// Graphics quality levels. Chosen with ?q=low|medium|high, otherwise medium on
// touch devices (phones, tablets) and high on computers.

export type QualityLevel = 'low' | 'medium' | 'high';

export interface Quality {
  level: QualityLevel;
  /** Upper limit for devicePixelRatio. */
  pixelRatio: number;
  antialias: boolean;
  /** Shadow map size; 0 turns sun shadows off. */
  shadowMapSize: number;
  /** Ripple normal map on the river. */
  waterDetail: boolean;
}

const LEVELS: Record<QualityLevel, Quality> = {
  low: { level: 'low', pixelRatio: 1, antialias: false, shadowMapSize: 0, waterDetail: false },
  medium: { level: 'medium', pixelRatio: 1.5, antialias: false, shadowMapSize: 1024, waterDetail: true },
  high: { level: 'high', pixelRatio: 2, antialias: true, shadowMapSize: 2048, waterDetail: true },
};

export function detectQuality(): Quality {
  const asked = new URLSearchParams(location.search).get('q');
  if (asked === 'low' || asked === 'medium' || asked === 'high') return LEVELS[asked];
  return window.matchMedia('(pointer: coarse)').matches ? LEVELS.medium : LEVELS.high;
}

export function qualityLevel(level: QualityLevel): Quality {
  return LEVELS[level];
}
