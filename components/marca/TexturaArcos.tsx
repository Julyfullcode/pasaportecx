export function TexturaArcos() {
  return (
    <svg aria-hidden="true" viewBox="0 0 700 500" className="pointer-events-none absolute inset-0 h-full w-full opacity-20">
      <g fill="none" stroke="white" strokeWidth="2">
        <circle cx="620" cy="30" r="90" />
        <circle cx="620" cy="30" r="150" />
        <circle cx="620" cy="30" r="220" />
        <path d="M20 430c100-170 200-170 300 0s200 170 300 0" />
      </g>
      <g fill="white" opacity=".6">
        {Array.from({ length: 28 }).map((_, i) => (
          <circle key={i} cx={40 + (i % 7) * 27} cy={35 + Math.floor(i / 7) * 27} r="2.5" />
        ))}
      </g>
    </svg>
  );
}
