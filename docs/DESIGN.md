# Beacon — Sistema de diseño y especificación del rediseño

Fuente de verdad visual: los mockups de `docs/design/*.html` (son HTML de referencia, con datos de ejemplo en un bloque `renderVals()`; no se ejecutan en la app). Este documento manda si hay contradicción.

**Versión 1.2** (revisión en `docs/DESIGN_REVIEW.md`): Hoy pasa a `docs/design/Hoy.html` v1.2, el formulario de sueño a `docs/design/Sueno.html` y el movimiento y los estados vacíos a `docs/design/Movimiento.html`. Las secciones marcadas «v1.2» sustituyen a lo anterior.

**Versión 1.3**: entreno completo (§7), Plan como calendario (§8, `docs/design/plan-calendario.html`) y hojas sin muelle (§9). Lo marcado «v1.3» manda sobre lo anterior.

Principios:
1. **Un vistazo basta.** Hoy responde «¿qué me falta?» en una frase, sin desplazarse.
2. **Registrar en 2 toques.** Todo se añade desde el botón central +.
3. **Nunca bloquear.** Nada de `Alert.alert` para errores o confirmaciones reversibles: se hace al momento y se ofrece «Deshacer».
4. **Calma.** Fondo gris claro, tarjetas blancas, un solo acento azul. El color de categoría solo en iconos, barras y puntos.
5. **Táctil de verdad.** Objetivos ≥ 44×44, hápticos con intención, movimiento corto.

---

## 1. Tokens (`constants/`)

### Color — `constants/colors.ts`
Renombrar las claves heredadas (`brown*`, `gold*`) a nombres semánticos y actualizar todos los usos.

| Token | Hex | Uso |
|---|---|---|
| `ink` | `#101318` | Texto principal, botón principal, FAB |
| `text2` | `#4A5260` | Texto secundario |
| `text3` | `#6B7380` | Texto terciario, etiquetas, iconos inactivos |
| `text4` | `#9AA2AE` | Desactivado, tachado, chevrons |
| `border` | `#DDE2E9` | Contornos de botón/campo |
| `line` | `#EEF1F4` | Separadores dentro de tarjeta |
| `bg` | `#F2F4F7` | Fondo de pantalla, relleno de pasos |
| `fill` | `#F6F7F9` | Relleno de campos y tiles |
| `track` | `#E6E9EE` | Fondo de segmentado, pistas |
| `surface` | `#FFFFFF` | Tarjetas y hojas |
| `accent` | `#2448D8` | Acento único: enlaces de acción y foco. Máximo ~3 apariciones por pantalla (v1.2). Selección de ánimo, día del plan y progreso del día van en `ink`. |
| `accentSoft` | `#E8EDFF` | Fondo de botón secundario |
| `water` / `waterSoft` | `#1A5FCC` / `#E6F0FE` | |
| `food` / `foodSoft` | `#1B8A55` / `#E3F4EB` | También «hecho» y switches activos |
| `workout` / `workoutSoft` | `#D2551A` / `#FCEDE4` | |
| `sleep` / `sleepSoft` | `#4B4FC4` / `#ECECFA` | Barra de sueño bajo objetivo: `#BFC1EC` |
| `mood` / `moodSoft` | `#8B4FD1` / `#F3ECFB` | Ánimo, notas, reflexiones |
| `warning` / `warningSoft` | `#D2A11A` / `#FFF6E0` | |
| `danger` / `dangerSoft` | `#B4291F` / `#FDECEA` | |
| `success` / `successSoft` | `#14693F` / `#E3F4EB` | Pastillas de delta positivo |
| `scrim` | `rgba(16,19,24,0.38)` | Fondo detrás de hojas |

### Tipografía — `constants/typography.ts` (Outfit; quitar Lora si ya no se usa)
| Token | Tamaño/alto | Peso | Tracking |
|---|---|---|---|
| `display` | 56/60 | 600 | -1.5 |
| `title` | 32/36 | 600 | -0.6 |
| `headline` | 22/28 | 600 | -0.3 |
| `section` | 17/22 | 600 | 0 |
| `body` | 16/22 | 400 | 0 |
| `bodyStrong` | 16/22 | 600 | 0 |
| `caption` | 13/18 | 500 | 0 |
| `label` | 11/14 | 600 | 0.6, mayúsculas |
| `overline` | 13/18 | 600 | 0.8, mayúsculas (fecha sobre el título) |

Todas las cifras con `fontVariant: ['tabular-nums']`. Formato es-ES: `1.240`, `2,0 L`, `7,5 h` (crear `utils/format.ts` con `formatNumber`, `formatLiters`, `formatHours`, `formatRelative`).

**Números (v1.2)** — regla de oro: ninguna cifra rara.
- Agrupar miles siempre con punto, también con 4 cifras (`2.000`). `Intl`/`toLocaleString('es-ES')` no lo hace: prohibidos en la UI, usar `formatNumber` propio.
- Agua: < 1 L en ml (`250 ml`, `te faltan 750 ml`); ≥ 1 L en litros con hasta 2 decimales sin ceros sobrantes (`1,25 L`, `2 L`). La frase del día y la tarjeta usan la misma función.
- Horas: `7 h`, `7,5 h`; en el formulario de sueño `7 h 45 min`.
- Sin dato: `—` en `text4` + frase corta. Nunca `0,0`.
- Medias: sobre días con registro. Deltas: 0 o sin periodo anterior → pastilla neutra «igual» o nada; nunca verde con `+0`.

### Espacio y forma — `constants/spacing.ts`
- Escala: 4, 8, 12, 16, 20, 24, 32.
- Margen lateral de pantalla 20. Hueco entre tarjetas 12. Entre secciones 20–24. Padding de tarjeta 16 (14 en tarjetas pequeñas).
- Radios: `sm` 10, `md` 14, `lg` 18 (tarjeta), `sheet` 28, `pill` 999.
- Alturas: fila de lista 56, botón principal 56 (radio 16), botón normal 52, chip 36–40, paso (+/−) 44×44.
- Sombra única de tarjeta: iOS `0 1 2 rgba(16,19,24,.04)` + `0 6 16 rgba(16,19,24,.04)`; Android `elevation: 2`. Tarjetas sin borde.

### Movimiento y hápticos — `constants/motion.ts`
- Entrar 220 ms `Easing.out(cubic)`, salir 160 ms. Hojas con muelle `damping 22, stiffness 220`. Pulsar: escala 0,97.
- Si `AccessibilityInfo.isReduceMotionEnabled()` → solo fundidos.
- `lib/haptics.ts` con: `selection()` (cambiar segmento/día/paso), `light()` (sumar agua, marcar hábito, abrir hoja Añadir con `soft`), `medium()` (completar tarea), `success()` (objetivo del día cumplido), `warning()` (borrar/desconectar), `error()` (fallo al guardar).

---

## 2. Componentes base (`components/ui/`)
Crear y usar en todas las pantallas. Cada uno con `accessibilityRole`/`accessibilityLabel` y `hitSlop` cuando el visual sea < 44.

- **Card** — superficie blanca, radio 18, sombra única. Variante `inset` (lista agrupada con separadores `line`).
- **Button** — variantes `primary` (ink/blanco), `secondary` (accentSoft/accent), `outline` (blanco + borde), `danger` (texto danger), `ghost`. Tamaños `lg` 56 y `md` 52. Estado `loading` con spinner pequeño dentro, `disabled` con track/text4.
- **ListRow** — 56 de alto, icono opcional en cuadrado 32 radio 10 con color suave, título, valor a la derecha, chevron opcional.
- **Stepper** — botones 44 redondos sobre `bg`, valor centrado tabular; háptico `selection` en cada paso; mantener pulsado repite.
- **Switch** — 50×30, activo `food`, inactivo `#D5DAE1`.
- **Segmented** — fondo `track`, radio 14, padding 4; activo blanco con sombra suave.
- **Chip** — pastilla 36–40; activo ink/blanco o color suave + texto del color.
- **CheckCircle** (hábitos, 28) y **CheckBox** (tareas, 22, radio 7) con animación de relleno y háptico.
- **DeltaPill** — positivo successSoft/success, negativo dangerSoft/danger, neutro `#EEF1F4`/text2.
- **ProgressBar** — 8 de alto, pista en el color suave de la categoría.
- **Sheet** — hoja inferior con asa 36×5, radio 28, scrim. v1.3: implementación propia sobre un `SheetHost` único (ver §9); nada de `@gorhom/bottom-sheet` ni `Modal`.
- **Toast** — `ToastProvider` + `useToast()`: `toast.show({ message, kind: 'success'|'error'|'info', action?: { label: 'Deshacer', onPress } })`. Abajo, encima de la barra, ink con texto blanco, 4 s, máximo 1 visible. Sustituye a TODOS los `Alert.alert` de error/éxito.
- **ConfirmSheet** — solo para acciones irreversibles (desconectar Claude, borrar cuenta). Título en pregunta, una línea de explicación, botón con el verbo exacto en dangerSoft/danger, «Cancelar» debajo.
- **Skeleton** — bloques `track` con brillo de 1,2 s; se muestra solo si la carga supera 300 ms.
- **EmptyState** — icono en círculo 52 con color suave, título `section`, una frase `caption`, un botón `md`.
- **InlineError** — icono danger en círculo 28, título + explicación humana + «Reintentar».
- **TimePill** — pastilla `bg` con la hora tabular que abre `@react-native-community/datetimepicker` en modo hora (24 h).

Borrar los componentes sin uso: `DayRing`, `StatRow`, `ProgressBar` viejo, `CategoryBadge`, `MoodPicker` (o reemplazarlos por los nuevos).

---

## 3. Navegación
Barra inferior de 5 posiciones: **Hoy · Plan · [+] · Diario · Datos**.
- Iconos lucide 22, etiqueta 11. Activo `ink` peso 600, inactivo `text3` peso 500. Fondo blanco 94 % con borde superior `#E4E8EE`.
- Centro: FAB 56 redondo `ink`, icono + blanco, sobresale 18 por arriba, sombra `0 6 16 rgba(16,19,24,.24)`. No es una pestaña: abre la hoja **Añadir**.
- La pestaña «Registro» desaparece; sus pantallas (Comida, Entreno, Sueño, Cuerpo) pasan a abrirse desde Añadir como modales de pila.
- Ajustes se abre desde el avatar/inicial en la cabecera de Hoy.

### Hoja «Añadir» (`docs/design/Anadir.html`)
- Título `headline` «Añadir» + botón cerrar 36.
- «Agua rápida»: tres botones `+250 ml`, `+500 ml`, `+1 L` (waterSoft/water). Un toque registra, cierra la hoja y muestra toast «+250 ml de agua» con Deshacer.
- Rejilla 3×3 de tiles (alto 96, `fill`, radio 18, icono en círculo 44 del color suave): Comida, Entreno, Sueño, Tarea, Hábito, Evento, Peso, Nota, Reflexión.
- Pie: icono sparkle accent + «También puedes pedírselo a Claude: «apunta 500 ml y una ensalada».»

---

## 4. Pantallas

### Hoy v1.2 (`docs/design/Hoy.html`)
- Cabecera: overline del día en `text3` versalitas 13 («JUEVES»), título 34/38 −0,9, a la derecha botón 44 blanco con borde y la inicial → Ajustes.
- **Frase del día** 17/25 en `text2`, cifras y «hábitos» en `ink` 600. Se calcula con `useMemo` a partir del estado actual (nunca se guarda en el `load`), así cambia al instante al sumar agua o marcar un hábito. Tareas de hoy: «es para hoy»; vencidas: «está vencida».
- **Barra del día**: N segmentos (uno por cosa medible del día), rellenos **de izquierda a derecha** en `ink` según cuántas están hechas; texto «4 de 7».
- **Libro del día**: UNA tarjeta 2×2 con separadores de 1 px `line` (sin tarjetas sueltas). Cada celda: etiqueta versalitas 11 con punto de 6 px del color de la categoría, valor 30/32 600 −0,8 con unidad 13 `text3`, línea de progreso de 3 px abajo. Agua lleva botón «+250» (36 alto, waterSoft). Sueño vacío: «Sin registrar» + «Toca para añadir». Movimiento: «Sin marcar · Toca si te has movido» / «Hecho · Registrado hoy». Comida: `1.240 / 2.000`.
- **Hábitos** «2 de 4» + «Añadir»: CheckCircle 30 del color del hábito, nombre en `ink` (no se agrisa al completarlo), debajo «Racha de 12 días» u «Hoy pendiente» en `text3`, mini semana de 7 puntos de 7 px (hoy con anillo). Orden: creación ascendente, igual en Datos.
- **¿Cómo estás?**: a la derecha el último registro («Bien · hace 2 h»). 5 caras SVG propias (no lucide) → `mood_score` 1–5. Seleccionada en `ink` con texto blanco; el resto sin fondo.
- **Tareas** con contador + «Ver plan»: primera fila «Añadir tarea para hoy»; cada tarea con meta opcional: «Vencida · ayer» en danger, «Hoy · Alta» en `text2`. Completar → animación de Movimiento y toast «Tarea hecha · Deshacer».

### Plan (`docs/design/Plan.html`)
- Overline del mes («OCTUBRE 2026»), título «Plan», botón pastilla «Hoy» que vuelve al día actual.
- Tira semanal en tarjeta: 7 días (letra, número, puntos de color por eventos/tareas). Seleccionado: fondo ink, texto blanco. Deslizar cambia de semana. Sustituye a `react-native-calendars` en la vista principal (el calendario mensual puede abrirse desde el título en una hoja).
- Agenda del día: hora a la izquierda (64), barra de color 3, título y meta.
- Tareas del día: «1 de 4 hechas», CheckBox, meta en danger si vence hoy. Deslizar a la izquierda para borrar (con toast Deshacer) y menú ⋯ como alternativa visible.

### Datos (`docs/design/Datos.html`) — sustituye a StatsScreen
- Segmentado Semana / Mes / 3 meses.
- 4 KPIs en rejilla 2×2 con DeltaPill frente al periodo anterior: Sueño medio, Agua al día, Entrenos, Calorías.
- Sueño: barras propias con `react-native-svg` (no gifted-charts), valor encima de cada barra, línea discontinua del objetivo, barras `sleep` si ≥ objetivo y `#BFC1EC` si no.
- Hábitos: mapa de calor hábitos × días con celdas de 22 de alto, radio 6, color del hábito o `#EBEEF2`; cabecera con «78 % cumplidos».
- Peso: valor grande, delta 30 días y sparkline SVG.
- v1.2: estados sin datos como en `docs/design/Movimiento.html` (KPI con «—» y frase; gráfica vacía con línea de objetivo, frase y acción «Registrar sueño»). Nada de barras fantasma.

### Formulario Comida (`docs/design/Comida.html`) — patrón para todos los formularios
- Cabecera: «Cancelar» a la izquierda (44 de alto), título centrado.
- Campo principal grande sin caja (24/600, subrayado accent al enfocar).
- «Recientes»: chips horizontales con nombre · kcal; tocar rellena todo el formulario (sustituye al «Usar una comida guardada» que solo cargaba la primera).
- Número protagonista `display` («600 kcal») + caption «Llevas 1.240 de 2.000 hoy».
- Macros en 3 tiles `fill`.
- Tipo de comida en segmentado (Desayuno, Comida, Cena, Snack) con valor por defecto según la hora.
- Fila «Hora» con TimePill; switch «Guardar en recientes».
- Botón primario fijo abajo «Guardar comida». Tras guardar: cerrar + toast con Deshacer + háptico.
- Entreno, Sueño, Cuerpo, Tarea, Hábito, Evento, Nota y Reflexión siguen esta misma estructura.
- v1.2: todo campo numérico vacío muestra placeholder `0` en `text4` y tiene `accessibilityLabel`; «Cancelar» en `text2`; «Guardar en recientes» activado por defecto; nunca se escriben fechas a mano (siempre `TimePill`/selector).

### Sueño v1.2 (`docs/design/Sueno.html`)
- Duración protagonista `display` («7 h 45 min») + caption «Tu objetivo son 7 h · cumplido» (cumplido en success).
- Dos filas de 60: «Me acosté · Anoche» y «Me levanté · Hoy», cada una con icono en cuadrado 32 y `TimePill` a la derecha. Si la hora de levantarse es anterior a la de acostarse, se asume día siguiente.
- «¿Qué tal has dormido?»: segmentado de 5 (Fatal, Mal, Normal, Bien, Genial) → `quality_rating` 1–5. Sin estrellas.
- «Añadir una nota» como botón de texto que despliega un campo multilínea.

### Ajustes (`docs/design/Ajustes.html`)
- Título «Ajustes» + «Listo».
- Aviso warningSoft si la cuenta es anónima: «Vincula tu email para no perder tus datos».
- Grupos con etiqueta en mayúsculas: **Cuenta** (Email · Vincular / email verificado), **Objetivos** (Steppers: Agua 2,0 L paso 0,25; Calorías paso 50; Sueño paso 0,5 h), **Recordatorios** (Agua, Hábitos, Tareas: TimePill + Switch; nota «Solo te avisamos si aún no has cumplido ese objetivo.»), **Claude** (estado con punto verde y «último uso hace 2 h», «Crear enlace nuevo», «Desconectar» con ConfirmSheet).
- Pie «Beacon x.y.z» con la versión real de la app.

---

## 4b. Movimiento v1.2 (`docs/design/Movimiento.html`)
Todo con Reanimated 4 + Gesture Handler + react-native-svg; sin dependencias nuevas. Con «Reducir movimiento» todo pasa a fundido de 120 ms y los números cambian sin contar.

| Momento | Animación | Tiempo | Háptico |
|---|---|---|---|
| Pulsar cualquier cosa | escala 0,97, vuelta con muelle, sin opacidad | in 90 ms · spring damping 18 / stiffness 300 | — |
| Marcar hábito | relleno del círculo escala 0→1 + trazo de la marca (`strokeDashoffset`) | spring 14/260 · trazo 180 ms | light |
| Completar tarea | check, tachado del título, a los 600 ms la fila se pliega (`LinearTransition`) | 180 + 600 + 220 ms | medium |
| Totales (agua, kcal) | `AnimatedNumber` cuenta del valor anterior al nuevo; la barra crece a la vez | 320 ms `Easing.out(cubic)` | light al sumar |
| Objetivo del día cumplido | segmento se rellena y late 1→1,04→1, solo la primera vez del día | 200 ms | success |
| Hoja Añadir (v1.3) | sube sin rebote; fondo al 38 % | abrir 240 ms `bezier(0.2,0,0,1)` · cerrar 180 ms ease-in · fondo 200/180 ms | soft |
| Toast | entra 16 px desde abajo + fundido; sustituye al anterior; deslizar para cerrar; 52 de alto, radio 14 | in 200 · out 160 · 4 s (6 s con acción) | — |
| Primera carga de Hoy | secciones escalonadas 12 px hacia arriba, una vez por arranque | 220 ms · 40 ms de escalón | — |
| Borrar (deslizar) | fondo danger revelado, fila se pliega, toast con Deshacer | 220 ms | warning |

Posición del toast: por encima de la barra de pestañas en las pestañas y por encima del botón fijo en `FormScreen` (offset que registra la pantalla al enfocarse). Al cambiar de pantalla, el toast sin acción se descarta.

## 5. Voz y textos
- Tú, cercano, frases cortas. Sin exclamaciones ni emojis en la interfaz.
- Botones con verbo concreto («Guardar comida», «Desconectar»), nunca «Aceptar» u «OK».
- Errores: qué ha pasado + qué hacemos («Sin conexión. Lo guardamos en el móvil y lo subimos cuando vuelva la red.»). Nunca mensajes técnicos.
- Fechas relativas cuando ayudan: «hoy», «mañana», «hace 2 h».

## 6. Accesibilidad
- Contraste AA en todo texto (los tokens ya lo cumplen sobre blanco y `bg`).
- `accessibilityLabel` en todo botón de icono; estado en checks y switches (`accessibilityState`).
- Respetar el tamaño de letra del sistema hasta 1,3× sin que se corte nada (`maxFontSizeMultiplier` 1.3 en cifras grandes).
- Reducir movimiento respetado.

---

## 7. Entreno v1.3 (`features/training`)
Modelo: Strong / Hevy. Una sesión es una lista de ejercicios; cada ejercicio, una tabla de series. Nada se marca hecho solo: lo que viene de la última vez o de la rutina es un valor propuesto hasta que tocas ✓.

### 7.1 Empezar (`LogWorkoutScreen`, modal de pila)
Se abre desde Añadir → Entreno y desde la pastilla «Entreno» de la celda Movimiento de Hoy.
- Cabecera de formulario: «Cancelar» y «Entreno».
- **Entreno en curso** (hay un `workouts.completed = false`): tarjeta arriba con punto `workout`, «Pierna · 23 min», botón primario «Continuar» y enlace danger «Descartar» (ConfirmSheet). Mientras exista, las opciones de empezar se ven en `text4` con la nota «Termina o descarta el entreno en curso para empezar otro.» Nunca hay dos en curso.
- Dos tiles 96 de alto en fila (`fill`, radio 18, icono en círculo 44 `workoutSoft`): **Empezar vacío** y **Repetir el último** (caption «Torso · jue 16»; desactivado si no hay ninguno). Repetir copia ejercicios, número de series y los kg/reps de esa sesión como valores propuestos.
- **Rutinas** + enlace «Nueva rutina»: filas 64 con nombre (`bodyStrong`), meta «5 ejercicios · hace 3 días» o «5 ejercicios · sin hacer», y ⋯ (44) → menú: Editar, Duplicar, Eliminar (toast con Deshacer). Tocar la fila empieza el entreno con esa rutina.
- Sin rutinas: EmptyState «Crea tu primera rutina» · «Guarda los ejercicios que repites y empieza en un toque.» · «Nueva rutina».
- Fila «Historial» con chevron al final.

### 7.2 Editor de rutina (`RoutineEditorScreen`)
- Patrón formulario. Campo principal grande «Nombre de la rutina».
- Una tarjeta por ejercicio: nombre, debajo tres controles en fila: Series (Stepper 1–10), Reps (Stepper 1–30) y «kg» opcional (campo 64, placeholder `0`, teclado decimal, acepta coma).
- Reordenar con ↑ / ↓ (44, `text3`; desactivados en los extremos). Se elige botones y no arrastre: son exactos, accesibles y no pelean con el scroll.
- Quitar con el icono papelera (44, `text3`) → toast «Ejercicio quitado · Deshacer».
- Botón secundario «Añadir ejercicios» → selector. Pie fijo «Guardar rutina». Sin nombre: InlineError «Ponle un nombre».

### 7.3 Selector de ejercicios (hoja a altura completa)
- Buscador arriba con foco automático, placeholder «Buscar o crear ejercicio».
- Sin texto: «Recientes» (hasta 8, de tu historial, con el nombre normalizado de `utils/exerciseProgress.ts`) y el catálogo por grupos: Pierna, Empuje, Tirón, Core, Calistenia.
- Con texto: resultados que contienen el texto (sin tildes ni mayúsculas). Si ninguno coincide exacto, primera fila «Crear "texto"».
- Selección múltiple: CheckCircle 28 a la derecha; el número de orden aparece dentro del círculo. Pie fijo «Añadir 3 ejercicios» (desactivado con 0). Se añaden en el orden en que los marcaste.
- Modo «Reemplazar»: selección única; tocar una fila reemplaza y cierra.

### 7.4 Entreno en curso (`WorkoutDetailScreen`, modo `live`)
- **Barra superior** (56): ⋯ a la izquierda (Editar nombre y notas, Descanso: 90 s / sin descanso, Descartar entreno), cronómetro centrado `18:24` tabular `bodyStrong`, a la derecha botón pastilla ink «Terminar».
- Debajo, nombre editable 24/600 sin caja (subrayado accent al enfocar) y notas en `caption` si las hay.
- **Tarjeta por ejercicio**: título `bodyStrong` + ⋯ (Subir, Bajar, Reemplazar, Notas, Eliminar ejercicio con Deshacer). Debajo «La última vez: 80 kg × 5, 5, 4» en `text3`.
- **Tabla de series**, filas de 48: `SERIE` (28, número tabular) · `ANTERIOR` (flexible, `text3`, «80 × 5»; tocarla copia esos valores) · `KG` (64) · `REPS` (56) · ✓ (44). Cabecera en `label` `text3`. Campos `fill`, radio 10, texto centrado tabular, teclado decimal, aceptan coma. Placeholder: el valor anterior en `text4` si la fila está vacía.
- ✓: cuadrado 28 radio 8; hecho → `food` con marca blanca y la fila en `successSoft`. Háptico `light`. Si bate el mejor 1RM estimado: pastilla «PR» (`successSoft`/`success`, 11/600) junto al número y `success()` una vez por serie.
- Borrar serie: deslizar a la izquierda (`SwipeRow`) o mantener pulsado → menú «Eliminar serie». Siempre toast «Serie eliminada · Deshacer».
- «+ Añadir serie» (botón ghost 44 a lo ancho): copia kg y reps de la serie anterior, sin marcar.
- Al final «Añadir ejercicios» (secundario) → selector.
- **Descanso**: tras marcar una serie aparece una barra compacta de 56 encima del borde inferior (no modal): «Descanso» + `1:24` tabular, línea de progreso `workout` de 3 px, botones «−15», «+15» y «Saltar» (44). Por defecto 90 s, se ajusta de 15 en 15 (30–300) y se recuerda. Al llegar a 0: háptico `light`, «Descanso terminado» 2 s y se va. Con reducir movimiento la barra aparece con fundido.
- **Terminar**: si hay series con valores sin marcar → hoja «Tienes 3 series sin marcar» con «Marcarlas como hechas», «Descartarlas» y «Seguir entrenando». Las series vacías se descartan sin preguntar. Si no queda ninguna serie hecha → «¿Descartar el entreno vacío?». Después: `completed = true`, `duration_minutes` desde `started_at`.
- **Resumen** (hoja): título «Entreno terminado», 4 cifras en rejilla 2×2 (Duración `52 min`, Volumen `4.250 kg`, Series `18`, PRs `2`), lista de PRs («Sentadilla · 82,5 kg × 5»), botones «Guardar como rutina» (secundario) y «Listo» (primario).
- **Descartar**: ConfirmSheet «¿Descartar el entreno?» · «Se borran sus ejercicios y series.» · «Descartar».

### 7.5 Historial y edición
- `WorkoutHistoryScreen`: lista paginada (30 por página) con fecha «jue 16 oct», nombre y a la derecha «52 min · 4.250 kg». Desde Datos (enlace «Historial» en Entrenos) y desde Empezar.
- Tocar abre `WorkoutDetailScreen` en modo `edit`: misma tabla, sin cronómetro ni descanso, cabecera «Cancelar» / fecha / «Listo», ⋯ con «Eliminar entreno» (ConfirmSheet). Todo cambio se guarda al momento.

### 7.6 Hoy
- Celda Movimiento: tocar sigue marcando «me he movido»; lleva una pastilla «Entreno» (como «+250» del agua) que abre Empezar.
- Con un entreno en curso, bajo la barra del día: tarjeta compacta 48 «Entreno en curso · 23 min» + «Continuar» (accent). Tocarla abre la sesión.

### 7.7 Datos y escritura
- La sesión se pinta desde el estado local: cada cambio se ve al instante, se guarda en segundo plano en orden y, si falla, se deshace con toast «No se ha guardado. Lo hemos deshecho.»
- kg y reps se guardan 400 ms después de dejar de escribir (y al salir del campo o terminar).
- Los ids se generan en el móvil, así las filas nuevas existen antes de que conteste el servidor.
- Reordenar guarda `order_index`; borrar un ejercicio o un entreno borra sus hijos (en Supabase por `ON DELETE CASCADE`, en local por la misma regla en `lib/localStore.ts`).
- Rutina ↔ entreno: `workouts.template_id` (nullable, migración `20261021120000`); sin esa columna, «última vez» se calcula por nombre.

---

## 8. Plan · Calendario v1.3 (`features/plan`, `docs/design/plan-calendario.html`)
Referencia: Notion Calendar. Rejilla limpia, «Hoy» siempre a mano, deslizar para cambiar de periodo, tocar un hueco para crear, franja compacta de todo el día.

### 8.1 Cabecera (común)
- Fila 1: «octubre 2026» `headline` en minúsculas (en Semana que cruza meses: «sep – oct 2026»); a la derecha «Hoy» (pastilla 44 con borde) y + (44, ink) → hoja «Evento» / «Tarea» para el día seleccionado o, si no hay, el primero visible.
- Fila 2: Segmentado **Mes · Semana · Día · Lista**. Se recuerda (`lifepp_plan_view`). Cambio de vista: háptico `selection`, sin animación de transición.

### 8.2 Mes
- Letras L M X J V S D (`label`, `text3`). Siempre 6 filas → alto fijo, paginación exacta.
- Celda: número 15/600 tabular (fuera de mes `text4`; hoy en círculo ink 28 con número blanco; seleccionado con anillo ink 1,5).
- Debajo hasta 3 marcas: evento = punto 6 `accent`; tarea pendiente = cuadrado 6 radio 1,5 `text2`; tarea hecha = cuadrado `text4`. Más de 3: «+N» 10/600 `text3`.
- Deslizar en horizontal cambia de mes (pager). Tocar un día abre Día en ese día.

### 8.3 Semana
- Cabecera de 7 columnas (letra + número; hoy en círculo ink). Columna de horas de 40 a la izquierda.
- **Franja de todo el día**: eventos sin hora y tareas con esa fecha como chips de 20 (evento `accentSoft`/`accent`, tarea `fill` con cuadrado). Más de 2 por día → «+N» que abre Día.
- **Rejilla**: 48 por hora, líneas `line`, desplazamiento vertical; al abrir se sitúa 1 h antes de ahora. Línea de ahora `danger` 2 px con punto 8 solo en la columna de hoy.
- Evento: bloque `accentSoft` radio 6 con barra 3 `accent`, título 12/600 y hora 11. Desde `event_time` hasta `end_time` (1 h si no hay). Mínimo visual 22 px.
- Solapes: los eventos que se cruzan forman un grupo; cada uno toma la primera columna libre y el ancho se reparte entre las columnas del grupo (algoritmo en `features/plan/calendarLayout.ts`, con tests).
- Tocar un hueco: abre Evento con ese día y la hora redondeada a 15 min (fin +1 h). Tocar un evento: lo abre.
- Arrastrar para mover: no en esta versión (ver informe).

### 8.4 Día
- Cabecera de día «jueves 16» con ‹ › (44) y deslizar para cambiar de día.
- Franja de todo el día + columna horaria única (misma rejilla que Semana, una columna) solo con las horas que tienen eventos ±1 h; sin eventos con hora, la columna no se muestra.
- Debajo, la tarjeta de Tareas de siempre: añadir rápido, CheckBox, deslizar para borrar con Deshacer y ⋯.

### 8.5 Lista
- Exactamente el Plan v1.2: tira semanal en tarjeta, agenda del día y tareas del día. Nada se pierde.

### 8.6 Rendimiento
- Pager horizontal (`FlatList` con `getItemLayout`, `windowSize` 3): solo se pinta el periodo visible ± 1.
- Los datos del periodo visible ± 1 se piden por rango de fechas y se agrupan una vez por cambio en `Map<yyyy-MM-dd, {events, tasks}>`; ninguna celda filtra la lista entera.

### 8.7 Evento
- Campos: Título, Fecha (selector), Hora y «Hasta» (`TimePill`), Lugar, Descripción. «Hasta» debe ser posterior a «Hora»: si no, InlineError «Tiene que acabar después de empezar».
- `events.end_time` (TIME NULL) llega con la migración `20261021120000`; sin ella, «Hasta» no se muestra y se asume 1 h.

---

## 9. Hojas v1.3 (`components/ui/sheet`)
- Un único `SheetHost` montado en la raíz (dentro de `GestureHandlerRootView`, encima del navegador). Cada hoja es una capa que vive fuera de pantalla con `pointerEvents="none"` y oculta a lectores de pantalla mientras está cerrada. No hay `Modal`: abrir solo mueve valores compartidos en el hilo de UI.
- Abrir: `translateY` de la altura de la hoja a 0, `withTiming` 240 ms `Easing.bezier(0.2, 0, 0, 1)`; fondo 0 → 1 en 200 ms a la vez. Cerrar: 180 ms `Easing.bezier(0.4, 0, 1, 1)` y el fondo se apaga. Sin muelle ni rebote.
- La altura se mide con la hoja ya montada fuera de pantalla: nunca se pinta en una posición equivocada.
- Arrastrar hacia abajo cierra (más de 90 px o velocidad > 800); si no, vuelve con la misma curva de abrir. Tocar el fondo cierra. Atrás de Android cierra la hoja de arriba (`BackHandler`); en web, Escape.
- Con reducir movimiento: fundido de 120 ms, sin desplazamiento.
- La hoja Añadir se monta una vez y su contenido no se vuelve a pintar al abrir: sin animaciones de entrada en los tiles.
- Altura completa (selector de ejercicios): arriba queda el margen seguro + 8; solo el asa arrastra, para no pelear con la lista.
- Con teclado, la hoja sube con él.
