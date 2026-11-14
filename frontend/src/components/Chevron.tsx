/** Flèche de menu déroulant : centrée sur le texte, elle pivote quand le menu ou la section s'ouvre. */
export function Chevron({ taille = 16, className = "" }: { taille?: number; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      width={taille}
      height={taille}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 transition-transform duration-200 ease-out group-open:rotate-180 ${className}`}
    >
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}
