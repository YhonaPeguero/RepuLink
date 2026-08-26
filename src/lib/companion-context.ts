import { JobState } from "../generated/repulink/types/jobState";

/**
 * Qué decir en cada pantalla.
 *
 * Es una función pura: ruta + estado del acuerdo → qué explicar y qué ofrecer.
 * No hay modelo de lenguaje detrás, y es deliberado. Un LLM en el navegador
 * necesitaría una clave expuesta o un backend que no existe, añadiría latencia
 * en mitad de la grabación y, sobre todo, podría inventarse cosas sobre un
 * acuerdo con dinero dentro. Todo lo que dice el companion sale del estado real
 * de la cadena o del propio programa, así que no puede alucinar.
 *
 * Las acciones son deterministas: navegar o abrir una explicación. Nunca firma,
 * nunca libera fondos, nunca arbitra, nunca muta estado.
 */

export type CompanionAction =
  | { kind: "navigate"; label: string; to: string }
  | { kind: "explain"; label: string; topic: TopicKey }
  | { kind: "external"; label: string; href: string };

export type CompanionMessage = {
  /** Una frase, en presente, sobre lo que el usuario está viendo. */
  headline: string;
  /** Contexto breve. Opcional: a veces el titular basta. */
  body?: string;
  actions: CompanionAction[];
  /** Color de estado, para que el companion hable el mismo idioma que la UI. */
  tone: "brand" | "funded" | "active" | "done" | "idle" | "alert";
};

export type TopicKey =
  | "escrow"
  | "states"
  | "reputation"
  | "attestation"
  | "dispute"
  | "fee"
  | "wallet";

export const TOPICS: Record<TopicKey, { title: string; body: string }> = {
  escrow: {
    title: "How the escrow works",
    body: "The payer deposits into a vault owned by the agreement's own program address. Nobody can transfer out of it by hand: funds only move through the payout, refund and dispute paths of the state machine, and every one of them checks a signature.",
  },
  states: {
    title: "The four states",
    body: "Created, then Funded once the money is in, then Delivered when the worker marks the delivery, then Released when the payer approves or the worker claims after the review window. A dispute and a refund are the two ways out of that line.",
  },
  reputation: {
    title: "Where reputation comes from",
    body: "Only from agreements that were funded on-chain and released. Nothing here is declared by the wallet itself. Resolved disputes are listed separately and never counted as completed work, because a dispute can be opened before any delivery.",
  },
  attestation: {
    title: "What an attestation is",
    body: "A credential in the Solana Attestation Service, signed by RepuLink, tied to the worker's wallet. It lives in a registry RepuLink does not own, so the record outlives the platform. It is issued after release, as a separate step, so a released agreement can stay unattested.",
  },
  dispute: {
    title: "How disputes end",
    body: "Either party can dispute while funds are escrowed. An arbiter then splits the vault and the outcome is final. The arbiter can award any share, including nothing, which is why a resolved dispute is not the same as completed work.",
  },
  fee: {
    title: "The 1% fee",
    body: "Frozen into each agreement when it is created, so a later config change never alters the economics of an agreement already in flight. On release the fee goes to the treasury and the remainder to the worker.",
  },
  wallet: {
    title: "About your wallet",
    body: "RepuLink holds no keys and creates no account. Any Solana wallet implementing the Wallet Standard works. Every transaction is signed by you, in your wallet.",
  },
};

const STATE_MESSAGE: Record<JobState, Omit<CompanionMessage, "actions">> = {
  [JobState.Created]: {
    headline: "This agreement exists but holds no money yet.",
    body: "Nothing is at stake until the payer funds the vault.",
    tone: "idle",
  },
  [JobState.Funded]: {
    headline: "The money is locked in the vault.",
    body: "The worker can now deliver. Until then the payer can still cancel and get the full amount back, with no fee.",
    tone: "funded",
  },
  [JobState.Delivered]: {
    headline: "Delivered. The payer can now release the funds.",
    body: "If the review window elapses without a decision, the worker can claim the payout instead.",
    tone: "active",
  },
  [JobState.Released]: {
    headline: "Settled. The vault is empty and the outcome is final.",
    body: "This is what a verifiable track record is built from.",
    tone: "done",
  },
  [JobState.Refunded]: {
    headline: "Cancelled. The full amount went back to the payer.",
    body: "No fee was charged. A cancelled agreement is not work history.",
    tone: "idle",
  },
  [JobState.Disputed]: {
    headline: "In dispute. The vault is frozen until an arbiter decides.",
    body: "Nothing releases on a timer while a dispute is open.",
    tone: "alert",
  },
  [JobState.Resolved]: {
    headline: "An arbiter split the vault and the outcome is final.",
    body: "This is a dispute outcome, not completed work.",
    tone: "done",
  },
};

export type RouteContext = {
  pathname: string;
  jobState?: JobState;
  /** Dirección del trabajador, para poder saltar a su historial. */
  jobFreelancer?: string;
  isConnected: boolean;
};

/** Qué mostrar ahora mismo. Sin efectos, sin red: solo lo que ya sabemos. */
export function messageFor(ctx: RouteContext): CompanionMessage {
  const { pathname, jobState, jobFreelancer, isConnected } = ctx;

  if (pathname.startsWith("/job/") && pathname !== "/job/create") {
    if (jobState === undefined) {
      return {
        headline: "Reading this agreement from the chain.",
        actions: [
          { kind: "explain", label: "How escrow works", topic: "escrow" },
        ],
        tone: "brand",
      };
    }
    const base = STATE_MESSAGE[jobState];
    const actions: CompanionAction[] = [
      { kind: "explain", label: "Explain this state", topic: "states" },
    ];
    if (jobState === JobState.Released || jobState === JobState.Resolved) {
      actions.push({
        kind: "explain",
        label: "What is an attestation",
        topic: "attestation",
      });
    }
    if (jobState === JobState.Disputed) {
      actions.push({
        kind: "explain",
        label: "How disputes end",
        topic: "dispute",
      });
    }
    if (jobFreelancer) {
      actions.push({
        kind: "navigate",
        label: "See their track record",
        to: `/profile/${jobFreelancer}`,
      });
    }
    return { ...base, actions };
  }

  if (pathname === "/job/create") {
    return {
      headline: "You are about to lock money before any work starts.",
      body: "The amount goes into a vault owned by the agreement itself. You keep the right to cancel until the worker delivers.",
      actions: [
        { kind: "explain", label: "How escrow works", topic: "escrow" },
        { kind: "explain", label: "About the 1% fee", topic: "fee" },
      ],
      tone: "funded",
    };
  }

  if (pathname === "/dashboard") {
    return {
      headline: isConnected
        ? "Every agreement where you are the payer or the worker."
        : "Connect a wallet to see your own agreements.",
      body: isConnected
        ? undefined
        : "You can still open any of the public devnet agreements listed below.",
      actions: isConnected
        ? [
            {
              kind: "navigate",
              label: "Start an agreement",
              to: "/job/create",
            },
            { kind: "explain", label: "The four states", topic: "states" },
          ]
        : [
            { kind: "explain", label: "About your wallet", topic: "wallet" },
            { kind: "explain", label: "How escrow works", topic: "escrow" },
          ],
      tone: "brand",
    };
  }

  if (pathname.startsWith("/profile/")) {
    return {
      headline: "This reputation comes from completed on-chain agreements.",
      body: "Not from anything the wallet declared about itself.",
      actions: [
        { kind: "explain", label: "How reputation works", topic: "reputation" },
        {
          kind: "explain",
          label: "What is an attestation",
          topic: "attestation",
        },
      ],
      tone: "done",
    };
  }

  // Landing
  return {
    headline: "Want to see how RepuLink works?",
    body: "Two minutes, no wallet needed. I can walk you through a real settled agreement on devnet.",
    actions: [
      { kind: "explain", label: "How escrow works", topic: "escrow" },
      {
        kind: "navigate",
        label: "See a settled agreement",
        to: "/job/Diqr5i19MsKPiYYqydZtqyEfhiWusfMdTMJK8UPNj4kF",
      },
    ],
    tone: "brand",
  };
}

/**
 * Recorrido guiado para la demo. Cada parada es una ruta real con una frase.
 * No automatiza nada: solo lleva al usuario y le dice qué está mirando.
 */
export const TOUR: { to: string; say: string }[] = [
  { to: "/", say: "RepuLink is escrow with memory. Start here." },
  {
    to: "/job/5C51c6jnpxJGBpBVzDfjpocWWb2gQxogCS3Dw62Zx9bK",
    say: "Funded: the money is in the vault and nobody can take it out by hand.",
  },
  {
    to: "/job/Diqr5i19MsKPiYYqydZtqyEfhiWusfMdTMJK8UPNj4kF",
    say: "Released and attested. This is the whole point: a settled agreement that leaves a credential.",
  },
  {
    to: "/profile/GZo9BpNd96LEG6eayZ4VraWXRRuE942yzHCTqEahQAPm",
    say: "And here is that outcome as reputation, derived from the chain.",
  },
  {
    to: "/job/G8yZcYFG4fvvWvxM8BpMJZtYWRkqPnyhcTSR4ZWqoG4e",
    say: "A dispute an arbiter resolved. Listed for transparency, never counted as completed work.",
  },
];
