# Auditoría UX/UI — Padre Rico

**Fecha:** 2026-07-26 · **Alcance:** `index.html` (16,089 líneas) + `propuesta-visual.html` · **Método:** análisis estático del código (4 dimensiones en paralelo) + ejecución real en Chromium móvil (390×844, iPhone) con datos vacíos, datos demo y post-onboarding en cero.

---

## Resumen ejecutivo

La app tiene **fundamentos de interacción muy sólidos** (autosave, 376 toasts con `aria-live`, modal de confirmación propio usado 129 veces, flujo de captura de gasto en 3-5 taps, backups automáticos antes de operaciones irreversibles) pero arrastra **deuda de sistema visual y accesibilidad** típica de una app que creció por acreción: 32 tamaños de fuente, 943 declaraciones ≤11px, 4 de 6 colores de texto reprobando contraste WCAG AA, 1,138 estilos inline duplicados, y una PWA cuyo **service worker nunca se registra** (la app NO funciona offline hoy, aunque el código sugiere que sí).

Los 5 problemas que más duelen en uso diario:

1. **El service worker y el manifest se cargan por `blob:` URL — ningún navegador los acepta.** Sin offline, sin icono de instalación correcto. Falla en silencio (`catch(()=>{})`).
2. **Auto-zoom de iOS en cada campo**: `input,select{font-size:13px}` — iOS hace zoom al enfocar cualquier campo <16px. Con 262 campos, afecta cada captura.
3. **Botón atrás de Android cierra la PWA** (cero routing/history). No cierra modales ni regresa de tab.
4. **Cambiar de tab destruye formularios a medio llenar** (re-render total con `innerHTML=`, sin drafts). El formulario de Ingresos pierde cambios sin advertencia.
5. **Contraste y tipografía**: `--muted` 4.09:1 sobre crema + Georgia a 9-10px = texto secundario efectivamente ilegible, y las media queries móviles lo *achican* aún más.

---

## Top hallazgos por severidad

### 🔴 Críticos (romper/perder algo)

| # | Hallazgo | Evidencia | Fix |
|---|---|---|---|
| C1 | **SW nunca se registra** — `navigator.serviceWorker.register(blob:)` es rechazado por spec en Chrome/Safari; envuelto en catch silencioso. No hay offline ni cache. Todo el código del SW es código muerto. | `index.html:16054` | Servir `sw.js` como archivo real (rompe "un solo archivo", pero sin esto no es PWA) |
| C2 | **Manifest por `blob:` ignorado** — iOS/Chrome no lo aplican. Al instalar en iPhone: icono = screenshot borroso, nombre = `<title>` con emoji. Falta `<link rel="apple-touch-icon">`. | `index.html:9,16053` | `apple-touch-icon` con PNG 180×180 inline (data URI) funciona en iOS sin archivos extra |
| C3 | **Pérdida de trabajo al navegar** — `go(tab)` re-renderiza con `innerHTML=` desde `S`; formularios de panel (Ingresos, alta de deuda/gasto/activo, TDC) se vacían sin confirmar. Peor caso: `#incSaveBar` (guardado explícito) descarta silencioso. | `4208,4219,7930-7935` | Guard `if(_incEdited && !confirm…)` + drafts en `sessionStorage` |
| C4 | **Botón atrás Android = cerrar app** — 0 `pushState`/`popstate`/`hashchange`. Tampoco cierra `#cierreQnaModal` (que además no cierra con Esc ni tap-fuera; único escape: la ✕). | grep global, `360-368,973-977` | Hash routing + `popstate` cierra overlays; resuelve también restauración de sub-vistas |
| C5 | **Coma decimal = valor perdido** — `type="number"` con `20,50` devuelve `""` → "Monto inválido" sin explicación. Teclado iOS en locale ES muestra coma. Solo 6 de ~81 inputs intentan el `.replace(',','.')` (y opera sobre string ya vacío). | `5261,8471…` | Montos a `type="text" inputmode="decimal"` + parser central |
| C6 | **FAB visible durante onboarding** — se puede abrir "Gasto diario" antes de inicializar el estado. Verificado en screenshot: el FAB flota sobre el wizard "Tu meta". | `371-383,16086` | Ocultar `#fabContainer` hasta `launchApp()` |

### 🟠 Altos (fricción diaria)

| # | Hallazgo | Evidencia | Fix |
|---|---|---|---|
| A1 | **Auto-zoom iOS en 262 campos** — `input,select{font-size:13px}` < 16px dispara zoom + desplazamiento de layout en cada foco. | `:25` | `input,select{font-size:16px}` (1 línea) |
| A2 | **Contraste AA reprobado en 4 tokens**: `--muted` 4.09:1, `--sage` 4.26:1 (títulos de card), `--terra` 4.03:1 (¡el color de alertas/déficit!), `--amber` 3.87:1 — todos sobre `--bg`. | `:13-19` | Oscurecer ~10%: `--muted:#6B665F --amber:#8A5F28 --terra:#A34D3C` — 3 líneas, arregla todo global |
| A3 | **943 font-size ≤11px (53% del total)** con Georgia (x-height baja); y las media queries móviles **reducen** tamaños (nav 10→9px, badges 9→8px, `.check-btn` 26→22px en iPhone SE). El dispositivo primario recibe la peor variante. | conteos + `:152-203` | Piso 11-12px; invertir la dirección de los breakpoints |
| A4 | **Touch targets**: `.btn-sm` 32px ×240 usos; 68 botones de ~16px reales; ✎ y 🗑 adyacentes con `gap:5px` (borrar está a un tap de error de editar); `select` de deudas a 16px de alto y 9px de texto en móvil. | `:47,:165,11252` | `min-height:44px` o área táctil por `::after`; separar/mover 🗑 |
| A5 | **Marcar pago (tarea #1 quincenal) cuesta 5 taps y 2 estados** — checkbox (`paid`) + "Aplicar seleccionados" + confirmar (`applied`); el doble estado no se explica. Sin atajo en FAB ni Inicio; Plan→Pagos tiene 13 cards de scroll encima. | `1303-1341,11494,10602` | Aplicar directo con toast-undo (ya existe `undoApply` L1231) o atajo "✓ Pago" en FAB |
| A6 | **Cierre de quincena semi-oculto** — dejó de ser tab; se llega por CTAs dispersos. El banner en Inicio solo aparece con ≤2 días de margen. Es el ritual central de la app. | `359-368,4713` | Banner persistente últimos 3 días + entrada fija |
| A7 | **`inputmode` faltante en 61 de 81 inputs de dinero** — incluido `#realAmtInput` (el más tapeado de la app). | `1329…` | `inputmode="decimal"` masivo |
| A8 | **0 headings, 211 `<label>` sin `for`, 38 div/span clickeables sin foco, 0 `:focus-visible` en 428 botones** — inoperable con teclado/lector de pantalla. | conteos | `for=` (los inputs ya tienen id), `:focus-visible` global (1 línea), divs→`<button>` |
| A9 | **Colapso de cards con clave posicional** (`tab+índice`): las cards condicionales (alertas déficit/carryover/TDC) desplazan el estado colapsado a la card equivocada. | `4258` | `data-collapse-id` estable |
| A10 | **Labels internos apuntan a destinos inexistentes** — 38 refs a "Plan de Acción" (la tab se llama "Plan"), 2 empty states mandan a "Cierre Qna" (ya no existe). | `13876,14148…` | Search & replace |
| A11 | **Deudas viven en 4 lugares** (Finanzas→Deudas, Plan→Pagos, Plan→Estrategia, Historia→Liquidadas) y el presupuesto de diarios se define en una tab distinta de donde se consume. | `6983,11029,11621,14470` | Detalle único de deuda; editor de presupuesto junto al medidor |
| A12 | **Historia = cajón de sastre**: 8 sub-tabs, 44 cards, y la configuración global (Respaldo/export, Categorías, IA) enterrada al pie de las 8 sub-vistas. El export de respaldo — única red de seguridad de localStorage — está a 3 niveles y scroll completo. | `13851,14584` | Destino "⚙️ Ajustes" (el `#hdr-score` del header no es interactivo — es el lugar natural) |
| A13 | **Cifras de dinero sin `tabular-nums`** — 649 llamadas a `fx()` renderizan con Georgia proporcional; las columnas de $ no alinean. Solo 7 reglas lo aplican. | `:68-70` vs 649 usos | `font-variant-numeric:tabular-nums` en `body` (1 línea) |

### 🟡 Medios (pulir)

- **Modal "¡Logro desbloqueado!" interrumpe la navegación** — verificado en vivo: al entrar a Historia (y de nuevo al abrir Cierre) el modal se plantó encima de lo que el usuario iba a hacer, dos veces con el mismo logro. Encolar logros a un momento neutro (post-cierre) o toast.
- **Elementos flotantes apilados** — en Historia conviven: toast "Medio Camino" + botón sticky "Subir CSV · Cerrar mes" + FAB, tapando contenido; el toast "Tip: exporta respaldo" aparece sobre títulos de cards a media pantalla (verificado en screenshots).
- **12 deletes sin undo** (6 dicen "no se puede deshacer") teniendo ya la infraestructura (`toastSwitchTDC` = toast con botón). Un `toastUndo()` cubre todo.
- **2 deletes sin confirmación** (`rmExpUserCat` 7924, `delOtEntry` 13167 — borra horas trabajadas en un tap).
- **3 diálogos nativos residuales** (`confirm` 14915 al borrar capítulo, `prompt` 10467, `alert` 6805).
- **Validación solo por toast de 2.5s** — sin mensaje inline ni borde rojo; si miras el teclado te lo pierdes. 0 `<form>`, 0 `required`, sin submit con Enter (1 solo handler en 16k líneas).
- **Sin preservación de scroll** en re-renders post-acción; el peor caso: reclasificar 10 gastos en el cierre = 10 saltos al tope del modal (`_reviewSetCat` 9089).
- **Sub-vistas no se restauran al recargar** (salvo `habitView`); `_planViewCk` se pierde y cambia silenciosamente todos los números del Plan al ciclo actual.
- **Pull-to-refresh activo** (0 `overscroll-behavior`) — scroll con inercia arriba = recarga accidental.
- **`prefers-reduced-motion` ignorado** (25 reglas de animación, incluida una infinita).
- **Sin focus trap ni devolución de foco en modales**; `#cierreQnaModal` y el modal L3351 sin `role="dialog"`.
- **Header sin `safe-area-inset-top`** — bajo la Dynamic Island en standalone (el bottom sí está impecable).
- **Doble render** en `setHabitView('x');go('habitos')` y dos patrones de deep-link (directo vs `setTimeout 80ms`).
- **Onboarding sin "saltar"** y **cero guía post-onboarding** (verificado: aterrizas con score 20, todo en $0, sin checklist de primeros pasos; el CTA primario "Ya aparté mi ahorro" no significa nada aún).
- **Semántica de color con cruces**: pares contradictorios (`sky`/`sage` como bueno/malo en ambos sentidos ×4 cada uno) contra el manifiesto declarado (verde=avance, terra=fuga, azul=deuda, ámbar=atención). Morado fantasma `#9a7bc4` fuera de paleta.
- **Colores casi-duplicados** en el motor de gráficas (`#2C2824` vs `--txt:#2C2925`) y 2 grises ad-hoc para el mismo rol.
- **U+FE0F inconsistente**: ⚠ (46 con/63 sin), 🗑 (6/36) — el mismo icono sale a color o monocromo según la vista.

### Sistema visual (deuda estructural)

- **32 tamaños de fuente**, 14 line-heights, 7 letter-spacings, 15 radios (el token `--r` se usa 5 veces vs 141× `6px` literal), 15 sombras (`--shadow` se usa 2 veces), 15 gaps.
- **387 `rgba()` hardcodeados** = las mismas 4 marcas con 14-21 alfas distintas cada una. Es EL bloqueador del dark mode (que no existe: 0 `prefers-color-scheme`).
- **1,138 de 3,072 estilos inline son duplicados exactos** (54%). Top: `color:var(--muted);font-size:11px` ×58. Clases existentes (`.lbl`) reimplementadas inline ×31.
- **Inputs con 3 estilos distintos** — el global (`:25`, radio 7px, fondo `--bg`) vs 2 variantes inline (radio 6px, fondo `#fff`): los formularios se ven diferentes según la pantalla.
- **Doble iconografía**: 19 SVG Lucide (nav/header, monocromos, 2025) vs **185 emojis distintos, 2,118 usos** en el contenido. Mismo concepto con 3-8 glifos: editar (✏️/✎/📝), borrar (🗑/✕/🚫/❌), ok (✓/✅/🟢/☑), alerta (⚠/🚨/🔴), dinero (💰/💵/🪙/💸).
- **`propuesta-visual.html` quedó a medias**: el rediseño de Dashboard (17 cards → 7 bloques) se **sumó** en vez de reemplazar — `rDash()` hoy renderiza los 7 bloques `.dh-*` MÁS 13 cards viejas. Los `.qchip` (gasto frecuente en 1 tap, la mejor idea de la propuesta) nunca se implementaron — existe el contenedor pero con botones genéricos. Radios divergieron (14px propuesta → 10px port).

---

## Lo que está bien (no tocar)

- **Captura de gasto diario: 2 taps** desde chips de Inicio, 4-5 vía FAB, con autofoco, fecha prellenada, submit = botón de método de pago, detección de duplicados. Nivel de app nativa.
- **`showConfirm` propio ×129** con Escape y contexto real (nombre+monto) en mensajes.
- **Toast con `role="status" aria-live="polite"`** ×376, visible sobre modales, con monto formateado; el patrón `toastSwitchTDC` (toast accionable) es excelente.
- **Autosave + manejo de `QuotaExceededError`** + backups automáticos pre-operación + rescate de blob corrupto.
- **Safe-area bottom impecable** (7 usos), `100dvh` con fallback, viewport sin `user-scalable=no` (raro y correcto), `<html lang="es">`.
- **28 `.focus()` bien puestos** (primer campo al abrir, campo con error al validar).
- **Colapso de cards persistido** con MutationObserver (la idea correcta — solo falta arreglar la clave posicional y extenderla a `.dh-ct`).
- **Empty states bien escritos** donde existen (9 verificados).

---

## Quick wins — máximo ROI, mínimo riesgo (todas ≤3 líneas, solo CSS/atributos, cero lógica financiera)

1. `input,select{font-size:16px}` → mata el auto-zoom iOS en 262 campos. **(:25)**
2. `--muted:#6B665F; --amber:#8A5F28; --terra:#A34D3C` → 6 fallos de contraste resueltos globalmente. **(:root)**
3. `body{font-variant-numeric:tabular-nums}` → alinea las 649 cifras de dinero. 
4. `:focus-visible{outline:2px solid var(--sage2);outline-offset:2px}` → foco visible en 428 botones.
5. `<link rel="apple-touch-icon" href="data:image/png;base64,…">` → icono real al instalar en iPhone.
6. `.btn-sm{min-height:44px}` → 240 touch targets corregidos.
7. `body{overscroll-behavior-y:contain}` → sin recargas accidentales por pull-to-refresh.
8. Bloque `@media(prefers-reduced-motion:reduce){…}` → cubre las 25 reglas de animación.
9. `#fabContainer{display:none}` hasta `launchApp()` → FAB fuera del onboarding.
10. `inputmode="decimal"` en `#realAmtInput` y los 60 inputs de monto restantes.

## Plan sugerido por fases

- **Fase 1 — Quick wins** (arriba): 10 cambios, ~30 líneas, riesgo nulo para la lógica de balances.
- **Fase 2 — No perder trabajo**: drafts + guard al navegar (C3), parser de coma (C5), toast-undo en deletes, preservación de scroll (`withScroll()`).
- **Fase 3 — PWA real**: `sw.js` + `manifest.json` como archivos (C1/C2), hash routing + `popstate` (C4) — resuelve back-button, restauración de sub-vistas y deep-links de una vez.
- **Fase 4 — Arquitectura de información**: atajo "marcar pago" o aplicar-directo-con-undo (A5), Ajustes como destino propio (A12), terminar el port de `propuesta-visual.html` (quitar las 13 cards duplicadas de Inicio, implementar `.qchip`), consolidar deudas (A11).
- **Fase 5 — Sistema de diseño**: tokens de tipografía/radios/sombras/alfas, ~15 clases utilitarias (elimina >1,000 inline styles), tabla canónica de iconos, y con eso el dark mode queda casi gratis.

> ⚠️ Ninguna recomendación de este documento toca `calcCycleBalance`, `paidItems`, ventanas de quincena ni liquidación de deudas. Las fases 1-2 son deliberadamente aditivas y de bajo blast-radius conforme a la regla crítica de CLAUDE.md; cualquier cambio de la fase 4 que roce el flujo de aplicar pagos (A5) requiere la verificación numérica completa contra backups reales antes de tocar `main`.
