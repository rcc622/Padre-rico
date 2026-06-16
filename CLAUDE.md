# Padre Rico — Notas del proyecto

App de finanzas personales en un solo archivo (`index.html`, ~14k líneas, JS inline + localStorage).

## ⚠️ REGLA CRÍTICA antes de tocar `main`

Antes de implementar CUALQUIER cambio en `main`:

1. **Revisar la lógica TRES VECES** y estar 100% seguro de que el cambio:
   - NO aplica errores heredados (de iteraciones/datos previos), y
   - NO introduce ningún error nuevo que descuadre lo ya construido.
2. **Verificar numéricamente** contra los datos reales del usuario (backups / exports de auditoría) ANTES de pushear: reproducir los balances con un port del motor y confirmar que `calcCycleBalance` (Inicio) y el Estado de Cuenta (Plan) **cuadran exacto** en todos los ciclos.
3. Preferir cambios **aditivos y de bajo blast-radius**. Si un cambio toca lógica financiera central (balances, liquidación de deudas, ventanas de quincena), medir su alcance (grep de usos) y demostrar que no altera los números ya correctos.
4. Cuando haya ambigüedad sobre datos reales (montos, si un cargo fue real), **preguntar al usuario** en vez de adivinar.

El usuario ha invertido mucho en cuadrar estos cálculos. Un error que descuadre lo construido es más costoso que ir lento. Ante la duda: NO pushear a main, reportar y confirmar primero.

## Arquitectura de cálculo (memoria de contexto)

- `cycleKey()` / `ckForYMD(y,m,d)` / `cycleWindowFromKey(ck)`: mapeo fecha ↔ quincena. "1ra X" = 30 de X al 14 de X+1; "2da X" = 15 al 29 de X. Única fuente: `ckForYMD`.
- `calcCycleBalance(ck)` (motor Inicio/banner déficit) y el Estado de Cuenta inline en `rPlan` (motor Plan) **deben dar el mismo número** por ciclo. Ambos: ingreso (sal/2 + bono + extras + OT una vez) − (pagos aplicados de `paidItems` + diarios efectivo + ahorro apartado + neto metas + movimientos a activos). Los pagos con TDC NO restan del efectivo (salen vía "Pago TDC").
- `paidItems[ck][tipo_id]`: pagos aplicados/seleccionados por ciclo. Preferir `realAmt` sobre `amt`. Items "reconciliados" = aplicados cuyo `payDay` cae fuera de la ventana (el Plan los suma aparte para cuadrar con Inicio).
- `isDebtLiquidated(d)`: el **saldo** (`bal<=0`) es la única fuente de verdad. NO usar el contador `curPay/totalPays` (puede quedar inconsistente).
