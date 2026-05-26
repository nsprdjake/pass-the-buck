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
// Trophy
// =========================================================
export function Trophy({ size = 64, color = "#FBBF24", className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="trophy-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="50%" stopColor={color} />
          <stop offset="100%" stopColor="#92580A" />
        </linearGradient>
      </defs>
      {/* shadow */}
      <ellipse cx="32" cy="59" rx="18" ry="2.5" fill="#000" opacity={0.35} />
      {/* base plate */}
      <rect x="20" y="52" width="24" height="5" rx="1.5" fill="url(#trophy-grad)" stroke="#5C3604" strokeWidth="1" />
      {/* stem */}
      <rect x="28" y="42" width="8" height="11" fill="url(#trophy-grad)" stroke="#5C3604" strokeWidth="1" />
      {/* cup */}
      <path
        d="M 14 8 L 50 8 L 48 26 Q 48 42 32 44 Q 16 42 16 26 Z"
        fill="url(#trophy-grad)"
        stroke="#5C3604"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {/* left handle */}
      <path
        d="M 14 12 Q 4 14 4 22 Q 4 30 14 30"
        fill="none"
        stroke="url(#trophy-grad)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M 14 12 Q 4 14 4 22 Q 4 30 14 30"
        fill="none"
        stroke="#5C3604"
        strokeWidth="1"
        strokeLinecap="round"
        opacity={0.7}
      />
      {/* right handle */}
      <path
        d="M 50 12 Q 60 14 60 22 Q 60 30 50 30"
        fill="none"
        stroke="url(#trophy-grad)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M 50 12 Q 60 14 60 22 Q 60 30 50 30"
        fill="none"
        stroke="#5C3604"
        strokeWidth="1"
        strokeLinecap="round"
        opacity={0.7}
      />
      {/* cup top highlight */}
      <ellipse cx="32" cy="9" rx="17" ry="2" fill="#FFFAE0" opacity={0.7} />
      {/* "1" badge */}
      <circle cx="32" cy="22" r="7" fill="#5C3604" />
      <text
        x="32"
        y="27"
        textAnchor="middle"
        fontSize="13"
        fontWeight="900"
        fill="#FDE68A"
        style={{ fontFamily: "Georgia, serif" }}
      >
        1
      </text>
    </svg>
  );
}

// =========================================================
// Phone
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
        <linearGradient id="phone-body" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3F3F46" />
          <stop offset="100%" stopColor="#18181B" />
        </linearGradient>
      </defs>
      {/* shadow */}
      <ellipse cx="32" cy="62" rx="20" ry="2" fill="#000" opacity={0.35} />
      {/* body */}
      <rect
        x="14"
        y="4"
        width="36"
        height="58"
        rx="7"
        fill="url(#phone-body)"
        stroke="#000"
        strokeWidth="1"
      />
      {/* screen */}
      <rect
        x="17"
        y="11"
        width="30"
        height="44"
        rx="2"
        fill={color}
        opacity={0.95}
      />
      {/* speaker dot */}
      <rect x="28" y="7" width="8" height="2" rx="1" fill="#000" />
      {/* home indicator */}
      <rect x="27" y="58" width="10" height="2" rx="1" fill="#71717A" />
      {/* screen content — abstract chip */}
      <circle cx="32" cy="30" r="9" fill="#FBBF24" opacity={0.85} />
      <text
        x="32"
        y="34"
        textAnchor="middle"
        fontSize="10"
        fontWeight="900"
        fill="#0E7A4F"
      >
        $
      </text>
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
