# Rendimiento · v1.3

Comparación entre `e6d1c9b` (antes de la v1.3) y la v1.3. Medido con `npx expo export`.

## Tamaño del bundle

| Plataforma | Antes | v1.3 | Cambio |
|---|---|---|---|
| Web (JS) | 4,51 MB | 3,02 MB | −33 % |
| Android (Hermes, .hbc) | 6,91 MB | 7,38 MB | +7 % |

- En web baja porque `babel/lucideIcons.js` importa cada icono por separado, en vez de todo el barrel de lucide.
- En Android sube porque la v1.3 añade mucho código: el entrenamiento completo, el calendario y TanStack Query. El tamaño del bytecode influye poco en la RAM. Lo que más pesa en la RAM son los datos que se cargan, abajo.

## Datos que carga cada pantalla

| Pantalla | Antes | v1.3 |
|---|---|---|
| Hoy | Historial completo de agua, sueño, comidas, entrenos, ánimo y hábitos | Solo el día. Hábitos: un año, para las rachas. Tareas: solo las abiertas |
| Plan | Todas las tareas y todos los eventos | El periodo visible ±1 (mes, semana o día) |
| Datos | Historial completo de cada tabla | La ventana elegida (semana, mes o 3 meses) más el periodo anterior, para comparar |
| Diario | Todas las entradas | Las 365 más recientes |
| Fuerza | Todas las series, paginadas | Igual (paginado de 1.000 en 1.000) |

## Memoria en ejecución

- **Base local** (`lib/localStore.ts`). Antes, cada consulta leía y parseaba con `JSON.parse` la base entera, y cada escritura volvía a serializarla. Ahora se carga una vez en memoria y se guarda por tablas (`lifepp_local_db:<tabla>`). Las escrituras se agrupan con un pequeño retardo y se vuelcan al pasar la app a segundo plano.
- **Caché de datos.** TanStack Query sustituye a las cachés sueltas a nivel de módulo (`todayCache` y el bus `refreshDay`). Una consulta sin pantallas que la usen se libera a los 5 minutos (`gcTime`) y se refresca si tiene más de 30 s (`staleTime`). Las escrituras invalidan solo las tablas que tocan.
- **Hojas.** Hay una sola capa (`SheetHost`) montada una vez. Abrir una hoja solo anima valores en el hilo de UI, sin montar un `Modal`.
- **Entreno.** Las escrituras de kg y reps esperan unos 400 ms tras la última tecla y van por una cola. Crear una sesión desde una rutina inserta los ejercicios y las series en lote, sin una consulta por ejercicio.

## Medirlo en el móvil

Con el móvil conectado por USB y la depuración USB activada:

```
adb shell dumpsys meminfo com.pceba.lifepp
```

Fíjate en `TOTAL PSS`. Para comparar, ábrela en frío, pasa por Hoy, Plan (Mes y Semana), Datos y un entreno, y vuelve a medir.
