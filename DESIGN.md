---
name: Workset
description: Planificador de entrenamiento para coaches de fuerza, construido como un clon fiel de Geist, el sistema de diseño de Vercel.
colors:
  ink: "rgb(23, 23, 23)"
  muted-ink: "rgb(77, 77, 77)"
  faint-ink: "rgb(143, 143, 143)"
  surface: "rgb(255, 255, 255)"
  page: "rgb(250, 250, 250)"
  subtle-fill: "rgb(242, 242, 242)"
  hairline: "rgba(0, 0, 0, 0.08)"
  border: "rgb(235, 235, 235)"
  vercel-blue: "rgb(0, 114, 245)"
  vercel-blue-hover: "rgb(0, 98, 209)"
  danger-red: "rgb(203, 42, 47)"
  warning-amber: "rgb(255, 178, 36)"
  success-green: "rgb(41, 122, 58)"
  data-teal: "rgb(6, 122, 110)"
  data-purple: "rgb(120, 32, 188)"
  data-pink: "rgb(189, 40, 100)"
  contrast-fg: "#ffffff"
typography:
  display:
    fontFamily: "Geist Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 600
    lineHeight: "40px"
    letterSpacing: "-1.28px"
  headline:
    fontFamily: "Geist Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: "32px"
    letterSpacing: "-0.96px"
  title:
    fontFamily: "Geist Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: "24px"
    letterSpacing: "-0.32px"
  body:
    fontFamily: "Geist Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
    letterSpacing: "normal"
  label:
    fontFamily: "Geist Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "16px"
    letterSpacing: "normal"
  button:
    fontFamily: "Geist Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: "20px"
    letterSpacing: "normal"
  chrome:
    fontFamily: "Geist Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "10px"
    fontWeight: 500
    lineHeight: "16px"
    letterSpacing: "0.05em"
  mono:
    fontFamily: "Geist Mono, ui-monospace, SFMono-Regular, monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "18px"
    letterSpacing: "normal"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  2xl: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
  3xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "36px"
    typography: "{typography.button}"
  button-primary-hover:
    backgroundColor: "rgba(0, 0, 0, 0.9)"
    textColor: "{colors.surface}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "36px"
    typography: "{typography.button}"
  button-secondary-hover:
    backgroundColor: "{colors.subtle-fill}"
    textColor: "{colors.ink}"
  button-tertiary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "36px"
    typography: "{typography.button}"
  button-error:
    backgroundColor: "{colors.danger-red}"
    textColor: "{colors.contrast-fg}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "36px"
    typography: "{typography.button}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "40px"
    typography: "{typography.body}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "24px"
  menu:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "4px"
  badge-solid:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
    typography: "{typography.label}"
  badge-subtle:
    backgroundColor: "{colors.subtle-fill}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
    typography: "{typography.label}"
---

# Design System: Workset

## Overview

**Creative North Star: "Vercel for Coaches"**

Workset es un planificador de entrenamiento para coaches de fuerza — powerlifting en primer lugar, halterofilia y disciplinas afines después. Su sistema de diseño no es una interpretación: es un clon fiel de Geist, el sistema de Vercel. Los patrones, los tokens, la tipografía, los materiales y los iconos vienen tal cual de Geist y se usan como Vercel los usa. Cuando aparece una duda de estilo, la respuesta no se inventa: se busca en `~/.claude/skills/geist-design-system/` y se copia.

La consecuencia de esa fidelidad es un producto que se lee como una herramienta de desarrollador aplicada al entrenamiento: superficies planas, bordes de un píxel, gris casi en todo, y una jerarquía que se resuelve con tamaño y contraste antes que con decoración. El plan del atleta es el único contenido con derecho a color; el resto de la interfaz se aparta.

La densidad se decide por falta, no por exceso: solo lo esencial en pantalla. Una vista que necesita explicarse con más elementos está mal planteada, no falta de espacio. El calendario anual es la excepción justificada — es un instrumento de lectura, y ahí la información se compacta a propósito — pero incluso ahí cada marca existe porque codifica un dato del plan.

**Key Characteristics:**
- Fidelidad literal a Geist: componentes copiados desde la skill, nunca reestilizados
- Neutro por defecto; el color es dato, no adorno
- Superficies planas con borde de un píxel simulado por sombra, sin elevación decorativa
- Geist Sans en toda la jerarquía, con tracking negativo en headings y peso 400 en el cuerpo
- Minimalismo por sustracción: lo esencial en pantalla, nada más
- Un solo juego de tokens que se voltea entre claro y oscuro sin overrides

## Colors

Ocho escalas Geist de diez pasos cada una (`--ds-gray-*`, `--ds-gray-alpha-*`, `--ds-blue-*`, `--ds-red-*`, `--ds-amber-*`, `--ds-green-*`, `--ds-teal-*`, `--ds-purple-*`, `--ds-pink-*`), más dos fondos. Los valores viven verbatim en `src/app/geist-tokens.css`, extraídos de vercel.com/geist/colors, con un bloque `:root` claro y un bloque `.dark` que los voltea. Un color elegido una vez lee correctamente en ambos temas porque lo que cambia es el token, no la clase.

### Primary
- **Ink** (`--ds-gray-1000`): el texto de máximo contraste y el relleno del botón primario. En claro es casi negro, en oscuro casi blanco — el botón primario invierte con el tema, igual que en Vercel.
- **Vercel Blue** (`--ds-blue-700`): el azul del sistema. Links, anillo de foco (`--ds-focus-color`), estados informativos y el tipo de ciclo azul. No es un acento de marca que se reparte por la página: aparece donde hay navegación o un estado que informar.

### Secondary
- **Muted Ink** (`--ds-gray-900`): texto secundario, iconos, captions y ejes. Es el paso más bajo que sigue siendo seguro para texto sobre `--ds-background-100`; por debajo de 900 no se escribe.
- **Faint Ink** (`--ds-gray-700`): placeholders y texto deshabilitado. Nada que deba leerse a distancia vive acá.

### Tertiary
Los colores restantes cumplen doble función: semántica en la interfaz y codificación de datos en el plan.

- **Danger Red** (`--ds-red-900`, `-800` en rellenos sólidos): errores, acciones destructivas, el rechazo de un arrastre inválido.
- **Warning Amber** (`--ds-amber-700`): advertencias y el tipo de ciclo ámbar. Sobre ámbar sólido el texto va negro.
- **Success Green** (`--ds-green-900`): confirmaciones y estados positivos.
- **Data Teal / Purple / Pink** (`--ds-teal-900`, `--ds-purple-900`, `--ds-pink-900`): sin carga semántica; existen para que un coach distinga tipos de ciclo entre sí.

### Neutral
- **Surface** (`--ds-background-100`): fondo de cards, menús, modales e inputs — blanco en claro, casi negro en oscuro.
- **Page** (`--ds-background-200`): el fondo de la página, un paso por detrás de las superficies.
- **Subtle Fill** (`--ds-gray-100` / `-200`): hovers, chips y fondos de estado.
- **Border** (`--ds-gray-400`) y **Hairline** (`--ds-gray-alpha-400`): separadores y bordes de UI. El alfa se usa cuando la línea cruza contenido con fondo propio, porque se apoya sobre lo que haya debajo.

### Named Rules
**The Token-Only Rule.** Ningún color se escribe como hex, `rgb()` u `oklch()` dentro de un componente. Solo `var(--ds-*)` o los tokens semánticos (`bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`). Un literal de color en un `.tsx` es un bug.

**The No-Dark-Override Rule.** Nunca se escribe `dark:` para un color basado en token: la clase `.dark` ya lo voltea. La regla gobierna el código que escribimos nosotros. Dos excepciones, y las dos vienen del propio Geist:

- Los rellenos sólidos de la paleta de ciclos (`CHIP_CLASS` en `src/lib/cycles/types.ts`), donde el sistema elige un paso distinto por tema porque un 900 sólido se pierde sobre fondo oscuro.
- Los `dark:` que ya traen los componentes copiados de la skill, que se usan tal cual. `modal.tsx` es el caso vivo: hunde su cuerpo y su footer a `--ds-background-200` solo en oscuro, porque en claro ese escalón sería un gris 250 sobre blanco que ensucia más de lo que separa. Reestilizar un componente copiado es la infracción; conservar su `dark:` no lo es.

**The Grouping-Is-A-Ground Rule.** Agrupar se marca con un fondo alfa, nunca con el color de la tinta. El color del texto ya codifica jerarquía (1000 principal, 900 secundario) y pertenencia al rango (700 fuera de él): alternarlo por grupo le daría dos significados al mismo token.

**The Step Rule.** El paso dice el trabajo: 100–200 fondos sutiles, 300–400 bordes, 500–600 bordes de alto contraste, 700 relleno sólido y acento, 800 hover del sólido, 900 texto secundario, 1000 texto principal.

## Typography

**Display Font:** Geist Sans (fallback `ui-sans-serif, system-ui, sans-serif`), cargada con `next/font/google` en `--font-sans`
**Body Font:** Geist Sans — el sistema es de una sola familia
**Label/Mono Font:** Geist Mono (`--font-mono`), para fechas técnicas, identificadores, rutas y valores tabulares

**Character:** Geist es una grotesca neutra de raíz suiza, de formas cerradas y altura de x generosa; a tamaño de interfaz es invisible, y en headings el tracking negativo la compacta hasta que el título se lee como un bloque sólido. No hay contraste de familias: toda la jerarquía se construye con tamaño, peso y color.

Las utilidades viven en `src/app/geist-typography.css` como clases `@utility` de Tailwind v4, extraídas verbatim de vercel.com/geist/typography. Se usan tal cual; no se componen tamaños a mano.

### Hierarchy
- **Display** (`text-heading-32`, peso 600, 32/40px, tracking -1.28px): título de página. Es el escalón más alto que usa el producto; `text-heading-72/64/56/48/40` existen en el sistema y quedan para superficies de marketing.
- **Headline** (`text-heading-24`, peso 600, 24/32px, tracking -0.96px): título de sección dentro de una página.
- **Title** (`text-heading-20` / `text-heading-16`, peso 600): subsecciones, títulos de card y de modal.
- **Body** (`text-copy-14`, peso 400, 14/20px): el tamaño por defecto de la aplicación. `text-copy-16` para el párrafo de entrada bajo un título de página; `text-copy-13` para texto secundario denso.
- **Label** (`text-label-12`, peso 400, 12/16px): chrome de interfaz — chips, ejes, captions, metadatos. `text-label-13` y `-14` para chrome más grande.
- **Chrome de 10px** (peso 500, `uppercase`, `tracking-wider`): el único escalón fuera de la rampa, y no lo inventamos nosotros — es como el `Calendar` de Geist marca sus encabezados de día de semana (`src/components/ui/calendar.tsx`). Vive solo ahí: encabezados de columna de una grilla de días. Cualquier otro 10px en la app es un error.
- **Button** (`text-button-14`, peso 500, 14/20px): el único lugar donde el peso 500 aparece sin ser un heading.
- **Mono** (`text-copy-13-mono` / `text-label-13-mono`): fechas técnicas, identificadores y cualquier valor que deba alinearse en columna.

### Named Rules
**The Utility-Only Rule.** La tipografía se aplica con las utilidades de Geist, nunca con un `text-xl font-bold` ad hoc. Si un tamaño no existe en la escala, no se necesita ese tamaño.

**The 500 Rule.** El peso 700 no se usa. `<strong>` dentro de cualquier utilidad de Geist sube a 500, los headings son 600 y los botones 500. Un 700 en pantalla es un error de sistema, no un énfasis.

## Layout

Ritmo de 4px en todo: los valores de espaciado son múltiplos de 4 y se expresan con la escala de Tailwind (`gap-2` = 8px, `p-6` = 24px). Las páginas de aplicación son un contenedor centrado con 24px de padding lateral que baja a 16px en móvil; las pantallas de autenticación son una card centrada de ancho fijo (550px en `/signup`) sobre el fondo de página.

La aplicación es mobile-first: cada vista se define primero a ancho de teléfono y crece con los breakpoints de Tailwind. Lo que no cabe se apila; lo que no puede apilarse — el calendario anual, las tablas de configuración — vive dentro de un `Scroller` con scroll horizontal propio, nunca haciendo que la página entera se desplace de lado.

La densidad se decide por vista: formularios y modales respiran con 24px internos y 16px entre campos; las superficies de datos (calendario, tablas) se compactan a filas de 32px y texto de 12–13px porque su trabajo es que se lean muchas semanas de un vistazo.

### Named Rules
**The Essential-Only Rule.** Antes de agregar un elemento a una pantalla, se quita otro. Una vista de Workset muestra lo que el coach necesita para decidir, y nada que solo llene espacio.

**The Own-Scroller Rule.** Ninguna superficie ancha empuja el scroll horizontal de la página: se envuelve en `Scroller` y se desplaza dentro de su propio marco.

## Elevation & Depth

El sistema es plano. La profundidad se comunica con un borde de un píxel simulado por `box-shadow` — el patrón *shadow-border* de Geist — y no con sombras difusas. Las superficies en reposo no flotan: una card es una superficie con borde, no un objeto levantado. Solo lo que realmente está por encima del documento (menús, tooltips, modales, drawers) recibe sombra, y recibe exactamente la que define su material.

Las utilidades `material-*` (en `src/app/geist-materials.css`) combinan fondo, shadow-border y radio en una sola clase, y son la única forma autorizada de dar superficie a algo.

### Shadow Vocabulary
- **`material-base`** (6px, solo borde): cards planas e inputs. Sin elevación.
- **`material-small`** (6px, `--ds-shadow-border-small`): cards apenas levantadas — el patrón de las pantallas de auth.
- **`material-medium`** / **`material-large`** (12px): paneles y popovers.
- **`material-menu`** (12px, `--ds-shadow-menu`): menús desplegables y de contexto. Es el material más usado del producto.
- **`material-tooltip`** (6px, `--ds-shadow-tooltip`): tooltips.
- **`material-modal`** (12px, `--ds-shadow-modal`): diálogos y command menus.
- **`material-fullscreen`** (16px): overlays a pantalla completa y drawers.

### Named Rules
**The Material-Or-Nothing Rule.** Una superficie flotante usa su material. No se componen sombras a mano ni se mezclan `shadow-*` de Tailwind con tokens de Geist.

**The Flat-At-Rest Rule.** En reposo, todo es plano. La sombra es respuesta a un estado — abierto, arrastrado, enfocado — no una propiedad decorativa de la superficie.

## Shapes

Radios de Geist, asignados por rol del control y no por gusto: 4px (`rounded-sm`) para chips y controles diminutos, **6px (`rounded-md`) para controles estándar** — botones, inputs, cards planas —, 8px (`rounded-lg`) para controles grandes, **12px (`rounded-xl`) para superficies flotantes** — menús, modales, popovers — y 16px para overlays a pantalla completa. `rounded-full` queda para badges, avatares y puntos de estado.

Los bordes son de un píxel y de color neutro: `--ds-gray-400` cuando el borde es parte del control, `--ds-gray-alpha-400` cuando la línea cruza contenido. El foco nunca se dibuja como cambio de borde: es el anillo `--ds-focus-ring` (2px de fondo + 2px de azul) o, en superficies densas, un `outline` de 2px en `--ds-gray-1000` pegado a la forma.

### Named Rules
**The Radius-By-Role Rule.** El radio lo decide qué es la cosa, no cómo queda: 6px si es un control, 12px si flota. Un menú con 6px o un botón con 12px están mal, aunque se vean bien.

## Components

Los componentes se copian desde `~/.claude/skills/geist-design-system/assets/components/ui/` hacia `src/components/ui/` junto con las dependencias internas que liste su referencia, después de leer `references/<nombre>.md`. Una vez copiados no se reestilizan: se componen con tokens y con las variantes que ya traen.

### Buttons
- **Shape:** 6px en tamaños estándar (`rounded-md`), 4px en `xs`, 8px en `lg`. Alturas: 24px (`xs`), 32px (`sm`), 36px (`md`, el predeterminado), 40px (`lg`).
- **Primary:** relleno `--ds-gray-1000` con texto `--ds-background-100` — negro sobre blanco en claro, blanco sobre negro en oscuro. Peso 500, 14px.
- **Secondary / Outline:** fondo de superficie con borde `--ds-gray-400`; hover a `--ds-gray-100`.
- **Tertiary / Ghost:** transparente; hover a `--ds-gray-alpha-200`. Es el botón por defecto dentro de tablas y barras densas.
- **Error / Warning:** `--ds-red-800` con texto blanco; `--ds-amber-800` con texto negro.
- **Link:** texto en `--ds-blue-700`, subrayado en hover.
- **Hover / Focus:** todas las variantes usan `focus-visible:shadow-[var(--ds-focus-ring)]`; al presionar, el botón baja un píxel (`active:translate-y-px`). Deshabilitado: fondo `--ds-gray-100`, texto `--ds-gray-700`, sin sombra.

### Chips
- **Style:** `rounded-full`, 2px de padding vertical y 8px horizontal, peso 500, `tabular-nums`.
- **State:** cada color de la paleta existe en versión sólida (fondo del color, texto `--ds-contrast-fg`) y `-subtle` (fondo del paso 200, texto del paso 900). Lo sólido marca una decisión del coach; lo `-subtle`, un estado del sistema.

### Cards / Containers
- **Corner Style:** 6px para cards de contenido; 12px si la card flota.
- **Background:** `--ds-background-100` sobre el fondo de página `--ds-background-200`.
- **Shadow Strategy:** `material-base` en reposo, `material-small` cuando la card es el foco de la pantalla (ver Elevation & Depth).
- **Border:** el shadow-border del material; no se agrega un `border` encima.
- **Internal Padding:** 24px en cards de formulario, 12–16px en cards densas.

### Inputs / Fields
- **Style:** fondo de superficie, radio de 6px, borde de un píxel por shadow-border, altura de 32/40/48px según tamaño. Texto de 14px peso 400; placeholder en `--ds-gray-700`.
- **Label:** 13px peso 500 en `--ds-gray-900`, 8px por encima del campo.
- **Focus:** `--ds-focus-ring`. El borde no cambia de color.
- **Error:** borde y texto de ayuda en `--ds-red-900`, con icono a la izquierda del mensaje, 8px debajo del campo.
- **Disabled:** cursor `not-allowed`, fondo `--ds-gray-100`.

### Navigation
- Header de aplicación: alto fijo, fondo de superficie, separador inferior de un píxel, marca a la izquierda y acciones a la derecha. Tipografía de 14px; el ítem activo en `--ds-gray-1000` y el resto en `--ds-gray-900`.
- Los menús desplegables usan `material-menu`, con ítems de 32px de alto, radio interno de 6px y hover en `--ds-gray-alpha-200`.

### Year Calendar (componente de firma)
La superficie que define el producto: un año de entrenamiento en una sola grilla de 53 columnas de 34.43px, dentro de su propio `Scroller`.

- **Eje y encabezados:** los nombres de mes y las letras de día comparten tipografía (14px, peso 500, `--ds-gray-1000`); los números de semana quedan en 12px `--ds-gray-900`. El eje de días es sticky y se cierra con una línea vertical de un píxel.
- **La matriz:** siete filas de chips de día de 32px, acotadas arriba y abajo por dos reglas de un píxel en `--ds-gray-alpha-400`. El día de hoy es un chip azul sólido, sin anillo.
- **Las tres marcas del plan:** el macrociclo es un caption gris con un bracket de línea fina que mide su alcance; el bloque es la barra sólida y coloreada; el microciclo es un chip de una columna bajo su barra. Tres pesos distintos, definidos en `src/components/calendar/chips.tsx` y compartidos con la vista previa de ajustes para que nunca discrepen. Un bloque sin tipo no se rellena de gris sólido — sería lo más ruidoso de un plan vacío — pero lleva un borde de 1px, porque a 1.19:1 el relleno solo leía como un hueco en el card.
- **Foco y selección son marcas distintas:** el foco es un `outline` de 2px por fuera de la forma; la selección, una hairline de 1px por dentro. Nunca las dos a la vez sobre el mismo objeto — sumadas dan un borde de 3px que no es ninguna de las dos.
- **El rechazo se dibuja durante el gesto**, no al final: un rango que no puede ser bloque se pinta rojo mientras el puntero lo estira, y el eje deja de confirmarlo. El mensaje en la esquina llega después y solo repite lo que la matriz ya dijo.
- **El año vacío** se explica donde irían sus bloques, en el alto exacto de las filas del plan, así que el card no cambia de tamaño según si el atleta tiene plan o no.
- **La matriz no se tiñe de color:** el alcance de un bloque lo dicen su barra, sus micros y su bracket, apilados bajo la misma columna. Pintar además las semanas era decir cuatro veces lo mismo, y costaba la legibilidad de los números.
- **La zebra de meses:** los meses impares llevan un fondo `--ds-gray-alpha-100` detrás de sus días, del 1 al último día real del mes — no de la columna. Donde un mes cambia a mitad de semana la banda escalona sobre el día mismo, así que una columna compartida se lee partida entre los dos meses.

## Do's and Don'ts

### Do:
- **Do** leer `references/<componente>.md` de la skill Geist antes de usar un componente, y copiar el archivo más las dependencias internas que liste a `src/components/ui/`.
- **Do** usar solo `var(--ds-*)` o los tokens semánticos para color; la clase `.dark` hace el resto.
- **Do** aplicar tipografía con `text-heading-*`, `text-copy-*`, `text-label-*` y `text-button-*`.
- **Do** dar superficie con las utilidades `material-*`, eligiendo el material por lo que la cosa es (menú, tooltip, modal).
- **Do** tomar los iconos de `assets/components/icons.tsx` de la skill, buscándolos por nombre con grep y sin leer el archivo entero (9k líneas).
- **Do** mantener el ritmo de 4px y las alturas de control de Geist (24 / 32 / 36 / 40px).
- **Do** quitar antes de agregar: si una vista necesita un elemento más para entenderse, revisar primero qué sobra.
- **Do** dejar que el color signifique algo — tipo de ciclo, estado, error — y que el resto sea gris.

### Don't:
- **Don't** escribir un color literal (hex, `rgb()`, `oklch()`) dentro de un componente.
- **Don't** escribir `dark:` para un color basado en token; el token ya voltea.
- **Don't** reestilizar un componente copiado de la skill para que "quede mejor": se componen las variantes documentadas.
- **Don't** usar peso 700 ni tamaños de texto fuera de la escala de Geist.
- **Don't** inventar sombras ni mezclar `shadow-*` de Tailwind con los materiales.
- **Don't** usar iconos de lucide, caracteres unicode (`→`, `×`, `✓`) ni SVG dibujados a mano cuando el icono existe en el set de Geist.
- **Don't** dibujar el foco como un cambio de borde; el anillo de foco es `--ds-focus-ring`.
- **Don't** llenar una pantalla con elementos decorativos, ilustraciones de relleno o métricas que el coach no va a usar.
