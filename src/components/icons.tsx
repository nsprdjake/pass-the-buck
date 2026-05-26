type IconProps = {
  size?: number;
  color?: string;
  className?: string;
};

// =========================================================
// ArrowLeft
// =========================================================
export function ArrowLeft({ size = 24, color = "currentColor", className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M 13 4 L 4 16 L 13 28 L 17 28 L 10 19 L 28 19 L 28 13 L 10 13 L 17 4 Z"
        fill={color}
        stroke="#000"
        strokeOpacity={0.3}
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// =========================================================
// ArrowRight (mirror of left)
// =========================================================
export function ArrowRight({ size = 24, color = "currentColor", className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M 19 4 L 28 16 L 19 28 L 15 28 L 22 19 L 4 19 L 4 13 L 22 13 L 15 4 Z"
        fill={color}
        stroke="#000"
        strokeOpacity={0.3}
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// =========================================================
// ArrowDown
// =========================================================
export function ArrowDown({ size = 24, color = "currentColor", className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M 4 13 L 16 24 L 28 13 L 22 13 L 22 4 L 10 4 L 10 13 Z"
        fill={color}
        stroke="#000"
        strokeOpacity={0.3}
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// =========================================================
// Asterisk — 6-point flower/sparkle
// =========================================================
export function Asterisk({ size = 24, color = "currentColor", className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g
        fill={color}
        stroke="#000"
        strokeOpacity={0.3}
        strokeWidth="1"
        strokeLinejoin="round"
      >
        {[0, 60, 120].map((deg) => (
          <rect
            key={deg}
            x="14"
            y="3"
            width="4"
            height="26"
            rx="2"
            transform={`rotate(${deg} 16 16)`}
          />
        ))}
        <circle cx="16" cy="16" r="3.5" />
      </g>
    </svg>
  );
}

// =========================================================
// Trophy — rendered as a sheriff's star "Champion" badge for the
// Western theme. Five points, brass gradient, "CHAMPION" banner across.
// =========================================================
export function Trophy({ size = 64, className }: IconProps) {
  // Build a 5-point star path (radius pulled in slightly for a chunkier look).
  const outerR = 28;
  const innerR = 13;
  const cx = 32;
  const cy = 32;
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const ang = -Math.PI / 2 + (Math.PI / 5) * i;
    pts.push(`${cx + r * Math.cos(ang)},${cy + r * Math.sin(ang)}`);
  }
  const starPath = `M ${pts.join(" L ")} Z`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="star-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFE3A0" />
          <stop offset="55%" stopColor="#c99a33" />
          <stop offset="100%" stopColor="#5c3c0e" />
        </linearGradient>
        <linearGradient id="ribbon-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#a53d1f" />
          <stop offset="100%" stopColor="#5e1a0a" />
        </linearGradient>
      </defs>
      {/* shadow */}
      <ellipse cx="32" cy="60" rx="22" ry="2.5" fill="#000" opacity={0.4} />

      {/* star */}
      <path
        d={starPath}
        fill="url(#star-grad)"
        stroke="#2a1a0a"
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      {/* inner star outline for depth */}
      <path
        d={starPath}
        fill="none"
        stroke="#5c3c0e"
        strokeWidth={0.8}
        strokeOpacity={0.7}
        transform="scale(0.78) translate(9 9)"
      />
      {/* center bead */}
      <circle cx={cx} cy={cy - 1} r={5.5} fill="#5c3c0e" stroke="#2a1a0a" strokeWidth={0.8} />
      <text
        x={cx}
        y={cy + 2.5}
        textAnchor="middle"
        fontSize="7.5"
        fontWeight="900"
        fill="#FFE3A0"
        style={{ fontFamily: "var(--font-rye), Georgia, serif" }}
      >
        1
      </text>

      {/* "CHAMPION" ribbon across the lower half */}
      <g>
        <path
          d="M 4 44 L 60 44 L 56 52 L 8 52 Z"
          fill="url(#ribbon-grad)"
          stroke="#2a1a0a"
          strokeWidth={1.4}
          strokeLinejoin="round"
        />
        {/* ribbon tails */}
        <path d="M 4 44 L 1 50 L 7 49 L 8 52 Z" fill="#7a2412" stroke="#2a1a0a" strokeWidth={1.2} strokeLinejoin="round" />
        <path d="M 60 44 L 63 50 L 57 49 L 56 52 Z" fill="#7a2412" stroke="#2a1a0a" strokeWidth={1.2} strokeLinejoin="round" />
        <text
          x={cx}
          y={50.5}
          textAnchor="middle"
          fontSize="6.6"
          fontWeight="700"
          fill="#FFE3A0"
          style={{
            fontFamily: "var(--font-rye), Georgia, serif",
            letterSpacing: "0.2em",
          }}
        >
          CHAMPION
        </text>
      </g>

      {/* tiny ball studs at each star point */}
      {Array.from({ length: 5 }).map((_, i) => {
        const ang = -Math.PI / 2 + (Math.PI * 2 / 5) * i;
        const x = cx + (outerR - 1.5) * Math.cos(ang);
        const y = cy + (outerR - 1.5) * Math.sin(ang);
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={1.6}
            fill="#FFE3A0"
            stroke="#2a1a0a"
            strokeWidth={0.45}
          />
        );
      })}
    </svg>
  );
}

// =========================================================
// Saloon Doors — used in place of "phone" for pass-the-device flows.
// Two slatted swinging doors slightly ajar.
// =========================================================
export function Phone({ size = 64, color = "currentColor", className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="door-grad-l" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#5c3b1e" />
          <stop offset="100%" stopColor="#8b5a2b" />
        </linearGradient>
        <linearGradient id="door-grad-r" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8b5a2b" />
          <stop offset="100%" stopColor="#5c3b1e" />
        </linearGradient>
      </defs>

      {/* Frame top and bottom rails */}
      <rect x="2" y="6" width="60" height="3" fill="#3a2410" stroke="#1a0c04" strokeWidth="0.6" />
      <rect x="2" y="55" width="60" height="3" fill="#3a2410" stroke="#1a0c04" strokeWidth="0.6" />

      {/* Floor shadow */}
      <ellipse cx="32" cy="61" rx="22" ry="1.4" fill="#000" opacity={0.45} />

      {/* LEFT door — slightly tilted outward, hinged at the top */}
      <g transform="rotate(-6 8 12)">
        <rect
          x="8"
          y="12"
          width="22"
          height="40"
          rx="1"
          fill="url(#door-grad-l)"
          stroke="#1a0c04"
          strokeWidth="1.2"
        />
        {/* horizontal slats */}
        {[18, 24, 30, 36, 42, 48].map((y) => (
          <line
            key={y}
            x1="9"
            y1={y}
            x2="29"
            y2={y}
            stroke="#1a0c04"
            strokeOpacity={0.55}
            strokeWidth={0.6}
          />
        ))}
        {/* tiny iron handle */}
        <circle cx="26" cy="32" r="1.2" fill="#2a1a0a" />
      </g>

      {/* RIGHT door — mirrored tilt */}
      <g transform="rotate(6 56 12)">
        <rect
          x="34"
          y="12"
          width="22"
          height="40"
          rx="1"
          fill="url(#door-grad-r)"
          stroke="#1a0c04"
          strokeWidth="1.2"
        />
        {[18, 24, 30, 36, 42, 48].map((y) => (
          <line
            key={y}
            x1="35"
            y1={y}
            x2="55"
            y2={y}
            stroke="#1a0c04"
            strokeOpacity={0.55}
            strokeWidth={0.6}
          />
        ))}
        <circle cx="38" cy="32" r="1.2" fill="#2a1a0a" />
      </g>

      {/* small accent color on top frame */}
      <rect x="14" y="3" width="36" height="2" rx="0.5" fill={color} opacity={0.6} />
    </svg>
  );
}

// =========================================================
// Skip (double-fast-forward)
// =========================================================
export function Skip({ size = 32, color = "currentColor", className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M 4 6 L 16 16 L 4 26 Z M 16 6 L 28 16 L 16 26 Z"
        fill={color}
        stroke="#000"
        strokeOpacity={0.35}
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// =========================================================
// Sparkle / 4-point star
// =========================================================
export function Sparkle({ size = 18, color = "currentColor", className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M 12 2 L 13.8 10.2 L 22 12 L 13.8 13.8 L 12 22 L 10.2 13.8 L 2 12 L 10.2 10.2 Z"
        fill={color}
        stroke="#000"
        strokeOpacity={0.3}
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// =========================================================
// Lightning bolt (for "fast")
// =========================================================
export function Bolt({ size = 18, color = "currentColor", className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M 14 2 L 4 14 L 11 14 L 9 22 L 20 9 L 13 9 Z"
        fill={color}
        stroke="#000"
        strokeOpacity={0.35}
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// =========================================================
// Smile (for "fun")
// =========================================================
export function Smile({ size = 18, color = "currentColor", className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="12" cy="12" r="10" fill={color} stroke="#000" strokeOpacity={0.3} strokeWidth="0.5" />
      <circle cx="8" cy="10" r="1.5" fill="#000" />
      <circle cx="16" cy="10" r="1.5" fill="#000" />
      <path
        d="M 7 14 Q 12 19 17 14"
        fill="none"
        stroke="#000"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// =========================================================
// Bill stack (replaces 💵 on the home page)
// =========================================================
export function BillStack({ size = 96, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size * 0.85}
      viewBox="0 0 120 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="bill-stack-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2EAA72" />
          <stop offset="60%" stopColor="#1F8F5C" />
          <stop offset="100%" stopColor="#0E7A4F" />
        </linearGradient>
      </defs>
      {/* shadow */}
      <ellipse cx="60" cy="96" rx="42" ry="3" fill="#000" opacity={0.35} />

      {/* Back bill (rotated) */}
      <g transform="translate(8 36) rotate(-12 50 22)">
        <rect width="100" height="44" rx="5" fill="url(#bill-stack-grad)" stroke="#0A5E3B" strokeWidth="1.2" />
        <rect x="3" y="3" width="94" height="38" rx="3" fill="none" stroke="#0A5E3B" strokeOpacity={0.6} strokeWidth="0.6" />
        <circle cx="50" cy="22" r="12" fill="#FBBF24" stroke="#5C3604" strokeWidth="0.8" />
        <text x="50" y="28" textAnchor="middle" fontSize="14" fontWeight="900" fill="#3D2A05" style={{ fontFamily: "Georgia, serif" }}>$</text>
      </g>

      {/* Middle bill */}
      <g transform="translate(12 28) rotate(6 50 22)">
        <rect width="100" height="44" rx="5" fill="url(#bill-stack-grad)" stroke="#0A5E3B" strokeWidth="1.2" />
        <rect x="3" y="3" width="94" height="38" rx="3" fill="none" stroke="#0A5E3B" strokeOpacity={0.6} strokeWidth="0.6" />
        <text x="10" y="30" fontSize="20" fontWeight="900" fill="#FFFFFF" style={{ fontFamily: "Georgia, serif" }}>1</text>
        <text x="80" y="30" fontSize="20" fontWeight="900" fill="#FFFFFF" style={{ fontFamily: "Georgia, serif" }}>1</text>
        <circle cx="50" cy="22" r="12" fill="#FBBF24" stroke="#5C3604" strokeWidth="0.8" />
        <text x="50" y="28" textAnchor="middle" fontSize="14" fontWeight="900" fill="#3D2A05" style={{ fontFamily: "Georgia, serif" }}>$</text>
      </g>

      {/* Front bill */}
      <g transform="translate(10 16) rotate(-3 50 22)">
        <rect width="100" height="44" rx="5" fill="url(#bill-stack-grad)" stroke="#0A5E3B" strokeWidth="1.4" />
        <rect x="3" y="3" width="94" height="38" rx="3" fill="none" stroke="#0A5E3B" strokeOpacity={0.7} strokeWidth="0.7" />
        <text x="10" y="30" fontSize="20" fontWeight="900" fill="#FFFFFF" style={{ fontFamily: "Georgia, serif", filter: "drop-shadow(0 1px 0 rgba(0,0,0,0.45))" }}>1</text>
        <text x="80" y="30" fontSize="20" fontWeight="900" fill="#FFFFFF" style={{ fontFamily: "Georgia, serif", filter: "drop-shadow(0 1px 0 rgba(0,0,0,0.45))" }}>1</text>
        <circle cx="50" cy="22" r="13" fill="#FBBF24" stroke="#5C3604" strokeWidth="1" />
        <text x="50" y="29" textAnchor="middle" fontSize="16" fontWeight="900" fill="#3D2A05" style={{ fontFamily: "Georgia, serif" }}>$</text>
      </g>
    </svg>
  );
}

// =========================================================
// Block / NoEntry (game not found)
// =========================================================
export function NoEntry({ size = 64, color = "#F97066", className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="32" cy="32" r="28" fill="none" stroke={color} strokeWidth="6" />
      <rect x="14" y="29" width="36" height="6" rx="2" fill={color} />
    </svg>
  );
}

// =========================================================
// Bell (used for the "nudge" button)
// =========================================================
export function Bell({ size = 24, color = "#FFE3A0", className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="bell-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffe3a0" />
          <stop offset="60%" stopColor={color} />
          <stop offset="100%" stopColor="#8a6720" />
        </linearGradient>
      </defs>
      {/* yoke ring at top */}
      <rect x="14" y="2" width="4" height="3" rx="1" fill="#2a1a0a" />
      {/* bell body */}
      <path
        d="M 8 22
           Q 8 10 16 8
           Q 24 10 24 22
           L 26 25
           L 6 25 Z"
        fill="url(#bell-grad)"
        stroke="#2a1a0a"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* slot lines */}
      <line x1="11" y1="16" x2="11" y2="22" stroke="#2a1a0a" strokeOpacity={0.4} strokeWidth="0.8" />
      <line x1="21" y1="16" x2="21" y2="22" stroke="#2a1a0a" strokeOpacity={0.4} strokeWidth="0.8" />
      {/* highlight */}
      <path
        d="M 11 12 Q 14 9 16 9"
        stroke="#ffffff"
        strokeOpacity={0.6}
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
      />
      {/* clapper */}
      <circle cx="16" cy="27" r="2.4" fill="url(#bell-grad)" stroke="#2a1a0a" strokeWidth="1" />
      {/* tiny motion lines */}
      <path d="M 5 14 L 3 13 M 5 18 L 2 18" stroke="#FFE3A0" strokeWidth="1.1" strokeLinecap="round" opacity={0.7} />
      <path d="M 27 14 L 29 13 M 27 18 L 30 18" stroke="#FFE3A0" strokeWidth="1.1" strokeLinecap="round" opacity={0.7} />
    </svg>
  );
}

// =========================================================
// MoneyBag (for pot label / 💰)
// =========================================================
export function MoneyBag({ size = 28, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="bag-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="100%" stopColor="#92580A" />
        </linearGradient>
      </defs>
      {/* bag body */}
      <path
        d="M 8 12 Q 6 14 6 18 Q 6 28 16 28 Q 26 28 26 18 Q 26 14 24 12 Z"
        fill="url(#bag-grad)"
        stroke="#3D2A05"
        strokeWidth="1"
      />
      {/* tie at top */}
      <path
        d="M 10 12 L 22 12 L 20 6 L 12 6 Z"
        fill="#3D2A05"
        stroke="#3D2A05"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      {/* $ */}
      <text
        x="16"
        y="23"
        textAnchor="middle"
        fontSize="11"
        fontWeight="900"
        fill="#3D2A05"
        style={{ fontFamily: "Georgia, serif" }}
      >
        $
      </text>
    </svg>
  );
}
