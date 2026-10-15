# Lifepp — Sistema de diseño y especificación del rediseño

Fuente de verdad visual: los mockups de `docs/design/*.html` (son HTML de referencia, con datos de ejemplo en un bloque `renderVals()`; no se ejecutan en la app). Este documento manda si hay contradicción.

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
| `accent` | `#2448D8` | Acento único (links, selección, hábitos) |
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
- **Sheet** — hoja inferior con asa 36×5, radio 28, scrim. Usar `@gorhom/bottom-sheet` (solo JS sobre reanimated + gesture-handler, ya instalados).
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

### Hoy (`docs/design/Hoy.html`)
- Cabecera: overline con el día de la semana en accent («JUEVES»), título «15 de octubre», a la derecha círculo 40 con la inicial → Ajustes.
- **Resumen en una frase** (utils/dayBrief): «Te falta 0,8 L de agua y quedan 2 hábitos. «Entregar TFG» vence hoy.» Las cifras en peso 600.
- **Barra de progreso del día**: 9 segmentos (agua, sueño, movimiento, comida, hábitos…), rellenos en accent, texto «5 de 9».
- Rejilla 2×2 de tarjetas métricas: Agua (1,2 / 2 L + barra), Sueño (7,5 h), Movimiento («Pendiente · Toca para marcar»), Comida (1.240 / 2.000 kcal). Tocar abre el registro correspondiente; mantener en Agua suma 250 ml.
- **Hábitos** «2 de 4» + «Añadir»: filas con CheckCircle del color del hábito, nombre, «12 días» de racha si ≥ 2, y mini semana de 7 puntos (hoy con anillo).
- **¿Cómo estás hoy?**: 5 caras (Mal, Regular, Normal, Bien, Genial) → `mood_score` 1–5. Seleccionada en accent.
- **Tareas** «3 hoy» + «Ver plan»: CheckBox + título + etiqueta «ALTA» en danger si prioridad alta.

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

### Ajustes (`docs/design/Ajustes.html`)
- Título «Ajustes» + «Listo».
- Aviso warningSoft si la cuenta es anónima: «Vincula tu email para no perder tus datos».
- Grupos con etiqueta en mayúsculas: **Cuenta** (Email · Vincular / email verificado), **Objetivos** (Steppers: Agua 2,0 L paso 0,25; Calorías paso 50; Sueño paso 0,5 h), **Recordatorios** (Agua, Hábitos, Tareas: TimePill + Switch; nota «Solo te avisamos si aún no has cumplido ese objetivo.»), **Claude** (estado con punto verde y «último uso hace 2 h», «Crear enlace nuevo», «Desconectar» con ConfirmSheet).
- Pie «Lifepp x.y.z» con la versión real de la app.

---

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
