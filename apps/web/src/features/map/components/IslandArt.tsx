// Reusable 2D illustrated islands for the world map. The variants are SVG
// assets so the map can scale, animate, and show game states without loading
// external image files.

const SAND = '#e7d39f';
const WET_SAND = '#d9bd7d';
const GRASS = '#93aa63';
const GRASS_LIGHT = '#c4cf87';
const GRASS_DARK = '#71884d';
const SHALLOW = '#76b4b3';
const ROCK = '#a89779';
const ROCK_LIGHT = '#c6b692';
const TREE = '#526d3f';
const TREE_LIGHT = '#8fa366';

const RESOURCE_COLORS: Record<string, string> = {
  wood: '#5f7f46',
  marble: '#ded8c8',
  wine: '#8e3f63',
  crystal: '#7ec9d4',
  sulfur: '#d8b548',
  gold: '#d3a23c',
};

const RESOURCE_LABELS: Record<string, string> = {
  wood: 'Wood',
  marble: 'Marble',
  wine: 'Wine',
  crystal: 'Crystal',
  sulfur: 'Sulfur',
  gold: 'Gold',
};

type IslandVariant = {
  outline: string;
  scale: number;
  rotate: number;
  beaches: Array<[number, number, number, number, number]>;
  trees: Array<[number, number, number]>;
  groves: Array<[number, number, number]>;
  mountains: Array<[number, number, number]>;
  meadows: Array<[number, number, number, number]>;
  huts: Array<[number, number]>;
};

const VARIANTS: IslandVariant[] = [
  {
    outline:
      'M60 14 C83 10 106 26 108 45 C110 58 96 63 84 59 C72 55 70 64 63 72 C53 84 33 82 21 70 C9 57 15 31 34 20 C42 15 51 16 60 14 Z',
    scale: 1,
    rotate: -2,
    beaches: [
      [28, 27, 18, 7, -22],
      [90, 55, 20, 6, 8],
    ],
    trees: [
      [31, 47, 1.15],
      [39, 54, 0.85],
      [83, 37, 1],
    ],
    groves: [[72, 27, 0.9]],
    mountains: [[51, 40, 1]],
    meadows: [
      [49, 55, 22, 10],
      [70, 46, 16, 8],
    ],
    huts: [
      [41, 63],
      [78, 52],
      [58, 31],
    ],
  },
  {
    outline:
      'M30 24 C44 12 62 18 70 25 C80 15 99 15 106 29 C114 45 105 60 91 66 C81 70 73 64 68 58 C59 68 43 76 30 68 C17 60 14 42 21 32 C24 28 26 26 30 24 Z',
    scale: 1.12,
    rotate: 4,
    beaches: [
      [31, 66, 19, 6, 14],
      [95, 31, 18, 5, -16],
    ],
    trees: [
      [29, 43, 1],
      [74, 54, 1.1],
      [91, 44, 0.85],
    ],
    groves: [[50, 34, 1]],
    mountains: [[61, 46, 0.9]],
    meadows: [
      [40, 54, 18, 9],
      [82, 34, 14, 8],
    ],
    huts: [
      [36, 56],
      [83, 56],
      [50, 38],
    ],
  },
  {
    outline:
      'M65 12 C89 11 108 27 105 47 C102 66 85 74 68 75 C57 76 52 84 39 84 C24 84 12 76 16 64 C18 56 30 53 38 50 C31 43 28 33 36 25 C44 17 54 14 65 12 Z',
    scale: 0.94,
    rotate: -6,
    beaches: [
      [39, 80, 23, 6, -6],
      [98, 46, 17, 5, 20],
    ],
    trees: [
      [31, 63, 0.9],
      [43, 30, 1.05],
      [86, 57, 0.95],
    ],
    groves: [[70, 31, 0.85]],
    mountains: [
      [55, 48, 1],
      [64, 52, 0.75],
    ],
    meadows: [
      [68, 62, 19, 9],
      [46, 44, 14, 7],
    ],
    huts: [
      [45, 68],
      [79, 55],
      [56, 33],
    ],
  },
  {
    outline:
      'M28 30 C46 8 87 10 101 34 C112 54 92 77 62 77 C34 77 13 63 17 46 C19 39 23 34 28 30 Z',
    scale: 1.04,
    rotate: 3,
    beaches: [
      [24, 47, 14, 5, -42],
      [71, 74, 25, 6, -4],
      [97, 39, 16, 5, 27],
    ],
    trees: [
      [35, 47, 1.2],
      [45, 55, 0.9],
      [87, 47, 1],
    ],
    groves: [[70, 31, 1]],
    mountains: [[57, 42, 1.08]],
    meadows: [
      [54, 60, 20, 8],
      [74, 43, 18, 8],
    ],
    huts: [
      [43, 61],
      [79, 56],
      [58, 34],
    ],
  },
  {
    outline:
      'M58 11 C79 9 99 24 105 43 C112 66 88 83 58 82 C29 81 12 62 20 39 C26 23 40 14 58 11 Z',
    scale: 0.86,
    rotate: 0,
    beaches: [
      [28, 63, 19, 6, 24],
      [88, 31, 17, 6, -24],
    ],
    trees: [
      [31, 52, 0.95],
      [82, 58, 0.85],
    ],
    groves: [[76, 36, 0.8]],
    mountains: [
      [51, 48, 1.25],
      [63, 48, 0.9],
      [57, 36, 0.8],
    ],
    meadows: [[66, 65, 15, 7]],
    huts: [
      [38, 64],
      [79, 58],
      [45, 34],
    ],
  },
  {
    outline:
      'M21 41 C31 20 56 16 79 22 C101 28 115 43 106 59 C97 75 66 72 41 69 C17 66 11 53 21 41 Z',
    scale: 1.2,
    rotate: -3,
    beaches: [
      [31, 32, 20, 5, -18],
      [89, 65, 26, 5, -8],
    ],
    trees: [
      [33, 50, 0.9],
      [58, 31, 0.95],
      [95, 50, 0.85],
    ],
    groves: [[70, 55, 0.9]],
    mountains: [[49, 51, 0.85]],
    meadows: [
      [55, 58, 22, 8],
      [82, 39, 16, 7],
    ],
    huts: [
      [39, 58],
      [72, 62],
      [82, 41],
    ],
  },
  {
    outline:
      'M46 15 C62 8 82 16 89 30 C109 34 113 55 98 67 C84 78 63 68 54 77 C42 87 20 78 18 62 C16 49 30 44 30 34 C30 24 38 18 46 15 Z',
    scale: 0.98,
    rotate: 7,
    beaches: [
      [23, 65, 17, 5, 19],
      [100, 53, 15, 5, -28],
    ],
    trees: [
      [39, 37, 0.9],
      [32, 64, 0.8],
      [78, 43, 0.95],
    ],
    groves: [[66, 61, 0.8]],
    mountains: [
      [53, 48, 1.1],
      [86, 55, 0.8],
    ],
    meadows: [[43, 58, 16, 7]],
    huts: [
      [39, 68],
      [74, 55],
      [53, 31],
    ],
  },
  {
    outline:
      'M60 15 C86 14 106 34 104 54 C102 73 82 84 58 82 C34 80 16 64 18 43 C20 26 38 16 60 15 Z',
    scale: 1.06,
    rotate: 1,
    beaches: [
      [28, 41, 18, 6, -33],
      [80, 77, 21, 6, -8],
    ],
    trees: [
      [33, 51, 1.1],
      [48, 35, 0.95],
      [84, 57, 1],
    ],
    groves: [[75, 36, 1.05]],
    mountains: [[58, 52, 0.95]],
    meadows: [
      [50, 62, 21, 9],
      [69, 42, 17, 8],
    ],
    huts: [
      [42, 62],
      [80, 60],
      [56, 37],
    ],
  },
];

function scaledOutline(path: string, scale: number) {
  return (
    <g transform={`translate(60 50) scale(${scale}) translate(-60 -50)`}>
      <path d={path} />
    </g>
  );
}

function Cypress({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx="0" cy="2" rx="5" ry="2" fill="#41532f" opacity="0.28" />
      <path d="M0 -17 C4 -10 4.5 -4 2.5 0 L-2.5 0 C-4.5 -4 -4 -10 0 -17 Z" fill={TREE} />
      <path d="M0 -17 C2 -10 2 -4 1 0 L0 0 Z" fill="#405831" opacity="0.75" />
    </g>
  );
}

function Grove({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx="0" cy="6" rx="13" ry="4" fill="#41532f" opacity="0.24" />
      <rect x="-1.5" y="-5" width="3" height="11" rx="1.5" fill="#785638" />
      <circle cx="-7" cy="-8" r="7" fill={TREE_LIGHT} />
      <circle cx="5" cy="-10" r="8" fill="#9cad6b" />
      <circle cx="0" cy="-16" r="7" fill="#7f9457" />
    </g>
  );
}

function Mountain({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="M-17 11 L-4 -15 L12 11 Z" fill={ROCK} />
      <path d="M-4 -15 L12 11 L1 11 Z" fill="#8c806b" opacity="0.55" />
      <path d="M-6 -10 L-1 -2 L-9 -2 Z" fill={ROCK_LIGHT} />
    </g>
  );
}

function Hut({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="0" cy="6" rx="9" ry="3" fill="#41532f" opacity="0.18" />
      <rect x="-6" y="-4" width="12" height="9" rx="1.5" fill="#efe4ca" stroke="#b3a284" strokeWidth="0.8" />
      <path d="M-8 -4 L0 -11 L8 -4 Z" fill="#c07850" />
      <rect x="-1.5" y="0" width="3" height="5" fill="#7a5838" />
    </g>
  );
}

function ResourceMarker({ resource, x, y }: { resource: string; x: number; y: number }) {
  const color = RESOURCE_COLORS[resource] ?? '#c88a3d';
  const label = RESOURCE_LABELS[resource]?.slice(0, 1) ?? resource.slice(0, 1).toUpperCase();

  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r="8.5" fill="#fff8e9" stroke="#7a5838" strokeWidth="1.2" />
      <circle r="5.4" fill={color} />
      <text
        y="3.2"
        textAnchor="middle"
        fill={resource === 'marble' ? '#5c554a' : '#fff8e9'}
        fontSize="7.5"
        fontWeight="900"
        fontFamily="inherit"
      >
        {label}
      </text>
    </g>
  );
}

function PlayerCityMarker() {
  return (
    <g transform="translate(60 45)">
      <ellipse cx="0" cy="9" rx="18" ry="5" fill="#41532f" opacity="0.18" />
      <rect x="-11" y="-8" width="22" height="17" rx="2" fill="#f1e7cf" stroke="#a89779" strokeWidth="1.5" />
      <path d="M-14 -8 L0 -21 L14 -8 Z" fill="#c07850" stroke="#a2633e" strokeWidth="1" />
      <line x1="0" y1="-21" x2="0" y2="-39" stroke="#7a5838" strokeWidth="2.5" />
      <path className="flag-flutter" d="M1 -38 L18 -33 L1 -27 Z" fill="#c88a3d" />
    </g>
  );
}

type IslandArtProps = {
  variant: number;
  occupiedSlots: number;
  hasPlayerCity: boolean;
  mainResource: string;
  luxuryResource: string;
  isSelected?: boolean;
  isUnexplored?: boolean;
};

export function getIslandVariantScale(variant: number): number {
  const islandVariant = VARIANTS[((variant % VARIANTS.length) + VARIANTS.length) % VARIANTS.length];
  return islandVariant.scale;
}

export function IslandArt({
  variant,
  occupiedSlots,
  hasPlayerCity,
  mainResource,
  luxuryResource,
  isSelected = false,
  isUnexplored = false,
}: IslandArtProps) {
  const islandVariant = VARIANTS[((variant % VARIANTS.length) + VARIANTS.length) % VARIANTS.length];
  const hutCount = Math.min(occupiedSlots - (hasPlayerCity ? 1 : 0), islandVariant.huts.length);

  return (
    <svg
      viewBox="0 0 120 100"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      <g
        style={{ filter: 'drop-shadow(0 4px 3px rgba(20, 60, 67, 0.35))' }}
        transform={`translate(60 50) rotate(${islandVariant.rotate}) translate(-60 -50)`}
      >
        <g fill={SHALLOW} opacity="0.58">
          {scaledOutline(islandVariant.outline, 1.3)}
        </g>
        <g fill={SAND}>{scaledOutline(islandVariant.outline, 1.13)}</g>
        <path d={islandVariant.outline} fill={GRASS} />
        {islandVariant.beaches.map(([x, y, rx, ry, rotate], index) => (
          <ellipse
            key={`beach-${index}`}
            cx={x}
            cy={y}
            rx={rx}
            ry={ry}
            fill={WET_SAND}
            opacity="0.48"
            transform={`rotate(${rotate} ${x} ${y})`}
          />
        ))}
        {islandVariant.meadows.map(([x, y, rx, ry], index) => (
          <ellipse key={`meadow-${index}`} cx={x} cy={y} rx={rx} ry={ry} fill={GRASS_LIGHT} opacity="0.5" />
        ))}
        <path d={islandVariant.outline} fill="none" stroke={GRASS_DARK} strokeWidth="1.2" opacity="0.45" />
        {islandVariant.mountains.map(([x, y, scale], index) => (
          <Mountain key={`mountain-${index}`} x={x} y={y} scale={scale} />
        ))}
        {islandVariant.trees.map(([x, y, scale], index) => (
          <Cypress key={`tree-${index}`} x={x} y={y} scale={scale} />
        ))}
        {islandVariant.groves.map(([x, y, scale], index) => (
          <Grove key={`grove-${index}`} x={x} y={y} scale={scale} />
        ))}
        {hasPlayerCity ? <PlayerCityMarker /> : null}
        {Array.from({ length: Math.max(0, hutCount) }).map((_, index) => (
          <Hut key={index} x={islandVariant.huts[index][0]} y={islandVariant.huts[index][1]} />
        ))}
        <ResourceMarker resource={mainResource} x={24} y={27} />
        <ResourceMarker resource={luxuryResource} x={96} y={72} />
      </g>
      {isSelected ? (
        <ellipse cx="60" cy="86" rx="39" ry="7" fill="#c88a3d" opacity="0.42" />
      ) : null}
      {isUnexplored ? (
        <g>
          <rect x="0" y="0" width="120" height="100" fill="#dfe8de" opacity="0.42" />
          <path d="M12 36 C28 22 48 32 60 23 C74 13 94 20 105 35" stroke="#fff8e9" strokeWidth="10" strokeLinecap="round" opacity="0.55" />
          <path d="M18 68 C37 55 57 66 71 56 C85 46 100 55 110 66" stroke="#fff8e9" strokeWidth="9" strokeLinecap="round" opacity="0.5" />
        </g>
      ) : null}
    </svg>
  );
}
