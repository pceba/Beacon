# Beacon — Revisión de diseño v1.1.0 → v1.2

Auditoría hecha sobre la app real (main @ c5146dd) compilada para web y recorrida a 390×844, con datos creados desde la propia interfaz (3 hábitos, 2 tareas, agua, comida, ánimo). Capturas en `docs/review/*.png`. Mockups nuevos: `docs/design/Hoy.html` (v1.2), `docs/design/Sueno.html`, `docs/design/Movimiento.html`.

Severidad: **P0** roto o bloqueante · **P1** baja claramente la calidad · **P2** pulido · **P3** preferencia (no se toca en esta ronda).

## P0 — Bloqueante

| # | Dónde | Hallazgo | Solución |
|---|---|---|---|
| 0.1 | Hoy (`TodayScreen` load) | `await migrateMoodScores(userId)` va dentro del `try` de carga y recorre toda la tabla en cada carga. Si falla (sin red, error puntual), Hoy no pinta nada y sale el toast de error aunque el resto de datos ya estaba cargado. | Sacarlo de la carga: ejecutarlo una sola vez por cuenta en segundo plano, con bandera `lifepp_mood_migrated` en storage, y `.catch` silencioso. |
| 0.2 | Comida (`review/comida.png`) | El campo de kcal y los de macros no tienen placeholder: vacíos son invisibles (hueco en blanco sobre «kcal»). No se ve dónde escribir. | Placeholder `0` en `text4`, `accessibilityLabel` en cada uno, sufijo «g» en macros, foco automático en kcal al elegir nombre o reciente. |
| 0.3 | Hoja «Añadir» (botón +) | En web el `BottomSheetModal` no llega a montarse (el + no hace nada). En Android no se ha podido comprobar. | Verificar en el APK. Si falla igual, sustituir el interior de `components/ui/Sheet.tsx` por `Modal` transparente + Reanimated (misma API `visible/onClose`), manteniendo muelle 22/220 y arrastre para cerrar con Gesture Handler. |
| 0.4 | Hoy, frase del día (`review/hoy.png`) | No se recalcula tras acciones locales: con 0,3 L y 1 hábito hecho sigue diciendo «Te falta 2,0 L… quedan 3 hábitos». | Derivar `brief` con `useMemo` del estado (summary, habits, logs, tasks) en lugar de guardarlo en el `load`. |

## P1 — Calidad

| # | Dónde | Hallazgo | Solución |
|---|---|---|---|
| 1.1 | Formato numérico global | `Intl.NumberFormat('es-ES')` y `toLocaleString('es-ES')` **no agrupan números de 4 cifras** (regla CLDR): sale «2000 kcal» en Hoy y Ajustes, «2.000» solo en algunos sitios. | `formatNumber` propio: agrupar siempre con punto (`/\B(?=(\d{3})+(?!\d))/g`) y coma decimal. Prohibido `toLocaleString` en UI. |
| 1.2 | Frase del día | La negrita parte «1,8» en «1» negrita + «,8» normal (regex `\d[\d.]*|,\d+`). | Tokenizar `\d+(?:[.,]\d+)*(?:\s?(?:ml|L|h|kcal))?` y «…» como un único fragmento. |
| 1.3 | Agua pequeña | 250 ml se muestra como «0,3 L» y la frase dice «te falta 1,8 L» (suma 2,1). | Por debajo de 1 L mostrar ml («250 ml», «te faltan 750 ml»); desde 1 L, litros con hasta 2 decimales sin ceros sobrantes («1,25 L», «2 L»). |
| 1.4 | Barra del día | Los segmentos se pintan según la categoría, no de izquierda a derecha: «1 de 7» enciende el 5.º segmento. | Rellenar de izquierda a derecha con el número de cosas hechas, en `ink`. Animar el segmento nuevo (ver Movimiento). |
| 1.5 | Hoy, métricas | Cuatro tarjetas sueltas con sombra = patrón genérico; mucho aire muerto y «—» gigante en Sueño vacío. | Una sola tarjeta «libro de cuentas» 2×2 con separadores de 1 px (mockup Hoy v1.2). Etiquetas en versalitas con punto de color, número 30/32, línea de progreso de 3 px. Vacío: «Sin registrar» + «Toca para añadir». |
| 1.6 | Acento azul | En una pantalla de Hoy aparece 6–7 veces (día de la semana, Añadir, Ver plan, check, ánimo, progreso). Deja de señalar nada. | Azul solo para enlaces de acción y foco. Día de la semana en `text3`; ánimo seleccionado en `ink`; progreso del día en `ink`. |
| 1.7 | Plan (`review/plan.png`) | «Vence hoy» en rojo en todas las tareas de hoy (las creadas en Hoy llevan fecha de hoy): alarma permanente. | Rojo solo si está vencida («Vencida · ayer»). Hoy: «Hoy» en `text2`, con «· Alta» si aplica. |
| 1.8 | Datos (`review/datos.png`) | Medias sobre 7 días aunque no haya registros («Agua al día 0,0 L» con 250 ml hoy); «0,0 h» con pastilla «0,0 h»; delta 0 en verde «+0,0 L»; gráfica de sueño vacía con 7 barras fantasma. | Medias sobre días con registro. Sin datos: «—» + frase. Delta 0 o sin periodo previo: pastilla neutra «igual» o nada. Gráfica vacía: línea de objetivo + «Aún no hay noches registradas · Registrar sueño». |
| 1.9 | Sueño (`review/sueno.png`) | Fechas escritas a mano «2026-10-14 23:00»; estrellas (patrón genérico); campo de notas enorme. | Mockup `Sueno.html`: duración protagonista, dos filas con `TimePill` («Me acosté · Anoche», «Me levanté · Hoy»), calidad en segmentado de 5 (Fatal…Genial), «Añadir una nota» que se despliega. |
| 1.10 | Toast | Sigue visible al cambiar de pantalla y tapa el botón fijo «Guardar» de los formularios; 68 px de alto. | Alto 52, radio 14. Offset automático: por encima de la barra en pestañas y por encima del dock en `FormScreen`. Deslizar para cerrar. 6 s si tiene acción. |
| 1.11 | Coherencia de orden | Hoy invierte los hábitos (`reverse()`), Datos los muestra en otro orden. | Un único orden (creación ascendente) en Hoy, Datos y Ajustes. |
| 1.12 | Componentes duplicados | Siguen vivos `components/Card`, `Input`, `Segmented`, `StarRating`, `ScreenHeader`, `TimelineItem` junto a `components/ui/*`. Diario usa un segmentado distinto (pista casi blanca) del de Datos. | Migrar todo a `components/ui` (añadir `ui/TextField`) y borrar los antiguos. |

## P2 — Pulido

| # | Dónde | Hallazgo | Solución |
|---|---|---|---|
| 2.1 | Hoy, hábitos | El hábito hecho se pone gris: parece desactivado. | Texto en `ink`; el estado lo comunica el check. Debajo: «Racha de 12 días» o «Hoy pendiente» en `text3`. |
| 2.2 | Hoy, ánimo | «Bien» usa el icono `smile-plus` (con un +): no encaja en la serie. | Caras propias en SVG (las del mockup), mismo trazo 1,8. |
| 2.3 | Movimiento | `toggleMove` llama a `Haptics.impactAsync` directamente (en web lanza y revierte). «Pendiente / Toca para marcar» suena a tarea. | Usar `lib/haptics`. Copy: «Sin marcar · Toca si te has movido» / «Hecho · Registrado hoy». |
| 2.4 | Formularios | «Cancelar» en azul compite con el botón principal. | `text2`, como en los mockups. |
| 2.5 | Ajustes (`review/ajustes.png`) | Aviso amarillo sin icono ni explicación; «Vincular» en gris; «Sin conexión» del conector sin explicar. | Aviso como en mockup (icono + 2 líneas). «Vincular» en acento. Estado del conector: «Sin conectar · Crea un enlace y pégalo en Claude». |
| 2.6 | Diario (`review/diario.png`) | Doble CTA «Escribir» (cabecera y vacío). | En vacío, ocultar el de cabecera. |
| 2.7 | Plan | La tira semanal solo marca hoy; no hay forma de añadir tarea desde Plan. | Puntos por día con tareas/eventos; fila «Añadir tarea» al inicio de la lista, igual que en Hoy. |
| 2.8 | Comida | «Guardar en recientes» apagado por defecto; permite guardar comida sin kcal sin avisar. | Activado por defecto. Si kcal está vacío, guardar igualmente pero el toast dice «Comida guardada sin calorías». |
| 2.9 | Email | El envío de emails no está configurado. | Al fallar `updateUser`/`signInWithOtp`: InlineError «No podemos enviar el código ahora mismo. Tus datos siguen guardados en este móvil.» Nunca un error técnico ni un bloqueo. |

## P3 — Preferencia (no se toca)
- Avatar con inicial «L»: podría ser un icono de ajustes.
- Etiqueta «Diario» frente a «Notas».

## Veredicto
La base es sólida y ya no parece una plantilla, pero hay cuatro fallos que el usuario notaría el primer día (Hoy que no carga si falla una migración, kcal invisible, frase del día desactualizada y la hoja + por verificar) y una capa de incoherencias numéricas («2000», «0,3 L», medias a 0) que delatan falta de cuidado. **El cambio que más sube la calidad: arreglar el formato y la lógica de los números en toda la app (1.1–1.4 y 1.8)**: en una app de datos personales, cada cifra rara resta confianza.

## Componentes (skill ui-component-libraries)
Las cinco librerías de la skill (Paper Shaders, Motion Primitives, UI Layouts, Cursify, Canvas UI) son web/DOM y **no se usan**. Se replican sus mejores ideas con lo que ya está instalado:
- **AnimatedNumber** (idea de Motion Primitives «text-morph»): Reanimated `useSharedValue` + `withTiming(320, Easing.out(cubic))` y `AnimatedTextInput` con `animatedProps` para el texto. Para agua y kcal en Hoy y Comida.
- **Listas con transición** (idea de «animated group»): `Animated.View` con `entering={FadeInDown.duration(220)}`, `exiting={FadeOut}` y `layout={LinearTransition}` en tareas y hábitos.
- **SwipeRow**: `ReanimatedSwipeable` de react-native-gesture-handler para borrar tareas/hábitos.
- **CheckCircle animado**: escala del relleno con muelle + trazo de la marca con `react-native-svg` `strokeDashoffset` animado.
- **Sheet**: se mantiene `@gorhom/bottom-sheet` si funciona en el APK; si no, Modal + Reanimated (0.3).
- **Dependencias nativas nuevas: ninguna.** Todo es JS sobre Reanimated 4, Gesture Handler, react-native-svg y expo-haptics, así que se publica con `eas update`.
