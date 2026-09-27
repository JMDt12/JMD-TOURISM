import { useId } from 'react';

/**
 * Illustrated scenes, drawn here rather than photographed.
 *
 * The trust rule is that we never pass off stock photography as our own fleet
 * or our own guides. These are original drawings in the brand palette, and
 * they read as drawings — nobody will mistake one for a photo of the actual
 * bus. When a real photograph is supplied it replaces the artwork outright.
 */

const INK = '#2a1a5e';
const INK_2 = '#3b2a7a';
const MARIGOLD = '#e8930c';
const MARIGOLD_2 = '#f5c96b';
const PEACOCK = '#12776b';
const SAND = '#e7dcc9';
const CREAM = '#fdf8f0';

/** Which scene suits a place. Falls back to a temple, which is safe in Braj. */
export const SCENE_FOR_CITY = {
  Mathura: 'ghat',
  Vrindavan: 'temple',
  Gokul: 'temple',
  Barsana: 'hill',
  Nandgaon: 'hill',
  Govardhan: 'hill',
  Agra: 'taj',
  'Fatehpur Sikri': 'arch',
  Bharatpur: 'arch',
  Deeg: 'arch',
  Varanasi: 'ghat',
  Sarnath: 'arch',
  Delhi: 'arch',
  Noida: 'arch',
  Shimla: 'mountains',
  Manali: 'mountains',
  Nainital: 'mountains',
  Mussoorie: 'mountains',
};

export const sceneForCity = (city) => SCENE_FOR_CITY[city] ?? 'temple';

export default function Artwork({ variant = 'temple', className = '', title }) {
  const uid = useId().replace(/:/g, '');
  const sky = `sky-${uid}`;
  const Scene = SCENES[variant] ?? SCENES.temple;

  return (
    <svg
      viewBox="0 0 400 260"
      preserveAspectRatio="xMidYMid slice"
      className={`h-full w-full ${className}`}
      role="img"
      aria-label={title ?? LABELS[variant] ?? 'Illustration'}
    >
      <defs>
        <linearGradient id={sky} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbe7bd" />
          <stop offset="55%" stopColor={CREAM} />
          <stop offset="100%" stopColor="#f3e6cf" />
        </linearGradient>
      </defs>
      <rect width="400" height="260" fill={`url(#${sky})`} />
      <Scene />
    </svg>
  );
}

const LABELS = {
  temple: 'Illustration of a Braj temple',
  ghat: 'Illustration of the river ghats at dusk',
  hill: 'Illustration of a temple hill in Braj',
  taj: 'Illustration of the Taj Mahal',
  arch: 'Illustration of a Mughal gateway',
  mountains: 'Illustration of the Himalayan foothills',
  bus: 'Illustration of a tour coach',
  car: 'Illustration of a car',
  bike: 'Illustration of a scooter',
  room: 'Illustration of a guest room',
};

/** A low sun that most outdoor scenes share. */
const Sun = ({ cx = 320, cy = 62, r = 26 }) => (
  <>
    <circle cx={cx} cy={cy} r={r + 14} fill={MARIGOLD} opacity="0.14" />
    <circle cx={cx} cy={cy} r={r} fill={MARIGOLD} opacity="0.55" />
  </>
);

const Ground = ({ y = 206, fill = INK }) => (
  <rect x="0" y={y} width="400" height={260 - y} fill={fill} />
);

/** Flag and finial that top every shikhara here. */
const Finial = ({ x, y }) => (
  <>
    <circle cx={x} cy={y} r="5" fill={MARIGOLD} />
    <rect x={x - 1.5} y={y - 26} width="3" height="26" fill={MARIGOLD} />
    <path d={`M${x + 1.5} ${y - 26} L${x + 26} ${y - 19} L${x + 1.5} ${y - 12} Z`} fill="#b8392e" />
  </>
);

const SCENES = {
  /* A North Indian shikhara temple, the shape of Braj. */
  temple: () => (
    <>
      <Sun />
      <path d="M0 206 Q 90 190 200 200 T 400 196 L400 260 L0 260 Z" fill={SAND} />
      {/* Side shrines */}
      <path d="M62 206 L62 150 Q80 116 98 150 L98 206 Z" fill={INK_2} />
      <path d="M302 206 L302 150 Q320 116 338 150 L338 206 Z" fill={INK_2} />
      {/* Main tower */}
      <path d="M150 206 L150 130 Q200 34 250 130 L250 206 Z" fill={INK} />
      {/* Tower banding */}
      {[150, 166, 182].map((y, i) => (
        <path key={y} d={`M${156 + i * 8} ${y} H${244 - i * 8}`} stroke={MARIGOLD} strokeOpacity="0.5" strokeWidth="2" />
      ))}
      {/* Doorway */}
      <path d="M182 206 L182 168 Q200 148 218 168 L218 206 Z" fill={MARIGOLD} />
      <path d="M191 206 L191 176 Q200 166 209 176 L209 206 Z" fill="#7a4a06" />
      <Finial x={200} y={40} />
      <Ground />
      {/* Steps */}
      <rect x="168" y="206" width="64" height="7" fill={SAND} />
      <rect x="158" y="213" width="84" height="7" fill="#d8ccb6" />
    </>
  ),

  /* Steps down to the river, diyas on the water. */
  ghat: () => (
    <>
      <Sun cx={78} cy={54} r={22} />
      {/* Far bank temples */}
      <path d="M236 158 L236 122 Q252 96 268 122 L268 158 Z" fill={INK_2} opacity="0.85" />
      <path d="M292 158 L292 132 Q306 110 320 132 L320 158 Z" fill={INK_2} opacity="0.7" />
      <rect x="120" y="120" width="86" height="38" fill={INK} />
      <path d="M120 120 L163 92 L206 120 Z" fill={INK_2} />
      {/* Ghat steps */}
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={0} y={158 + i * 10} width="400" height="10"
              fill={i % 2 ? '#d8ccb6' : SAND} />
      ))}
      {/* Water */}
      <rect x="0" y="208" width="400" height="52" fill="#2f5d6b" />
      <path d="M0 216 Q 40 212 80 216 T 160 216 T 240 216 T 320 216 T 400 216"
            stroke="#4d8593" strokeWidth="3" fill="none" opacity="0.7" />
      <path d="M0 234 Q 50 230 100 234 T 200 234 T 300 234 T 400 234"
            stroke="#4d8593" strokeWidth="3" fill="none" opacity="0.5" />
      {/* Floating diyas */}
      {[70, 150, 250, 330].map((x, i) => (
        <g key={x}>
          <ellipse cx={x} cy={222 + (i % 2) * 12} rx="9" ry="3.5" fill={MARIGOLD_2} />
          <circle cx={x} cy={218 + (i % 2) * 12} r="3.5" fill={MARIGOLD} />
        </g>
      ))}
    </>
  ),

  /* Govardhan or the Barsana hill, with a shrine on top. */
  hill: () => (
    <>
      <Sun cx={330} cy={56} r={24} />
      <path d="M0 214 Q 120 120 210 214 Z" fill={INK_2} />
      <path d="M120 214 Q 250 92 400 214 Z" fill={INK} />
      {/* Hilltop shrine */}
      <path d="M244 118 L244 96 Q258 74 272 96 L272 118 Z" fill={MARIGOLD} />
      <Finial x={258} y={78} />
      {/* Steps up the flank */}
      <path d="M258 122 L238 214" stroke={SAND} strokeWidth="6" strokeLinecap="round" opacity="0.75" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <path key={i} d={`M${254 - i * 3.4} ${134 + i * 13} h12`} stroke={CREAM} strokeWidth="2.5" opacity="0.8" />
      ))}
      <Ground y={214} fill="#3d2f1c" />
      {/* Trees */}
      {[40, 96, 350].map((x) => (
        <g key={x}>
          <rect x={x - 2} y="196" width="4" height="20" fill="#4a3a1f" />
          <circle cx={x} cy="192" r="14" fill={PEACOCK} opacity="0.85" />
        </g>
      ))}
    </>
  ),

  /* The Taj: dome, minarets, and the long pool. */
  taj: () => (
    <>
      <Sun cx={64} cy={52} r={22} />
      <rect x="0" y="196" width="400" height="14" fill={SAND} />
      {/* Minarets */}
      {[96, 304].map((x) => (
        <g key={x}>
          <rect x={x - 6} y="104" width="12" height="92" fill={INK_2} />
          <circle cx={x} cy="100" r="9" fill={INK_2} />
          <rect x={x - 1.5} y="82" width="3" height="12" fill={MARIGOLD} />
        </g>
      ))}
      {/* Plinth and facade */}
      <rect x="140" y="146" width="120" height="50" fill={INK} />
      {/* Dome */}
      <path d="M158 146 Q200 60 242 146 Z" fill={INK} />
      <path d="M197 62 q3 -14 6 0" fill={INK} />
      <rect x="198.5" y="42" width="3" height="20" fill={MARIGOLD} />
      <circle cx="200" cy="40" r="4.5" fill={MARIGOLD} />
      {/* Small flanking domes */}
      <path d="M146 146 Q160 118 174 146 Z" fill={INK_2} />
      <path d="M226 146 Q240 118 254 146 Z" fill={INK_2} />
      {/* Great arch */}
      <path d="M184 196 L184 162 Q200 142 216 162 L216 196 Z" fill={MARIGOLD} opacity="0.9" />
      {/* Reflecting pool */}
      <rect x="0" y="210" width="400" height="50" fill="#e9dcc4" />
      <rect x="160" y="210" width="80" height="50" fill="#8fb6c4" />
      <path d="M170 224 h60 M170 238 h60" stroke={CREAM} strokeWidth="2" opacity="0.8" />
      {/* Cypresses */}
      {[128, 272].map((x) => (
        <path key={x} d={`M${x} 196 q -8 -30 0 -46 q 8 16 0 46`} fill={PEACOCK} />
      ))}
    </>
  ),

  /* A Mughal gateway, the Buland Darwaza shape. */
  arch: () => (
    <>
      <Sun cx={330} cy={58} r={22} />
      <rect x="70" y="80" width="260" height="126" fill={INK} />
      <path d="M70 80 L200 40 L330 80 Z" fill={INK_2} />
      {/* Chhatris along the top */}
      {[110, 200, 290].map((x) => (
        <g key={x}>
          <rect x={x - 12} y="62" width="24" height="18" fill={INK_2} />
          <path d={`M${x - 14} 62 Q${x} 44 ${x + 14} 62 Z`} fill={MARIGOLD} opacity="0.8" />
        </g>
      ))}
      {/* Great iwan */}
      <path d="M148 206 L148 132 Q200 84 252 132 L252 206 Z" fill={MARIGOLD} opacity="0.92" />
      <path d="M166 206 L166 142 Q200 108 234 142 L234 206 Z" fill="#7a4a06" />
      {/* Side niches */}
      {[104, 296].map((x) => (
        <path key={x} d={`M${x - 14} 206 L${x - 14} 150 Q${x} 130 ${x + 14} 150 L${x + 14} 206 Z`}
              fill={INK_2} />
      ))}
      <Ground />
      {[40, 360].map((x) => (
        <path key={x} d={`M${x} 206 q -9 -32 0 -50 q 9 18 0 50`} fill={PEACOCK} />
      ))}
    </>
  ),

  /* Hill stations: ridge lines and deodars. */
  mountains: () => (
    <>
      <Sun cx={310} cy={54} r={24} />
      <path d="M0 206 L90 106 L160 206 Z" fill={INK_2} opacity="0.75" />
      <path d="M96 206 L200 74 L306 206 Z" fill={INK} />
      <path d="M240 206 L320 118 L400 206 Z" fill={INK_2} opacity="0.85" />
      {/* Snow caps */}
      <path d="M200 74 L224 104 L212 100 L200 108 L188 100 L176 104 Z" fill={CREAM} />
      <path d="M90 106 L106 126 L98 123 L90 129 L82 123 L74 126 Z" fill={CREAM} opacity="0.9" />
      <Ground y={206} fill="#243d2a" />
      {/* Deodars */}
      {[36, 74, 330, 366].map((x, i) => (
        <g key={x}>
          <rect x={x - 2} y="192" width="4" height="22" fill="#3b2a14" />
          <path d={`M${x} 154 l16 40 h-32 Z`} fill={PEACOCK} opacity={0.85 - i * 0.06} />
        </g>
      ))}
    </>
  ),

  /* Our coach, side on. */
  bus: () => (
    <>
      <Sun cx={340} cy={56} r={22} />
      <path d="M0 176 Q 100 162 200 172 T 400 168 L400 200 L0 200 Z" fill={SAND} />
      <rect x="0" y="200" width="400" height="60" fill="#3a3547" />
      <path d="M0 226 h40 M70 226 h40 M140 226 h40 M210 226 h40 M280 226 h40 M350 226 h40"
            stroke={MARIGOLD_2} strokeWidth="4" />
      {/* Body */}
      <rect x="34" y="96" width="322" height="84" rx="16" fill={INK} />
      <rect x="34" y="96" width="322" height="84" rx="16" fill="none" stroke={MARIGOLD} strokeWidth="3" />
      {/* Destination board */}
      <rect x="52" y="104" width="86" height="16" rx="4" fill="#120c26" />
      <rect x="58" y="110" width="74" height="4" rx="2" fill={MARIGOLD} />
      {/* Windows */}
      {[64, 116, 168, 220, 272].map((x) => (
        <rect key={x} x={x} y="128" width="42" height="28" rx="5" fill="#cfe3f5" opacity="0.92" />
      ))}
      {/* Windscreen */}
      <path d="M324 128 h22 a8 8 0 0 1 8 8 v20 h-30 Z" fill="#cfe3f5" opacity="0.92" />
      {/* Stripe */}
      <rect x="34" y="164" width="322" height="7" fill={MARIGOLD} />
      {/* Wheels */}
      {[96, 300].map((x) => (
        <g key={x}>
          <circle cx={x} cy="182" r="20" fill="#1a1030" />
          <circle cx={x} cy="182" r="8" fill="#8d87a0" />
        </g>
      ))}
    </>
  ),

  car: () => (
    <>
      <Sun cx={336} cy={58} r={20} />
      <path d="M0 178 Q 120 166 240 174 T 400 170 L400 200 L0 200 Z" fill={SAND} />
      <rect x="0" y="200" width="400" height="60" fill="#3a3547" />
      <path d="M0 228 h44 M78 228 h44 M156 228 h44 M234 228 h44 M312 228 h44"
            stroke={MARIGOLD_2} strokeWidth="4" />
      {/* Body */}
      <path d="M52 178 L60 146 Q66 132 88 130 L250 126 Q276 126 292 142 L330 156 Q346 160 346 174 L346 178 Z"
            fill={INK} />
      {/* Glass */}
      <path d="M96 140 L104 158 H176 V138 Z" fill="#cfe3f5" opacity="0.92" />
      <path d="M190 138 V158 H274 L252 138 Z" fill="#cfe3f5" opacity="0.92" />
      <rect x="52" y="164" width="294" height="6" fill={MARIGOLD} opacity="0.9" />
      {/* Lamps */}
      <circle cx="340" cy="164" r="6" fill={MARIGOLD_2} />
      <circle cx="56" cy="164" r="5" fill="#b8392e" />
      {[112, 288].map((x) => (
        <g key={x}>
          <circle cx={x} cy="180" r="19" fill="#1a1030" />
          <circle cx={x} cy="180" r="7.5" fill="#8d87a0" />
        </g>
      ))}
    </>
  ),

  bike: () => (
    <>
      <Sun cx={334} cy={58} r={20} />
      <path d="M0 182 Q 130 172 260 178 T 400 174 L400 202 L0 202 Z" fill={SAND} />
      <rect x="0" y="202" width="400" height="58" fill="#3a3547" />
      <path d="M0 228 h50 M90 228 h50 M180 228 h50 M270 228 h50" stroke={MARIGOLD_2} strokeWidth="4" />
      {/* Wheels */}
      {[112, 288].map((x) => (
        <g key={x}>
          <circle cx={x} cy="176" r="26" fill="none" stroke="#1a1030" strokeWidth="9" />
          <circle cx={x} cy="176" r="6" fill="#8d87a0" />
        </g>
      ))}
      {/* Deck and body */}
      <path d="M112 176 L136 176 L150 150 L214 148 L236 168 L288 176 L288 168 L246 158 L226 134 L146 136 L126 166 Z"
            fill={INK} />
      <path d="M150 150 Q186 136 226 138 L236 160 L154 164 Z" fill={INK_2} />
      {/* Seat */}
      <path d="M164 136 q34 -12 62 -2 l2 8 q-32 -8 -62 2 Z" fill="#241a3b" />
      {/* Handlebar and front shield */}
      <path d="M282 176 L262 122 L296 116" stroke={INK} strokeWidth="9" fill="none" strokeLinecap="round" />
      <path d="M258 130 q22 -6 30 4 l-8 26 q-16 -8 -28 -6 Z" fill={MARIGOLD} />
      <circle cx="286" cy="140" r="7" fill={MARIGOLD_2} />
      {/* Helmet on the seat, because we include two */}
      <path d="M186 128 a16 16 0 0 1 32 0 z" fill={PEACOCK} />
      <rect x="186" y="126" width="32" height="4" rx="2" fill="#0d5a51" />
    </>
  ),

  room: () => (
    <>
      <rect width="400" height="260" fill="#f7efe1" />
      {/* Back wall and window */}
      <rect x="0" y="0" width="400" height="196" fill="#efe3cf" />
      <rect x="252" y="34" width="112" height="92" rx="6" fill="#cfe3f5" />
      <rect x="252" y="34" width="112" height="92" rx="6" fill="none" stroke={INK} strokeWidth="5" />
      <path d="M308 34 v92 M252 80 h112" stroke={INK} strokeWidth="4" />
      {/* A temple visible through it, because that is the point of the location */}
      <path d="M268 126 L268 104 Q280 84 292 104 L292 126 Z" fill={INK_2} opacity="0.6" />
      {/* Bed */}
      <rect x="28" y="128" width="196" height="16" rx="4" fill={INK} />
      <rect x="34" y="144" width="184" height="42" fill={CREAM} />
      <rect x="34" y="160" width="184" height="10" fill={MARIGOLD} opacity="0.85" />
      <rect x="22" y="96" width="16" height="90" rx="4" fill={INK} />
      <rect x="214" y="112" width="14" height="74" rx="4" fill={INK} />
      {/* Pillows */}
      <rect x="44" y="132" width="52" height="22" rx="8" fill="#fff" />
      <rect x="104" y="132" width="52" height="22" rx="8" fill="#fff" />
      {/* Side table and lamp */}
      <rect x="242" y="150" width="46" height="36" fill="#8a6a3f" />
      <rect x="262" y="132" width="6" height="18" fill={INK} />
      <path d="M252 132 h26 l-6 -18 h-14 Z" fill={MARIGOLD} />
      {/* Floor */}
      <rect x="0" y="186" width="400" height="74" fill="#c9a877" />
      <rect x="40" y="196" width="220" height="46" rx="6" fill={PEACOCK} opacity="0.35" />
    </>
  ),
};
