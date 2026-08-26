/**
 * Jobs sembrados en devnet por `scripts/seed-demo.ts`. Cubren los estados
 * clave del ciclo (no todos: faltan Created, Refunded y Disputed). Se listan
 * en el dashboard para que cualquiera recorra el flujo sin ser parte de un
 * acuerdo. Direcciones y estados verificados por RPC el 2026-08-25.
 */
export type DemoJob = {
  address: string;
  label: string;
  note: string;
};

export const DEMO_JOBS: readonly DemoJob[] = [
  {
    address: "5C51c6jnpxJGBpBVzDfjpocWWb2gQxogCS3Dw62Zx9bK",
    label: "Funded",
    note: "150 in escrow, waiting for delivery",
  },
  {
    address: "GEuRR4qYY6HmH1XK4DMH4eza4KKnawLdpCrWBV9aVfbC",
    label: "Delivered",
    note: "250 delivered, review window elapsed. The worker can claim",
  },
  {
    address: "Diqr5i19MsKPiYYqydZtqyEfhiWusfMdTMJK8UPNj4kF",
    label: "Released + attested",
    note: "100 paid out and attested through SAS",
  },
  {
    address: "92b9sExjPbGkWsEqvmnmax2VdUAbit6qVThZVGQ2VoRW",
    label: "Released",
    note: "100 paid out, fee to treasury",
  },
  {
    address: "G8yZcYFG4fvvWvxM8BpMJZtYWRkqPnyhcTSR4ZWqoG4e",
    label: "Resolved",
    note: "50 split by the arbiter; disputed before any delivery",
  },
] as const;
