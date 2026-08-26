import { SolanaMark } from "../brand/SolanaMark";

const PROGRAM_ID = "2mMN1jtUGZo6j9Fmq46JUTJ7639bV1aEvTXoxtu4ZtH1";

/**
 * Pie del producto. Todo lo que enlaza es verificable: el programa desplegado,
 * el registro de atestaciones y el repositorio. Nada de enlaces de relleno.
 */
export function Footer() {
  return (
    <footer className="relative z-10 mt-24 border-t border-border-low">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xs space-y-3">
          <div className="flex items-center gap-2">
            <img
              src="/logo-repulink-128.png"
              alt=""
              className="h-6 w-6 rounded-md object-cover"
            />
            <span className="font-heading text-sm font-bold tracking-tight text-foreground">
              Repu<span className="text-primary">Link</span>
            </span>
          </div>
          <p className="text-xs leading-relaxed text-muted/70">
            Escrow and verifiable outcomes for agreements between two parties.
            Devnet preview, unaudited.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <SolanaMark className="h-3 w-auto" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted/60">
              Built on Solana
            </span>
          </div>
        </div>

        <nav className="grid grid-cols-2 gap-x-12 gap-y-6 text-sm sm:grid-cols-2">
          <div className="space-y-2.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted/60">
              On-chain
            </p>
            <FooterLink
              href={`https://explorer.solana.com/address/${PROGRAM_ID}?cluster=devnet`}
            >
              Program
            </FooterLink>
            <FooterLink href="https://attest.solana.com">
              Attestation Service
            </FooterLink>
          </div>
          <div className="space-y-2.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted/60">
              Project
            </p>
            <FooterLink href="https://github.com/YhonaPeguero/RepuLink">
              Source
            </FooterLink>
            <FooterLink href="/dashboard" external={false}>
              Agreements
            </FooterLink>
          </div>
        </nav>
      </div>
    </footer>
  );
}

function FooterLink({
  href,
  children,
  external = true,
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      className="block text-xs text-muted transition-colors duration-[--dur-micro] hover:text-primary-light"
    >
      {children}
    </a>
  );
}
