# DOCUMENTO DE ESPECIFICACIÓN DE REGLAS DE NEGOCIO (BRD)

## Aplicación de Gestión y Seguimiento de Proyectos Académicos (Metodologías Ágiles)

---

## 1. INTRODUCCIÓN Y CONTEXTO

Este documento define de forma explícita y exhaustiva el comportamiento lógico, las restricciones del sistema y los flujos operativos de la aplicación web de gestión de proyectos académicos.

La herramienta está diseñada específicamente para su uso en la asignatura de Metodologías Ágiles, estructurando la cursada bajo las siguientes variables de escala base:

- **Volumen de control:** Un máximo de tres (3) grupos grandes (cohorte/clase) de aproximadamente treinta (30) estudiantes cada uno.
- **Subgrupos (Proyectos):** Equipos de trabajo configurados dentro de cada cohorte con un límite estándar de cuatro (4) estudiantes por proyecto (con flexibilidad de modificación por parte del docente).

---

## 2. ROLES Y MATRIZ DE CONTROL DE ACCESO (RBAC)

El sistema operará bajo un modelo estricto de dos (2) roles. Ningún usuario puede tener ambos roles simultáneamente en el mismo curso.

| Acción / Módulo | Rol: Docente (Administrador) | Rol: Estudiante |
|---|---|---|
| Crear, archivar o modificar Cursos | Permitido | Denegado |
| Importar estudiantes (Excel/JSON) | Permitido | Denegado |
| Crear proyectos vacíos | Permitido | Denegado |
| Modificar el límite de integrantes de un proyecto | Permitido | Denegado |
| Asignar/Remover estudiantes a un proyecto manualmente | Permitido | Denegado |
| Auto-inscribirse en un proyecto con cupos libres | Denegado | Permitido (Solo si inscripciones están abiertas) |
| Ver tableros de otros proyectos del mismo curso | Permitido | Denegado |
| Ver tablero del propio proyecto | Permitido | Permitido |
| Crear y modificar Historias de Usuario / Requisitos Funcionales | Permitido | Permitido (Solo en su propio proyecto) |
| Mover tarjetas a estados: Backlog, En Progreso, En Revisión | Permitido | Permitido (Solo en su propio proyecto) |
| Mover tarjetas al estado final: Completado | Permitido | Denegado |
| Devolver tarjetas a En Progreso con retroalimentación | Permitido | Denegado |
| Forzar el cierre de inscripciones y auto-completar | Permitido | Denegado |

---

## 3. GESTIÓN DE CURSOS Y CARGA MASIVA DE ESTUDIANTES

### 3.1. Carga de Estudiantes

**Formatos Soportados:** El sistema debe procesar archivos estructurados en formato Excel (`.xlsx`) y JSON (`.json`).

**Campos Requeridos:** Para cada registro es obligatorio capturar:

- `nombre_completo` (String)
- `correo_institucional` (String, formato válido de correo)
- `codigo_estudiante` (String, identificador único de la institución)

**Estado Inicial:** Todo estudiante que se cargue masivamente al sistema por primera vez quedará registrado en la base de datos con el campo `projectId = null` (Estado: Sin Proyecto Asignado).

### 3.2. Restricción de Unicidad Académica

- Un estudiante solo puede pertenecer a un (1) único Curso y a un (1) único Proyecto de manera simultánea en el semestre activo.
- El sistema impedirá que el correo institucional de un estudiante esté registrado en más de un curso simultáneamente.

---

## 4. DINÁMICA DE GESTIÓN Y AUTO-ASIGNACIÓN DE EQUIPOS

### 4.1. Creación de Proyectos

- El Docente es el único facultado para instanciar proyectos en el sistema.
- Cada proyecto debe crearse asociado a un curso específico y con un parámetro ajustable llamado `max_members` (Capacidad máxima de estudiantes, cuyo valor predeterminado por el sistema será de 4 integrantes).
- El Docente podrá incrementar o disminuir el valor `max_members` de forma individualizada para cada proyecto en cualquier momento del semestre.

### 4.2. Flujo de Auto-inscripción de Estudiantes (Inscripciones Abiertas)

Cuando el docente habilite la auto-inscripción para un curso (`inscriptionsStatus = "open"`), el sistema aplicará las siguientes validaciones automáticas:

1. **Visualización Selectiva:** El estudiante ingresa a la aplicación y, de no tener un proyecto asignado (`projectId == null`), visualizará exclusivamente la lista de proyectos con cupos disponibles del curso al que pertenece.

2. **Cálculo de Cupos en Tiempo Real:** El sistema determinará los cupos disponibles de cada proyecto mediante la ecuación:

   ```
   Cupos Libres = max_members - Total de Integrantes Actuales
   ```

3. **Restricción de Bloqueo por Límite:** Si un proyecto tiene Cupos Libres = 0, el botón de "Unirse" se deshabilitará por completo para ese grupo, mostrando la etiqueta "Grupo Lleno".

4. **Operación Transaccional Atómica:** Al hacer clic en "Unirse", el sistema debe realizar una operación de tipo transacción (ej. Firestore Transaction) que asegure que:
   - Se verifique la disponibilidad del cupo en el milisegundo de ejecución.
   - Se añada el ID del estudiante a la lista de integrantes del proyecto.
   - Se actualice el campo `projectId` del estudiante con el ID del proyecto seleccionado.
   - Se inhabilite inmediatamente la vista de selección de proyectos para ese estudiante, dirigiéndolo directamente a la pantalla del tablero de su equipo asignado.

### 4.3. Regla de Bloqueo de Deserción Autónoma

Un estudiante no puede desvincularse de un grupo por cuenta propia. El botón para abandonar un grupo no existirá en la interfaz del estudiante. Cualquier reubicación de integrantes deberá ser ejecutada manualmente por el Docente en su interfaz de administración.

---

## 5. ALGORITMO DE CIERRE DE INSCRIPCIÓN Y AUTO-COMPLETADO

El Docente puede dar por finalizado el proceso de creación de equipos de forma manual. Este procedimiento tiene como objetivo reubicar a los estudiantes rezagados (quienes no se auto-inscribieron) de manera automatizada.

### 5.1. Restricción de Capacidad de Cierre (Pre-validación del Sistema)

Antes de proceder con el cierre, el sistema validará matemáticamente que la suma de todos los cupos disponibles en los proyectos creados previamente por el docente sea mayor o igual al total de estudiantes rezagados en el curso.

Si:

```
Σ (Cupos Libres de Proyectos) < Total de Rezagados
```

el sistema bloqueará el botón de cierre y mostrará una alerta crítica:

> "No es posible cerrar las inscripciones. Los proyectos creados no tienen suficiente capacidad total para albergar a los estudiantes rezagados restantes. Por favor, incremente los límites de capacidad o cree nuevos proyectos vacíos."

### 5.2. Ejecución del Algoritmo de Auto-completado

Si la validación matemática es aprobada, al presionar "Confirmar Cierre y Auto-completar", el sistema ejecutará de forma secuencial:

1. **Bloqueo de Estado:** Modifica la propiedad del curso a `inscriptionsStatus = "closed"`. A partir de este momento, se bloquean todos los accesos estudiantiles al módulo de auto-inscripción.

2. **Identificación de Rezagados:** Se genera un arreglo que contenga a todos los estudiantes del curso donde `projectId == null`. Llamaremos a este conjunto **R**.

3. **Algoritmo de Aleatoriedad (Fisher-Yates Shuffle):** Se desordena aleatoriamente el arreglo **R** para garantizar transparencia en el reparto.

4. **Recolección de Huecos Disponibles:** Se genera un arreglo multidimensional **G** con todos los proyectos del curso que cuenten con Cupos Libres > 0. Cada elemento en **G** representará un "cupo unitario libre" vinculado al ID de su proyecto correspondiente.

5. **Proceso de Reparto Directo (Match 1:1):**
   - Para cada estudiante **r** en la lista ordenada de forma aleatoria **R**:
     - Se le asigna el primer cupo libre disponible del arreglo **G**.
     - Se actualiza en lote (Batch Write) la base de datos: asociando el `projectId` en el documento del estudiante y agregando el ID del estudiante en el arreglo de integrantes del proyecto correspondiente.
     - Se remueve el cupo asignado del arreglo **G**.

**Resultado Esperado:** Al finalizar la ejecución, el tamaño de **R** debe ser cero (0) y todos los estudiantes habrán quedado distribuidos exclusivamente dentro de los proyectos diseñados por el docente.

---

## 6. FLUJO METODOLÓGICO DEL TABLERO DE TRABAJO (TO-DO)

El tablero de trabajo de cada proyecto está parametrizado de manera estricta para asegurar la adherencia a la metodología ágil. Las tarjetas representan Historias de Usuario (HU) o Requisitos Funcionales (RF).

### 6.1. Estados del Ciclo de Vida de una HU/RF

El tablero está compuesto estrictamente por cuatro (4) columnas fijas que representan las fases secuenciales del desarrollo:

```
Backlog → En Progreso → En Revisión → Completado
```

```
   [ Backlog ]
        │
        ▼ (Requiere asignación individual)
   [ En Progreso ]
        │
        ▼ (Bloquea edición de Título/Descripción)
   [ En Revisión ] ◄─────────────────────────┐
        │                                    │
        ├──► (Solo Docente Aprueba) ──────► [ Completado ]
        │
        └──► (Docente Rechaza con Feedback) ─┘
```

### 6.2. Reglas de Transición y Validación de Tarjetas

**Creación de la Tarjeta (Fase Backlog):**

- Al crearse una tarjeta en el Backlog, el usuario creador debe seleccionar de forma obligatoria un tipo: Historias de Usuario (HU) o Requisito Funcional (RF).
- No se requiere un estudiante asignado en esta etapa.

**Transición a "En Progreso":**

- **Regla de Responsabilidad:** Una tarjeta no puede ser arrastrada al estado En Progreso si el campo de asignación individual (`assignedTo`) está vacío.
- El sistema validará que el estudiante asignado pertenezca de forma activa a la lista de integrantes del proyecto.

**Transición a "En Revisión":**

- **Regla de Congelamiento de Alcance:** Una vez que la tarjeta es enviada al estado En Revisión, el sistema bloquea inmediatamente todos los permisos de edición para los campos de Título y Descripción para los estudiantes. Esto asegura que la HU evaluada por el profesor sea idéntica a la desarrollada.

**Transición a "Completado" (La Regla del Árbitro):**

- **Restricción de Rol:** Un estudiante no tiene permitido mover tarjetas bajo ninguna circunstancia a la columna Completado.
- Solo el usuario con rol Docente puede arrastrar una tarjeta desde En Revisión hasta Completado tras constatar que el avance cumple con los criterios de aceptación metodológicos.

**Transición de Devolución (Rechazo Metodológico):**

- Si el Docente determina que el avance de la HU/RF es insatisfactorio, puede devolver la tarjeta desde En Revisión hacia En Progreso o Backlog.
- Para procesar esta devolución, el sistema abrirá un modal obligatorio donde el Docente deberá ingresar una retroalimentación de texto (`feedback_docente`) para guiar la corrección del estudiante.

---

## 7. SISTEMA DE MÉTRICAS ANALÍTICAS DE EVALUACIÓN

Para automatizar la recopilación de datos objetivos y justificar la asignación de la calificación de cada proyecto y estudiante, el sistema procesará el historial de cambios en Firestore de manera continua.

### 7.1. Métricas de Desempeño Individual

**Métrica I-1: Porcentaje de Participación en el Backlog (P_ind)**

Mide el porcentaje de contribución cuantitativa de un estudiante específico sobre el total del trabajo validado y completado por el grupo de proyecto.

```
P_ind = (Total de HU/RF finalizadas asignadas a un estudiante / Total de HU/RF finalizadas por el proyecto) × 100
```

*Uso académico:* Detecta disparidades extremas de trabajo dentro de un mismo grupo.

**Métrica I-2: Índice de Procrastinación Individual (IP_ind)**

Evalúa el comportamiento temporal de entrega del estudiante, determinando si las tareas fueron distribuidas ordenadamente a lo largo del sprint o movidas apresuradamente antes de la fecha límite fijada por el docente (T_entrega).

```
IP_ind = (Cantidad de HU/RF movidas a "En Revisión" en las últimas 48h previas a T_entrega / Total de HU/RF movidas a "En Revisión" durante todo el período) × 100
```

*Uso académico:* Penaliza a los estudiantes que mueven todo el tablero de trabajo el último día de entrega para aparentar productividad.

**Métrica I-3: Tiempo Promedio en Progreso (TPP_ind)**

Mide la agilidad del estudiante para concluir tareas individuales una vez que se compromete con ellas.

```
TPP_ind = Σ(T_revisión − T_progreso) / k     para i = 1 hasta k
```

Donde:
- **k** es la cantidad de tareas completadas por el estudiante.
- **T_progreso** es la marca de tiempo (Timestamp) en la que la tarea pasó a "En Progreso".
- **T_revisión** es la marca de tiempo en la que pasó a "En Revisión".

### 7.2. Métricas de Rendimiento Grupal

**Métrica G-1: Lead Time Promedio del Proyecto (LT_grupo)**

Mide el tiempo transcurrido promedio desde que una HU o RF nace en el Backlog hasta que el Docente la aprueba en Completado.

```
LT_grupo = Σ(T_completado_j − T_creación_j) / n     para j = 1 hasta n
```

Donde:
- **n** es el número total de tarjetas aprobadas en el proyecto.
- **T_creación** es la marca de tiempo de creación de la tarjeta.
- **T_completado** es la marca de tiempo de aprobación final del docente.

**Métrica G-2: Tasa de Rechazo Metodológico (TR_grupo)**

Indica qué tan efectivas son las especificaciones de criterios de aceptación de las HU del equipo antes de ser enviadas a revisión del profesor.

```
TR_grupo = Cantidad de veces que el Docente devuelve tarjetas de "En Revisión" a "En Progreso" / Total de tarjetas enviadas a "En Revisión"
```

*Uso académico:* Una tasa alta (mayor a 30%) indica que el grupo no tiene claros los requisitos del proyecto y está trabajando a base de prueba y error.

---

## 8. CONTROL DE AUDITORÍA (HISTORIAL DE ACTIVIDAD)

Toda modificación de estado sobre las tarjetas (HU/RF) deberá generar de manera implícita un registro de auditoría inmutable en una colección secundaria de Firestore llamada `activity_logs`. Cada log registrará:

- `user_id` (ID del usuario que ejecuta el cambio)
- `user_name` (Nombre del usuario para lectura rápida)
- `task_id` (ID de la tarjeta modificada)
- `previous_status` (Estado de origen)
- `new_status` (Estado de destino)
- `timestamp` (Fecha y hora exacta del servidor en que ocurrió el cambio)

Estos registros proveerán la base histórica infalsificable para calcular con exactitud los tiempos requeridos por las métricas del apartado anterior.
