# Informe técnico: Mapa de Marte

NASA Space Apps Challenge 2026 · Reto «Guía de supervivencia interplanetaria: Mapa de Marte». Documento de referencia para empezar el desarrollo.

Nov 14, 2026 · @Mayer

## 1. Resumen ejecutivo

Proponemos **MarsWalk**, un planificador web de caminatas marcianas (EVA) sobre el cráter Jezero. Combina capas de varias misiones de la NASA y traza la ruta más segura hacia un objetivo científico. El nombre es provisional.

El reto pide una «vista integrada y por capas» de una ubicación o ruta en Marte, construida con datos de múltiples misiones. Debe ayudar a un astronauta a planificar una caminata segura y, a la vez, a hacer descubrimientos científicos.

MarsWalk responde tres preguntas en una sola pantalla:

- **¿Por dónde voy?** Ruta automática que evita pendientes y terreno rugoso.

- **¿Cuándo salgo?** Condiciones de temperatura, viento, polvo y radiación, a partir de datos históricos de superficie.

- **¿Para qué voy?** Paradas con valor científico (minerales, hielo) y un briefing breve en cada una.

Lo que evalúa el jurado es una demo de máximo 30 segundos o 7 diapositivas, junto con un formulario en inglés. La entrega cierra el **domingo 15 de noviembre a las 23:59, hora de Lima**.

## 2. Arquitectura propuesta

La app es un sitio estático, sin servidor propio. Los datos pesados se procesan una sola vez en Python y se guardan como archivos ligeros en el repo. Así la demo no depende de un backend que pueda caerse.

arquitectura de MarsWalk · fuentes, preprocesado y app

Solo los mosaicos del mapa base se piden en vivo a Mars Trek, y hay una copia local de respaldo. El cálculo de la ruta (resaltado) es el núcleo de la app.

## 3. Sitio de trabajo: cráter Jezero

Trabajaremos solo en **Jezero** (aprox. 18,4° N, 77,5° E, borde de Isidis Planitia; unos 45 km de diámetro). Acotar el área a un solo sitio hace manejable el volumen de datos en 36 horas.

Por qué este sitio:

- **Verdad de terreno:** Perseverance opera allí desde febrero de 2021. Lo que muestran las imágenes orbitales se puede contrastar con lo que mide el rover en superficie.

- **Cobertura densa:** hay imágenes HiRISE y CTX y modelos de elevación de alta resolución del sitio de aterrizaje.

- **Ciencia atractiva:** un antiguo delta fluvial con arcillas y carbonatos. Ofrece objetivos claros para las paradas de la ruta.

- **Clima de superficie:** la estación MEDA de Perseverance aporta temperatura, viento, presión y polvo del mismo lugar.

Para la demo fijamos un **hábitat ficticio** en el piso del cráter y dos o tres objetivos científicos en el frente del delta. La ubicación exacta se decide al revisar los datos (ver Preguntas abiertas).

## 4. Capas de datos y fuentes NASA

Cada capa viene de una misión distinta. Eso responde directamente a la exigencia del reto de combinar «múltiples misiones científicas».

| Capa | Uso para el astronauta | Misión / instrumento | Acceso |
| --- | --- | --- | --- |
| Mapa base (imagen) | Orientarse | MRO: CTX y HiRISE; Viking (contexto global) | [Mars Trek WMTS](https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars) |
| Elevación y pendiente | Por dónde se puede caminar | Mars Global Surveyor: MOLA; modelos de elevación de HiRISE | Mars Trek / PDS |
| Rugosidad y rocas | Evitar tropiezos | MRO: HiRISE; Mars Odyssey: THEMIS (inercia térmica) | Mars Trek / PDS |
| Mineralogía | Elegir paradas científicas | MRO: CRISM | PDS Geosciences |
| Hielo subterráneo | Recursos (agua) | MRO: SHARAD; proyecto SWIM | PDS / sitio de SWIM |
| Clima de superficie | Cuándo salir | Mars 2020: MEDA | [PDS Atmospheres](https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/PERSEVERANCE/meda.html) |
| Radiación | Cuánto tiempo afuera | MSL Curiosity: RAD; MAVEN (clima espacial) | PDS |

**Notas prácticas:**

- **Mars Trek** sirve mosaicos con la plantilla REST https://{endpoint}/1.0.0/{Style}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png. Algunas capas devuelven .jpg en vez de .png. Si falta un mosaico, esa zona no tiene cobertura.

- **MEDA** publica archivos CSV, uno por sol, en el [nodo Atmospheres del PDS](https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/PERSEVERANCE/meda.html). El PDS libera los datos de Perseverance [tres veces al año](https://pds-geosciences.wustl.edu/missions/mars2020/), así que no hay datos «en vivo».

- El **sensor de viento de MEDA** sufrió daño progresivo por arena y polvo ([EPSC 2025](https://meetingorganizer.copernicus.org/EPSC-DPS2025/EPSC-DPS2025-1461.html)). Conviene usar el viento con cautela o tomarlo de periodos tempranos de la misión.

- La API de clima de InSight ya no recibe datos nuevos. No la usen como «clima actual».

## 5. Algoritmo de ruta y reglas de seguridad

La ruta se calcula con **A*** sobre una grilla de costos precalculada. La grilla (unos 500 × 500 celdas) cubre la zona de trabajo y el cálculo corre en el navegador, sin backend.

**Mapa de costo.** Cada celda recibe un costo de paso que combina distancia, pendiente y rugosidad:

$$
C_{celda} = d \cdot \left(1 + w_p \cdot \frac{s}{s_{max}} + w_r \cdot r\right), \qquad C_{celda} = \infty \text{ si } s > s_{max}
$$

Donde *d* es la distancia entre celdas, *s* la pendiente local, *r* la rugosidad normalizada de 0 a 1, y *w_p* y *w_r* pesos ajustables.

**Parámetros configurables** (valores iniciales por definir; cada uno debe citar su fuente en el README):

| Parámetro | Qué controla | Valor |
| --- | --- | --- |
| s_max | Pendiente máxima transitable a pie | Por definir con fuente |
| walk_back_km | Radio máximo desde el hábitat para volver a pie si falla el vehículo o el traje | Por definir con fuente |
| w_p, w_r | Cuánto penalizan la pendiente y la rugosidad | Ajuste empírico |
| vel_kmh | Velocidad de marcha para estimar el tiempo | Por definir con fuente |

**Reglas de seguridad en pantalla:**

- Las celdas con pendiente mayor que s_max quedan bloqueadas y se pintan en rojo.

- Un círculo marca el radio de walk_back_km. Una ruta que lo cruza muestra una alerta.

- Un semáforo de condiciones (verde, ámbar o rojo) según temperatura, polvo y radiación para la estación y la hora elegidas.

- El tiempo total de la EVA se compara con un límite configurable.

**Puntaje científico (opcional).** Cada parada suma puntos según la capa de mineralogía o de hielo. Eso permite sugerir «la ruta más segura que pasa por al menos un afloramiento de carbonatos».

## 6. Requisitos oficiales del envío

Incumplir cualquiera de estos puntos deja el proyecto fuera de la evaluación global. La fuente son la guía de envío y los Términos y Condiciones 2026 (actualizados el 7 de agosto de 2026).

| Requisito | Detalle | Consecuencia para nosotros |
| --- | --- | --- |
| Demo | Video de 30 s o menos, **o** hasta 7 diapositivas (incluidas la de título y la de introducción) | Elegimos video: muestra la app funcionando |
| Alojamiento | Enlace público externo (YouTube, Drive, GitHub, etc.); no se sube al sitio de Space Apps | Probar el enlace en una ventana de incógnito |
| Idioma | Formulario y todo material enlazado en inglés; el video puede ir en otro idioma con subtítulos en inglés | **La interfaz de la app va en inglés** |
| Licencia del código | Licencia compatible con OSI; si no se indica, la NASA aplica Apache 2.0 | LICENSE (MIT o Apache 2.0) en el repo desde el inicio |
| Materiales de terceros | Deben ser libres o con licencia OSI, con las licencias documentadas | Nada de Mapbox ni Google Maps; usar Leaflet, Chart.js o CesiumJS |
| Citas | Citar **todas** las fuentes, incluso las abiertas; si no, pueden retirar la nominación o el premio | DATA_SOURCES.md actualizado en cada descarga |
| Personas | Ningún menor de 18 años en video ni imágenes; los adultos que aparezcan deben dar su consentimiento | Usar solo grabación de pantalla y voz de integrantes mayores de edad |
| Contenido | Sin promoción comercial ni datos personales | No mostrar logos de patrocinadores en la app |
| Equipo | Todos inscritos en el **mismo evento local** | Verificarlo hoy |
| Formulario | Campos obligatorios completos, aceptar Términos y «trabajo original» y pulsar *Submit for Judging* | Se puede reenviar; solo cuenta la última versión |
| Plazo | Domingo 15 de noviembre, 23:59, hora local del evento | Primer envío el domingo a las 18:00 como seguro |

**Estructura oficial del video de 30 s:** [0:00] presentarse y nombrar al equipo → [0:02] reto elegido y motivación → [0:05] nombre y eslogan del proyecto → [0:10] cómo funciona y qué datos NASA usa → [0:20–0:30] visión de futuro.

## 7. Criterios de evaluación y cómo los cubrimos

El jurado evalúa cinco criterios: Impacto, Creatividad, Validez, Relevancia y Presentación. La descripción detallada está en la Guía de Evaluación y Premios 2026, que aún no revisamos. La interpretación de abajo es nuestra y debe contrastarse con esa guía.

| Criterio | Qué debe ver el jurado | Evidencia en MarsWalk |
| --- | --- | --- |
| Impacto | Valor real para personas, ciencia o el entorno | Seguridad del astronauta y mayor retorno científico por EVA; uso en la Tierra para rutas en zonas remotas o de desastre |
| Creatividad | Originalidad de la solución | Une *dónde* (ruta), *cuándo* (condiciones) y *para qué* (ciencia), con el radio de retorno a pie visible |
| Validez | Calidad técnica y factibilidad | Datos reales procesados, umbrales con fuente citada y límites declarados (sin clima en vivo) |
| Relevancia | Responde al reto con datos NASA | Siete capas de siete misiones (MRO, Mars Global Surveyor, Mars Odyssey, Mars 2020, MSL, MAVEN y Viking); usa el lenguaje del reto: *layered view*, *route*, *current conditions*, *scientific discovery* |
| Presentación | Comunicación clara a alguien sin experiencia en el tema | Video de 30 s con historia («Sol 34, la astronauta Ana…») y demo real |

## 8. Recomendaciones y riesgos técnicos

- **Volumen de datos.** Un modelo de elevación de HiRISE puede pesar cientos de MB. Recorten solo la zona de trabajo una vez, en Python, y publiquen el resultado reducido (GeoTIFF o JSON) dentro del repo.

- **Proyección y coordenadas.** Marte no usa WGS84. Los mosaicos de Mars Trek están en proyección equirectangular («EQ»), y Leaflet asume Web Mercator por defecto. Hay que configurar un CRS propio (L.CRS.EPSG4326 o uno personalizado), o los mosaicos y las rutas quedarán desalineados.

- **Pendiente en metros reales.** Al calcular la pendiente, conviertan grados a metros con el radio de Marte (≈ 3.389,5 km), no con el de la Tierra.

- **Mezcla de resoluciones.** MOLA es de cientos de metros por píxel y HiRISE de alrededor de un metro. Documenten qué resolución usa el cálculo de pendiente para no prometer más precisión de la real.

- **«Condiciones actuales».** No hay clima en vivo de Marte: MEDA se libera en lotes periódicos. Presenten el semáforo como «condiciones típicas para esta estación y hora» y díganlo en la demo. Esa honestidad suma en Validez.

- **Disponibilidad de servicios externos.** Si los mosaicos de Mars Trek fallan o van lentos durante la demo, el mapa queda vacío. Guarden en el repo una copia local de los mosaicos de la zona como respaldo.

- **CORS.** Si algún servicio bloquea las peticiones desde el navegador, descarguen el dato en el preprocesado en lugar de pedirlo en vivo.

- **Umbrales sin fuente.** Una pendiente máxima o una velocidad inventada resta credibilidad. Cada valor de la sección 5 necesita una cita, o la etiqueta «valor supuesto para la demo».

- **Uso de IA.** El envío exige confirmar que el trabajo es original y citar todos los recursos. Si usan asistentes de IA, menciónenlo en la sección de recursos del formulario.

## 9. Guía rápida para arrancar el desarrollo

Estructura sugerida del repositorio:

```
marswalk/
├── LICENSE                 # MIT o Apache 2.0
├── README.md               # en inglés: qué es, cómo correrlo, límites
├── DATA_SOURCES.md         # misión, instrumento, URL y licencia de cada dato
├── preprocessing/          # Python: recorte, pendiente, mapa de costo
│   ├── requirements.txt    # rasterio, numpy, pandas
│   └── build_cost_grid.py
├── data/                   # salidas ligeras: cost_grid.json, meda_summary.json
└── web/                    # frontend estático
    ├── index.html
    ├── map.js              # Leaflet + capas de Mars Trek
    ├── route.js            # A* sobre cost_grid
    └── briefing.js         # paneles de parada y semáforo
```

**Pasos para empezar:**

- Crear el repo público con LICENSE, README.md y DATA_SOURCES.md vacíos.

- Mostrar un mosaico de Mars Trek centrado en Jezero, con CRS equirectangular, en web/index.html.

- Descargar el modelo de elevación de la zona, calcular la pendiente y exportar cost_grid.json.

- Implementar A* en route.js: clic en origen, clic en destino, dibujar la ruta.

- Agregar el perfil de elevación (Chart.js) y el resumen de distancia y tiempo.

- Resumir MEDA por estación y hora en meda_summary.json y conectarlo al semáforo.

- Escribir los textos de los briefings, en inglés, para 2 o 3 paradas.

- Publicar en GitHub Pages o Vercel y probar el enlace en una ventana de incógnito.

**Buenas prácticas para el demo:** cada pantalla debe tener estados de carga y de error. Dejen también una ruta de ejemplo precargada, para que el video no dependa de clics en vivo.

## 10. Cronograma y roles

Las funcionalidades se congelan el domingo a las 14:00. Así quedan 10 horas para la demo, el formulario y dos envíos.

**Hitos (hora de Lima):**

- **Sábado 14, tarde:** sitio y capas cerrados, datos descargados, repo creado y mapa base de Jezero visible.

- **Sábado 14, noche:** pendiente y mapa de costo calculados; primera ruta A* dibujada.

- **Domingo 15, 10:00:** perfil de elevación, briefings y semáforo de condiciones funcionando.

- **Domingo 15, 14:00:** congelar funcionalidades; app desplegada; grabar pantalla.

- **Domingo 15, 18:00:** primer envío completo (formulario en inglés y video público).

- **Domingo 15, antes de las 23:00:** envío final mejorado y verificado.

**Roles (equipo de 4 a 5 personas):**

| Rol | Responsable | Entregables |
| --- | --- | --- |
| Datos y GIS | Por asignar | Recortes, pendiente, cost_grid.json, meda_summary.json, DATA_SOURCES.md |
| Frontend del mapa | Por asignar | Leaflet, capas, interfaz en inglés, despliegue |
| Algoritmo de ruta | Por asignar | A*, radio de retorno, perfil de elevación |
| Ciencia y contenido | Por asignar | Paradas, briefings, fuentes de los umbrales |
| Demo y pitch | Por asignar | Guion, video de 30 s, subtítulos, formulario |

## 11. Checklist de cierre

- ☐ Todos los integrantes inscritos en el mismo evento local

- ☐ Repo público con LICENSE, README.md en inglés y DATA_SOURCES.md completo

- ☐ App desplegada y abierta con éxito desde una ventana de incógnito

- ☐ Interfaz de la app completamente en inglés

- ☐ Ninguna librería o servicio con licencia no compatible con OSI

- ☐ Video de 30 s o menos, con subtítulos en inglés si se habla en español

- ☐ Sin menores de 18 años en el video; los adultos que aparecen dieron su consentimiento

- ☐ Enlace del video público y probado

- ☐ Formulario completo en inglés, con todas las fuentes y recursos citados (incluida la IA, si se usó)

- ☐ Casillas de Términos y «trabajo original» marcadas

- ☐ Primer envío con *Submit for Judging* el domingo a las 18:00

- ☐ Envío final confirmado (aparece el banner) antes del domingo a las 23:59, hora de Lima

## 12. Preguntas abiertas para el equipo

- ¿Qué habilidades tiene cada integrante (Python, web, GIS, diseño, video)? De eso depende el alcance final.

- ¿Qué dice la Guía de Evaluación y Premios 2026 sobre cada criterio?

- ¿La página del reto trae una pestaña *Resources* con datasets recomendados? Si es así, hay que priorizarlos.

- ¿Dónde exactamente ubicamos el hábitat ficticio y las 2 o 3 paradas científicas en Jezero?

- ¿Qué fuentes citamos para la pendiente máxima, el radio de retorno a pie y la velocidad de marcha?

- ¿Video hablado en inglés o en español con subtítulos?

- ¿Mantenemos el nombre «MarsWalk»?

- ¿Mapa 2D (Leaflet) solamente, o intentamos vista 3D (CesiumJS) si sobra tiempo?

**Fuentes consultadas:** enunciado del reto, guía de envío de proyectos 2026, [Términos y Condiciones 2026](https://www.spaceappschallenge.org/legal/), [documentación WMTS de Mars Trek](https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars), [MEDA en PDS Atmospheres](https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/PERSEVERANCE/meda.html), [Mars 2020 en PDS Geosciences](https://pds-geosciences.wustl.edu/missions/mars2020/) y [MEDA hasta el sol 1450 (EPSC 2025)](https://meetingorganizer.copernicus.org/EPSC-DPS2025/EPSC-DPS2025-1461.html).