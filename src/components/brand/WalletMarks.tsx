import solflareLogo from "../../assets/solflare-logo.jpg";
import backpackLogo from "../../assets/backpack-logo.jpg";

/**
 * Marcas de las wallets de Solana más habituales.
 *
 * Cuando la wallet está instalada se usa SIEMPRE el icono real que expone la
 * extensión (`connector.icon`). Esto son recreaciones para el caso en que no lo
 * está y no hay icono que pedirle a nadie.
 */

export function PhantomMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <rect width="40" height="40" rx="10" fill="#AB9FF2" />
      <path
        d="M31.4 20.2c0 6.3-5.1 11.4-11.4 11.4-.9 0-1.5-.8-1.2-1.6.3-1 .5-2 .3-2.6-.5-1.4-2.5-.4-3.4.9-1 1.4-2.2 2.6-3.6 2.6-1.8 0-3.1-1.6-3.1-4 0-6.4 5.6-12.3 12.6-12.3 5.7 0 9.8 2.7 9.8 5.6z"
        fill="#fff"
      />
      <ellipse cx="21.6" cy="19.4" rx="1.5" ry="2.2" fill="#AB9FF2" />
      <ellipse cx="26.4" cy="19.4" rx="1.5" ry="2.2" fill="#AB9FF2" />
    </svg>
  );
}

export function SolflareMark({
  className = "h-6 w-6",
}: {
  className?: string;
}) {
  return (
    <img
      src={solflareLogo}
      alt=""
      className={`${className} rounded-md object-cover`}
    />
  );
}

export function BackpackMark({
  className = "h-6 w-6",
}: {
  className?: string;
}) {
  return (
    <img
      src={backpackLogo}
      alt=""
      className={`${className} rounded-md object-cover`}
    />
  );
}

export const WALLET_MARKS = {
  Phantom: PhantomMark,
  Solflare: SolflareMark,
  Backpack: BackpackMark,
} as const;
