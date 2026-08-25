/**
 * Logotipo de Solana. Geometría oficial (tres barras inclinadas) con el
 * degradado de marca púrpura → verde menta.
 *
 * Se usa como señal de ecosistema, no como sello de aprobación: RepuLink está
 * construido sobre Solana, no respaldado por la Solana Foundation.
 */
export function SolanaMark({
  className = "h-4 w-auto",
}: {
  className?: string;
}) {
  const id = "sol-grad";
  return (
    <svg
      viewBox="0 0 397.7 311.7"
      className={className}
      role="img"
      aria-label="Solana"
      fill={`url(#${id})`}
    >
      <defs>
        <linearGradient
          id={id}
          x1="360.9"
          y1="-37.5"
          x2="141.2"
          y2="383.3"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#00FFA3" />
          <stop offset="1" stopColor="#DC1FFF" />
        </linearGradient>
      </defs>
      <path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z" />
      <path d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z" />
      <path d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z" />
    </svg>
  );
}

/**
 * Las tres barras de Solana usadas como recurso estructural: divisor, textura
 * de sección o acento. Toma el color del texto para no competir con la marca.
 */
export function SolanaBars({
  className = "h-3 w-auto",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 397.7 311.7"
      className={className}
      fill="currentColor"
      aria-hidden
    >
      <path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z" />
      <path d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z" />
      <path d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z" />
    </svg>
  );
}
