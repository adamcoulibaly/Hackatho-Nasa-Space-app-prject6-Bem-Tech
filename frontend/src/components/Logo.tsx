export function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <clipPath id="forosat-logo-clip"><circle cx="32" cy="32" r="21" /></clipPath>
      </defs>
      <g clipPath="url(#forosat-logo-clip)">
        <rect x="0" y="0" width="64" height="31" fill="#F77F00" />
        {[34, 41, 48, 55].map((y) => (
          <rect key={y} x="0" y={y} width="64" height="4" fill="#009E60" />
        ))}
      </g>
      <ellipse cx="32" cy="32" rx="30" ry="8.5" fill="none" stroke="#F4F6F1" strokeWidth="2" transform="rotate(-22 32 32)" />
      <circle cx="57" cy="18.7" r="2.8" fill="#F4F6F1" />
    </svg>
  );
}
