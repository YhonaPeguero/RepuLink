# Go-to-market

> Estado: borrador de trabajo, agosto 2026. Este documento existe porque los
> mentores señalaron que el GTM no estaba definido en ninguna parte del
> repositorio. Lo que está marcado como **hipótesis** no está validado todavía.

## Segmento inicial

**Freelancers y clientes crypto-native / web3 que ya cobran en stablecoins.**

Deliberadamente **no** "freelancers de LATAM". El segmento amplio fue una
generalización prematura: quien todavía no tiene wallet ni stablecoins necesita
onboarding fiat, custodia y soporte, y nada de eso está construido. El producto
hoy exige una wallet de navegador y un token SPL, así que el único usuario que
puede completar el flujo sin ayuda es alguien que ya opera on-chain.

Perfil concreto:

- Desarrolladores, diseñadores y creadores de contenido que ya facturan a DAOs,
  protocolos o fundaciones en USDC.
- Contratantes del lado de proyectos web3 pequeños: quien paga de una tesorería
  y hoy resuelve la confianza con "mitad por adelantado, mitad al entregar".

**Por qué este segmento primero:** ya entiende qué es una wallet, ya tolera
devnet/testnet, y ya sufre el problema exacto — el historial de trabajo se
queda en Discord y en DMs, no es portable, y no hay escrow neutral.

## Por qué alguien cambiaría

| Situación hoy                                | Con RepuLink                                                                              |
| -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 50% por adelantado, confianza para el resto  | El total queda bloqueado antes de empezar, en un vault que ninguna de las partes controla |
| Plataforma custodia el dinero y cobra 10–20% | Fee de 1% (`fee_bps=100`, congelado en el Job al crearlo)                                 |
| La reputación vive en la plataforma          | La atestación vive en el Solana Attestation Service, ligada a la wallet                   |
| Disputa = ticket de soporte opaco            | Disputa on-chain; un árbitro reparte el vault y la resolución queda pública               |

## Cómo llegar a ellos — hipótesis a validar

Ordenadas por coste y por lo directo del contacto, no por alcance:

1. **Comunidades donde ya se contrata en on-chain.** Superteam (canales de
   talento y bounties), Discords de protocolos con programas de grants, y
   servidores de trabajo web3. Es donde el problema ya se verbaliza.
2. **Contacto uno a uno para el piloto.** Para los tres primeros acuerdos no
   hace falta escala: hace falta acompañar cada journey. Ver
   [`docs/validation/pilot-template.md`](./validation/pilot-template.md).
3. **El repositorio y la demo como canal.** El README técnico y el demo público
   en devnet son hoy el activo más creíble. Un desarrollador que lo lee ve que
   el escrow es real y que las limitaciones están declaradas.
4. **Contenido de ingeniería.** Escribir sobre lo que se aprendió construyendo
   el escrow (por qué el review window no es auto-release, por qué el fee se
   congela en el Job) atrae al perfil exacto que queremos.

## Métrica que importa ahora

**No** respuestas de encuesta. **Acuerdos completos de punta a punta con gente
externa al equipo.** El objetivo del siguiente hito es 3.

Para cada uno se registra: si aceptaron usar escrow, si entendieron el
funding, si la atestación les pareció valiosa, y si repetirían pagando el 1%.

## Próximos pasos tras la incubación

- **Corto plazo:** cerrar los 3 acuerdos piloto y documentarlos.
- **Medio plazo:** wallets embebidas (hoy no existen y son el bloqueo real para
  cualquier cliente no-crypto), y mainnet con USDC de Circle en vez del token de
  prueba de devnet.
- **Financiación:** ver [`docs/ecosystem.md`](./ecosystem.md).
