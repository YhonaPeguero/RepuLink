# Guion de rodaje — Demo Day

Vídeo de 5 minutos: **3:00 de pitch + 2:00 de demo**, narrado en español por el
equipo, 1080p MP4. Se entrega también el mazo de láminas en PDF.

La narración está escrita para leerse en voz alta: es español hablado, no
español escrito. Los tiempos suman exactos a ritmo de presentación, unas 135
palabras por minuto.

---

## ⚠️ Antes de pulsar grabar

> **No ejecutes `npm run sas:attest-job`.**
> El script apunta al schema v2, que no existe en devnet. Lo crearía, y sobre el
> acuerdo que vamos a enseñar generaría una _segunda_ atestación bajo v2 — la PDA
> depende del schema, así que la idempotencia solo vale dentro de cada versión.
> El acuerdo `Diqr5i19…` ya está atestado bajo v1. Déjalo como está.

- [ ] Abre la app con la wallet conectada y luego desconéctala, para que la
      primera conexión en cámara sea instantánea.
- [ ] Ten SOL de devnet en la wallet con la que vas a conectar.
- [ ] Graba a 1920×1080, navegador a pantalla completa, sin marcadores
      personales ni notificaciones a la vista.
- [ ] Prueba el audio antes: graba 20 segundos y escúchalos con auriculares.
- [ ] Ensaya el pitch dos veces con cronómetro. La primera siempre se va.

---

## Pitch — 3:00

Los cinco bloques van en el orden que pide la organización: problema, solución,
qué construimos, avances en Labs, qué sigue.

### 0:00 · El problema _(40 s)_

> Cuando alguien te contrata, lo primero que mira es tu reputación. Y hoy esa
> reputación es una promesa: una lista de reseñas que administra la propia
> plataforma, que tú no te puedes llevar, y que nadie de fuera puede verificar.
>
> Si cambias de plataforma, empiezas de cero. Si la plataforma cierra,
> desapareció.
>
> Y hay algo peor. Casi todo ese historial es auto-declarado. Nadie comprobó que
> el trabajo existió, ni que alguien llegó a pagar por él.

_Pantalla: láminas 1 y 2. Sin la app todavía._

### 0:40 · La solución _(40 s)_

> RepuLink le da la vuelta al orden. En vez de pedirte que declares tu historial,
> lo deriva de algo que ya ocurrió: un acuerdo con dinero de por medio.
>
> Dos partes cierran un acuerdo. Quien paga deposita el dinero en un escrow
> on-chain. Cuando el trabajo se entrega y el pago se libera, ese acuerdo
> liquidado deja una atestación pública en Solana.
>
> Tu reputación deja de ser una lista de opiniones y pasa a ser un rastro de
> acuerdos que se pagaron de verdad. Portable, verificable por cualquiera, y sin
> que te la administre nadie.

_Pantalla: lámina 3 — el ciclo dibujado._

### 1:20 · Qué hemos construido _(45 s)_

> Lo que vais a ver no es un prototipo: está desplegado en devnet y se puede
> recorrer ahora mismo.
>
> Construimos un programa en Anchor que maneja el ciclo completo del escrow —
> crear el acuerdo, depositar, marcar entrega, liberar el pago, abrir disputa y
> reclamar cuando vence el plazo. El protocolo cobra un uno por ciento, y esa
> cifra está en el contrato, no en un slide.
>
> Cuando un acuerdo se liquida, emitimos una atestación con el Solana Attestation
> Service. Y encima de todo eso, una aplicación donde cualquiera conecta su
> wallet y recorre el flujo.

_Pantalla: lámina 4 — arquitectura en tres piezas._

### 2:05 · Avances durante Labs _(40 s)_

> El avance más importante de Labs no fue técnico, fue de enfoque.
>
> Empezamos construyendo insignias que la gente se otorgaba entre sí. Al
> auditarlo nos dimos cuenta de que estábamos reconstruyendo el mismo problema
> del que queríamos salir: historial auto-declarado.
>
> Así que giramos. El escrow pasó de ser una función a ser el producto, porque es
> lo único que produce evidencia que no se puede fabricar.
>
> _[recortable]_ Desde ahí vino todo lo demás: el módulo de escrow, la
> integración con Attestation Service, el despliegue a devnet con el ciclo
> probado de punta a punta, y cinco acuerdos sembrados que cubren cada estado.

_Pantalla: lámina 5 — el giro, en dos columnas._

### 2:45 · Qué sigue _(15 s)_

> Lo siguiente son tres cosas concretas: pasar a mainnet con USDC de Circle en
> lugar del token de prueba; sustituir el árbitro de clave única por un comité; y
> una auditoría de seguridad antes de que esto toque dinero real.

_Pantalla: lámina 6. Luego pasa a compartir el navegador._

---

## Demo — 2:00

Un solo recorrido, sin volver atrás. Ten las cuatro pestañas abiertas de
antemano: nada mata más una demo que una carga en vivo.

### 0:00 · Conectar la wallet _(20 s)_

> Esto es RepuLink corriendo en devnet. Conecto mi wallet de Solana — Phantom,
> Solflare, Backpack o Jupiter: funciona con cualquiera que implemente el
> estándar de wallets.

_Haz: portada → clic en tu wallet → aprueba. Detente un segundo en la tira de
wallets antes de hacer clic._

### 0:20 · Los acuerdos reales _(25 s)_

> Aquí hay cinco acuerdos reales sembrados en devnet, cada uno en un punto
> distinto del ciclo: uno con el dinero ya depositado, uno entregado esperando
> revisión, dos liquidados, y uno que acabó en disputa.

_Haz: ir a `/dashboard`. Recorre la lista con el cursor sin hacer clic todavía._

### 0:45 · El acuerdo liquidado y atestado _(40 s)_

> Abro este acuerdo liquidado. El riel muestra el recorrido completo: se creó, se
> depositó el dinero, se marcó la entrega y el pago se liberó. Cien unidades al
> trabajador, menos el uno por ciento del protocolo.
>
> Y aquí está lo que importa: la atestación. Cuando este acuerdo se liquidó,
> quedó registrada en el Solana Attestation Service.

_Haz: abrir `Diqr5i19MsKPiYYqydZtqyEfhiWusfMdTMJK8UPNj4kF`._

### 1:25 · La prueba independiente _(35 s)_

> Y esto no es una captura de nuestra app. Este es el explorador de Solana, en
> devnet, mostrando esa misma atestación.
>
> Cualquiera puede verificarla sin pedirnos permiso y sin confiar en nosotros.
> Eso es exactamente lo que significa que la reputación sea verificable.

_Haz: pestaña del explorador con la atestación
`986bycoi3X4h65bQnWoBrut8JCm8RNMvD3QJ9Y6DDxfB` ya cargada._

---

## Cómo grabar el flujo sin correr

La demo dura 120 segundos. La narración son unas 200 palabras, que a ritmo de
presentación ocupan **89 segundos**. Quedan **31 segundos de silencio**. No es
tiempo sobrante: es el tiempo en que el jurado lee la pantalla.

### Dos métodos

**Dos tomas (recomendado).** Graba la pantalla en silencio moviéndote despacio;
graba el audio aparte leyendo el guion; junta las pistas y ajusta los reposos.
Cuesta media hora de montaje, pero si te trabas repites solo la voz.

**Una toma.** Ensaya el recorrido tres veces _sin hablar_ hasta que las manos lo
hagan solas, y solo entonces añade la voz. Sin montaje, pero un tropiezo obliga a
repetir los dos minutos enteros.

### Dónde detenerte

Aterriza en la pantalla, **cállate** el tiempo marcado, y solo entonces habla.

| Momento             | Reposo                              |
| ------------------- | ----------------------------------- |
| Portada             | 3 s antes de hablar                 |
| Dashboard           | 3 s antes · 2 s después             |
| El acuerdo atestado | 4 s antes · 3 s sobre la atestación |
| El explorador       | 4 s antes · 3 s al final            |

### Ajustes que se notan

- Zoom del navegador al **110–125 %**. Al 100 % los textos pequeños no se leen
  proyectados.
- Las cuatro pestañas cargadas antes de empezar.
- Cursor despacio y en línea recta. Al llegar a la atestación, párate encima y
  deja de moverlo.
- Graba a 1920×1080 exactos; reescalar después emborrona el texto.
- Termina con la pantalla quieta y dos segundos de silencio antes de cortar.

---

## Lo que no podemos afirmar

Esto sale de auditar nuestro propio programa. Si un jurado técnico tira del hilo,
estas frases no aguantan.

| ❌ No decir                  | Por qué                                                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| "Nada es auto-declarado"     | El hash de entrega lo aporta el trabajador y el programa no valida su contenido. Lo que no se puede fingir es el pago.   |
| "Se liquida en USDC"         | Es un token de prueba acuñable por el equipo, no USDC de Circle.                                                         |
| "Cinco trabajos completados" | Solo los `Released` prueban trabajo entregado y pagado. El `Resolved` se disputó desde `Funded`, con `delivered_at = 0`. |
| "El cliente libera el pago"  | También puede liberarse por vencimiento de plazo, firmado por el trabajador.                                             |
| "Imposible de falsificar"    | El programa acepta cualquier mint SPL. Dos wallets con un token propio podrían fabricarse historial.                     |

✅ **Sí decir:** "Solo cuenta como historial un acuerdo que se liquidó: entregado
y pagado. Una disputa no cuenta, y una cancelación tampoco."

Afirmar menos de lo que puedes demostrar es lo que te hace creíble ante un
jurado técnico.

---

## Las láminas — 6

| #   | Lámina          | Contenido                                                                                       |
| --- | --------------- | ----------------------------------------------------------------------------------------------- |
| 01  | Portada         | RepuLink · "Prueba de que el trabajo ocurrió" · Built on Solana · Yhonatan Peguero, Are Paxhiao |
| 02  | El problema     | No la controlas · No la puedes verificar · No te la puedes llevar                               |
| 03  | El ciclo        | Creado → Depositado → Entregado → Liberado → Atestado, con los colores reales de la app         |
| 04  | Qué construimos | Programa Anchor · Atestación SAS · Aplicación web. Comisión 1% en el contrato                   |
| 05  | El giro de Labs | "Insignias que la gente se otorga" tachado → "Acuerdos que se pagaron"                          |
| 06  | Qué sigue       | Mainnet con USDC · Árbitro por comité · Auditoría                                               |

---

## Datos citables

Verificados por RPC contra devnet. Si dices una cifra en cámara, que sea una de
estas.

| Dato                   | Valor                        | Dónde se comprueba                  |
| ---------------------- | ---------------------------- | ----------------------------------- |
| Comisión del protocolo | 1% exacto                    | `fee_bps=100` en la Config on-chain |
| Acuerdos sembrados     | 5, cubriendo 4 estados       | Dashboard de la app                 |
| Acuerdo atestado       | `Diqr5i19…`                  | Atestación `986bycoi…`, schema v1   |
| Token de la demo       | Token de prueba, 6 decimales | `493AbaKC…` — no es USDC de Circle  |
| Recorrido del proyecto | Marzo → agosto de 2026       | 69 commits                          |

---

## Checklist de entrega

- [ ] Vídeo MP4 a 1080p, 5 minutos, narrado en español.
- [ ] Audio limpio, escuchado entero con auriculares.
- [ ] Subido a Drive con lectura para cualquiera con el enlace — compruébalo en
      una ventana de incógnito.
- [ ] Láminas exportadas a PDF.
- [ ] Repasado el apartado "Lo que no podemos afirmar" contra lo dicho en cámara.
