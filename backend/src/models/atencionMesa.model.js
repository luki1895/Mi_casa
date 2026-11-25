import pool from "../config/db.js";

const assertReady = async (db = pool, requireConfiguration = true) => {
    const { rows } = await db.query(
        `SELECT to_regclass('public.mesa') IS NOT NULL AS mesa,
                to_regclass('public.atencion_mesa') IS NOT NULL AS atencion_mesa,
                to_regclass('public.historial_atencion_mesa') IS NOT NULL AS historial_atencion_mesa,
                to_regclass('public.sector_mesa') IS NOT NULL AS sector_mesa,
                COALESCE((
                    SELECT COUNT(*) = 3
                    FROM information_schema.columns
                    WHERE table_schema='public' AND table_name='mesa'
                      AND column_name = ANY(ARRAY['id_sector','orden_visualizacion','habilitada'])
                ), FALSE) AS configuracion_mesas,
                COALESCE((
                    SELECT COUNT(*) = 6
                    FROM information_schema.columns
                    WHERE table_schema='public' AND table_name='mesa'
                      AND column_name = ANY(ARRAY[
                        'posicion_x','posicion_y','rotacion_grados',
                        'forma_visual','ancho_visual','alto_visual'
                      ])
                ), FALSE) AS plano_mesas,
                EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_schema='public' AND table_name='sector_mesa'
                      AND column_name='activo'
                ) AS sectores_activables`,
    );
    const schema = rows[0];
    const faltantes = [
        !schema.mesa && "mesa",
        !schema.atencion_mesa && "atencion_mesa",
        !schema.historial_atencion_mesa && "historial_atencion_mesa",
    ].filter(Boolean);
    if (requireConfiguration) {
        if (!schema.sector_mesa) faltantes.push("sector_mesa");
        if (!schema.configuracion_mesas) faltantes.push("columnas de configuración de mesas");
        if (!schema.plano_mesas) faltantes.push("columnas de distribución en planta");
        if (!schema.sectores_activables) faltantes.push("estado activo de sectores");
    }
    if (faltantes.length) {
        const migraciones = requireConfiguration
            ? "006_mesas_atenciones.sql, 010_configuracion_mesas.sql, 011_distribucion_plano_mesas.sql y 013_operacion_comercial_y_sectores.sql"
            : "006_mesas_atenciones.sql";
        throw Object.assign(
            new Error(`El esquema de mesas está incompleto (${faltantes.join(", ")}). Revisa las migraciones ${migraciones}.`),
            { status: 503 },
        );
    }
};
const validarId = (id, recurso) => {
    const numero = Number(id);
    if (!Number.isSafeInteger(numero) || numero < 1) {
        throw Object.assign(new Error(`El identificador de ${recurso} no es válido`), { status: 400 });
    }
    return numero;
};

const validarMesa = (datos = {}) => {
    const numero = String(datos.numero ?? "").trim();
    const capacidad = Number(datos.capacidad);
    const ordenVisualizacion = Number(datos.orden_visualizacion ?? 0);
    const idSector = datos.id_sector === null || datos.id_sector === undefined || datos.id_sector === ""
        ? null
        : validarId(datos.id_sector, "sector");
    const habilitada = datos.habilitada === undefined ? true : datos.habilitada;
    const estado = String(datos.estado ?? "ACTIVA").trim().toUpperCase();
    const formaVisual = String(datos.forma_visual ?? "CIRCULAR").trim().toUpperCase();
    const anchoVisual = Number(datos.ancho_visual ?? 0.12);
    const altoVisual = Number(datos.alto_visual ?? 0.12);
    const rotacionGrados = Number(datos.rotacion_grados ?? 0);
    const posicionX = datos.posicion_x === null || datos.posicion_x === undefined || datos.posicion_x === ""
        ? null
        : Number(datos.posicion_x);
    const posicionY = datos.posicion_y === null || datos.posicion_y === undefined || datos.posicion_y === ""
        ? null
        : Number(datos.posicion_y);
    if (!numero || numero.length > 20) {
        throw Object.assign(new Error("El número o nombre de mesa es obligatorio y no debe superar 20 caracteres"), { status: 400 });
    }
    if (!Number.isInteger(capacidad) || capacidad < 1) {
        throw Object.assign(new Error("La capacidad debe ser un entero positivo"), { status: 400 });
    }
    if (!Number.isSafeInteger(ordenVisualizacion) || ordenVisualizacion < 0) {
        throw Object.assign(new Error("El orden de visualización debe ser un entero no negativo"), { status: 400 });
    }
    if (typeof habilitada !== "boolean") {
        throw Object.assign(new Error("El estado habilitado debe ser verdadero o falso"), { status: 400 });
    }
    if (!["ACTIVA", "FUERA_SERVICIO"].includes(estado)) {
        throw Object.assign(new Error("El estado operativo de la mesa no es válido"), { status: 400 });
    }
    if (!["CIRCULAR", "CUADRADA", "RECTANGULAR"].includes(formaVisual)) {
        throw Object.assign(new Error("La forma visual de la mesa no es válida"), { status: 400 });
    }
    if (!Number.isSafeInteger(rotacionGrados) || rotacionGrados < 0 || rotacionGrados > 359) {
        throw Object.assign(new Error("La rotación debe estar entre 0 y 359 grados"), { status: 400 });
    }
    if (![anchoVisual, altoVisual].every((valor) => Number.isFinite(valor) && valor >= 0.04 && valor <= 0.4)) {
        throw Object.assign(new Error("El ancho y el alto visual deben estar entre 0.04 y 0.40"), { status: 400 });
    }
    if ((posicionX === null) !== (posicionY === null)
        || (posicionX !== null && (!Number.isFinite(posicionX) || posicionX < 0 || posicionX > 1))
        || (posicionY !== null && (!Number.isFinite(posicionY) || posicionY < 0 || posicionY > 1))) {
        throw Object.assign(new Error("Las posiciones normalizadas deben especificar X e Y entre 0 y 1"), { status: 400 });
    }
    return {
        numero,
        capacidad,
        idSector,
        ordenVisualizacion,
        habilitada,
        estado,
        formaVisual,
        anchoVisual,
        altoVisual,
        rotacionGrados,
        posicionX,
        posicionY,
    };
};

const validarNombreSector = (datos = {}) => {
    const nombre = String(datos.nombre ?? "").trim();
    if (!nombre || nombre.length > 60) {
        throw Object.assign(new Error("El nombre del sector es obligatorio y no debe superar 60 caracteres"), { status: 400 });
    }
    return nombre;
};

const validarDistribucion = (elementos) => {
    if (!Array.isArray(elementos)) {
        throw Object.assign(new Error("La distribución debe ser una lista de mesas"), { status: 400 });
    }
    const vistos = new Set();
    return elementos.map((elemento = {}) => {
        const idMesa = validarId(elemento.id_mesa, "mesa");
        if (vistos.has(idMesa)) {
            throw Object.assign(new Error(`La mesa #${idMesa} aparece más de una vez en la distribución`), { status: 400 });
        }
        vistos.add(idMesa);
        const mesa = validarMesa({
            numero: String(idMesa),
            capacidad: 1,
            posicion_x: elemento.posicion_x,
            posicion_y: elemento.posicion_y,
            rotacion_grados: elemento.rotacion_grados,
            forma_visual: elemento.forma_visual,
            ancho_visual: elemento.ancho_visual,
            alto_visual: elemento.alto_visual,
        });
        return {
            id_mesa: idMesa,
            posicion_x: mesa.posicionX,
            posicion_y: mesa.posicionY,
            rotacion_grados: mesa.rotacionGrados,
            forma_visual: mesa.formaVisual,
            ancho_visual: mesa.anchoVisual,
            alto_visual: mesa.altoVisual,
        };
    });
};

const dimensionesRotadas = (mesa) => {
    const radianes = mesa.rotacion_grados * Math.PI / 180;
    return {
        ancho: Math.abs(Math.cos(radianes)) * Number(mesa.ancho_visual)
            + Math.abs(Math.sin(radianes)) * Number(mesa.alto_visual),
        alto: Math.abs(Math.sin(radianes)) * Number(mesa.ancho_visual)
            + Math.abs(Math.cos(radianes)) * Number(mesa.alto_visual),
    };
};

const validarColisionesPlano = (mesas) => {
    const ubicadas = mesas.filter((mesa) => mesa.posicion_x !== null && mesa.posicion_y !== null);
    for (let i = 0; i < ubicadas.length; i += 1) {
        const actual = ubicadas[i];
        const dimensiones = dimensionesRotadas(actual);
        if (
            actual.posicion_x - dimensiones.ancho / 2 < 0
            || actual.posicion_x + dimensiones.ancho / 2 > 1
            || actual.posicion_y - dimensiones.alto / 2 < 0
            || actual.posicion_y + dimensiones.alto / 2 > 1
        ) {
            throw Object.assign(new Error(`La mesa #${actual.id_mesa} queda fuera de los límites del plano`), { status: 409 });
        }
        for (let j = i + 1; j < ubicadas.length; j += 1) {
            const otra = ubicadas[j];
            const dimensionesOtra = dimensionesRotadas(otra);
            const distanciaX = Math.abs(actual.posicion_x - otra.posicion_x);
            const distanciaY = Math.abs(actual.posicion_y - otra.posicion_y);
            if (
                distanciaX < (dimensiones.ancho + dimensionesOtra.ancho) / 2
                && distanciaY < (dimensiones.alto + dimensionesOtra.alto) / 2
            ) {
                throw Object.assign(
                    new Error(`Las mesas #${actual.id_mesa} y #${otra.id_mesa} se superponen en el plano`),
                    { status: 409 },
                );
            }
        }
    }
};

const listarMesas = async (incluirDeshabilitadas = true, sectorId = null) => {
    await assertReady();
    const filtroSector = sectorId === null || sectorId === undefined || sectorId === ""
        ? null
        : sectorId === "sin-sector"
            ? "sin-sector"
            : validarId(sectorId, "sector");
    const { rows } = await pool.query(
        `SELECT m.id_mesa,m.numero,m.capacidad,m.estado,m.habilitada,m.id_sector,
                s.nombre AS sector,s.activo AS sector_activo,
                m.orden_visualizacion,m.posicion_x,m.posicion_y,
                m.rotacion_grados,m.forma_visual,m.ancho_visual,m.alto_visual,
                m.creada_en,m.actualizada_en,
                a.id_atencion,a.id_usuario_apertura,a.abierta_en,
                (SELECT COUNT(*)::int FROM pedido p WHERE p.id_atencion=a.id_atencion) AS cantidad_pedidos,
                (SELECT CASE WHEN COUNT(p.id_pedido) FILTER (WHERE p.total IS NULL) > 0 THEN NULL
                             ELSE COALESCE(SUM(GREATEST(p.total-COALESCE(pg.pagado,0),0)),0)
                        END
                 FROM pedido p
                 LEFT JOIN LATERAL (
                    SELECT SUM(monto) AS pagado FROM pago
                    WHERE id_pedido=p.id_pedido AND estado='CONFIRMADO'
                 ) pg ON TRUE
                 WHERE p.id_atencion=a.id_atencion) AS saldo_pendiente
         FROM mesa m
         LEFT JOIN sector_mesa s ON s.id_sector=m.id_sector
         LEFT JOIN atencion_mesa a ON a.id_mesa=m.id_mesa AND a.estado='ABIERTA'
         WHERE ($1::boolean OR m.habilitada=TRUE)
           AND ($2::text IS NULL
                OR ($2::text='sin-sector' AND m.id_sector IS NULL)
                OR m.id_sector=NULLIF($2::text,'sin-sector')::bigint)
         ORDER BY lower(COALESCE(s.nombre,'')),m.orden_visualizacion,m.numero,m.id_mesa`,
        [incluirDeshabilitadas, filtroSector],
    );
    return rows.map((mesa) => {
        const estadoOperativo = mesa.id_atencion
            ? "OCUPADA"
            : mesa.estado !== "ACTIVA" || mesa.sector_activo === false
                ? "FUERA_SERVICIO"
                : "DISPONIBLE";
        return {
            ...mesa,
            estado_operativo: estadoOperativo,
            estado_atencion: !mesa.habilitada
                ? null
                : mesa.sector_activo === false
                    ? "FUERA_SERVICIO"
                    : estadoOperativo,
        };
    });
};

const crearMesa = async (datos) => {
    await assertReady();
    const mesa = validarMesa(datos);
    if (mesa.posicionX !== null || mesa.posicionY !== null) {
        throw Object.assign(new Error("La mesa debe registrarse sin ubicación y colocarse después desde el editor del plano"), { status: 400 });
    }
    try {
        const { rows } = await pool.query(
            `INSERT INTO mesa (
                numero,capacidad,id_sector,orden_visualizacion,habilitada,estado,
                posicion_x,posicion_y,rotacion_grados,forma_visual,ancho_visual,alto_visual
             )
             SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
             WHERE $3::bigint IS NULL OR EXISTS (
                 SELECT 1 FROM sector_mesa WHERE id_sector=$3 AND activo IS TRUE
             )
             RETURNING id_mesa,numero,capacidad,estado,habilitada,id_sector,orden_visualizacion,
                posicion_x,posicion_y,rotacion_grados,forma_visual,ancho_visual,alto_visual,
                creada_en,actualizada_en`,
            [
                mesa.numero, mesa.capacidad, mesa.idSector, mesa.ordenVisualizacion,
                mesa.habilitada, mesa.estado, mesa.posicionX, mesa.posicionY,
                mesa.rotacionGrados, mesa.formaVisual, mesa.anchoVisual, mesa.altoVisual,
            ],
        );
        if (!rows[0]) throw Object.assign(new Error("El sector seleccionado no existe o está desactivado"), { status: 400 });
        return rows[0];
    } catch (error) {
        if (error.code === "23505") throw Object.assign(new Error("Ya existe una mesa con ese nombre o número"), { status: 409 });
        if (error.code === "23503") throw Object.assign(new Error("El sector seleccionado no existe"), { status: 400 });
        throw error;
    }
};

const actualizarMesa = async (idMesa, datos = {}) => {
    idMesa = validarId(idMesa, "mesa");
    const mesa = validarMesa(datos);
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await assertReady(client);
        const actuales = await client.query(
            `SELECT id_mesa,posicion_x,posicion_y,rotacion_grados,forma_visual,ancho_visual,alto_visual
             FROM mesa ORDER BY id_mesa FOR UPDATE`,
        );
        const mesaActual = actuales.rows.find((elemento) => Number(elemento.id_mesa) === idMesa);
        if (!mesaActual) throw Object.assign(new Error("Mesa no encontrada"), { status: 404 });
        if (mesa.idSector !== null) {
            const sector = await client.query(
                "SELECT id_sector FROM sector_mesa WHERE id_sector=$1 AND activo IS TRUE FOR SHARE",
                [mesa.idSector],
            );
            if (!sector.rowCount) throw Object.assign(new Error("El sector seleccionado no existe o está desactivado"), { status: 400 });
        }
        const geometriaNueva = {
            posicion_x: mesa.posicionX,
            posicion_y: mesa.posicionY,
            rotacion_grados: mesa.rotacionGrados,
            forma_visual: mesa.formaVisual,
            ancho_visual: mesa.anchoVisual,
            alto_visual: mesa.altoVisual,
        };
        const camposGeometria = Object.keys(geometriaNueva);
        const geometriaCambio = camposGeometria.some((campo) => {
            const anterior = mesaActual[campo];
            const nueva = geometriaNueva[campo];
            if (anterior === null || anterior === undefined || nueva === null) return anterior !== nueva;
            return Number(anterior) !== Number(nueva);
        });
        if (geometriaCambio) {
            validarColisionesPlano(actuales.rows.map((elemento) => (
                Number(elemento.id_mesa) === idMesa ? { ...elemento, ...geometriaNueva } : elemento
            )));
        }
        if (!mesa.habilitada || mesa.estado === "FUERA_SERVICIO") {
            const abierta = await client.query(
                "SELECT 1 FROM atencion_mesa WHERE id_mesa=$1 AND estado='ABIERTA' FOR UPDATE",
                [idMesa],
            );
            if (abierta.rowCount) throw Object.assign(new Error("No se puede deshabilitar ni retirar del servicio una mesa que tiene una atención abierta"), { status: 409 });
        }
        const { rows } = await client.query(
            `UPDATE mesa
             SET numero=$1,capacidad=$2,id_sector=$3,orden_visualizacion=$4,
                 habilitada=$5,estado=$6,posicion_x=$7,posicion_y=$8,
                 rotacion_grados=$9,forma_visual=$10,ancho_visual=$11,alto_visual=$12,
                 actualizada_en=NOW()
             WHERE id_mesa=$13
             RETURNING id_mesa,numero,capacidad,estado,habilitada,id_sector,orden_visualizacion,
                 posicion_x,posicion_y,rotacion_grados,forma_visual,ancho_visual,alto_visual,
                 creada_en,actualizada_en`,
            [
                mesa.numero, mesa.capacidad, mesa.idSector, mesa.ordenVisualizacion,
                mesa.habilitada, mesa.estado, mesa.posicionX, mesa.posicionY,
                mesa.rotacionGrados, mesa.formaVisual, mesa.anchoVisual, mesa.altoVisual, idMesa,
            ],
        );
        await client.query("COMMIT");
        return rows[0];
    } catch (error) {
        await client.query("ROLLBACK");
        if (error.code === "23505") throw Object.assign(new Error("Ya existe una mesa con ese nombre o número"), { status: 409 });
        if (error.code === "23503") throw Object.assign(new Error("El sector seleccionado no existe"), { status: 400 });
        throw error;
    } finally {
        client.release();
    }
};

const listarSectores = async (incluirDeshabilitados = true) => {
    await assertReady();
    const { rows } = await pool.query(
        `SELECT s.id_sector,s.nombre,s.activo,s.creado_en,s.actualizado_en,
                COUNT(m.id_mesa)::int AS cantidad_mesas,
                COUNT(a.id_atencion)::int AS atenciones_abiertas
         FROM sector_mesa s
         LEFT JOIN mesa m ON m.id_sector=s.id_sector
         LEFT JOIN atencion_mesa a ON a.id_mesa=m.id_mesa AND a.estado='ABIERTA'
         WHERE $1::boolean OR s.activo=TRUE
         GROUP BY s.id_sector
         ORDER BY lower(s.nombre),s.id_sector`,
        [incluirDeshabilitados],
    );
    return rows;
};

const crearSector = async (datos) => {
    await assertReady();
    const nombre = validarNombreSector(datos);
    try {
        const { rows } = await pool.query(
            `INSERT INTO sector_mesa (nombre)
             VALUES ($1)
             RETURNING id_sector,nombre,activo,creado_en,actualizado_en`,
            [nombre],
        );
        return rows[0];
    } catch (error) {
        if (error.code === "23505") throw Object.assign(new Error("Ya existe un sector con ese nombre"), { status: 409 });
        throw error;
    }
};

const actualizarSector = async (idSector, datos = {}) => {
    idSector = validarId(idSector, "sector");
    const nombre = validarNombreSector(datos);
    const activo = datos.activo === undefined ? null : datos.activo;
    if (activo !== null && typeof activo !== "boolean") {
        throw Object.assign(new Error("El estado del sector debe ser verdadero o falso"), { status: 400 });
    }
    await assertReady();
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const sector = await client.query(
            "SELECT id_sector FROM sector_mesa WHERE id_sector=$1 FOR UPDATE",
            [idSector],
        );
        if (!sector.rowCount) throw Object.assign(new Error("Sector no encontrado"), { status: 404 });
        if (activo === false) {
            const atenciones = await client.query(
                `SELECT 1
                 FROM mesa m
                 INNER JOIN atencion_mesa a ON a.id_mesa=m.id_mesa AND a.estado='ABIERTA'
                 WHERE m.id_sector=$1
                 LIMIT 1
                 FOR UPDATE OF a`,
                [idSector],
            );
            if (atenciones.rowCount) {
                throw Object.assign(new Error("No se puede desactivar un sector que tiene atenciones abiertas"), { status: 409 });
            }
        }
        const { rows } = await client.query(
            `UPDATE sector_mesa
             SET nombre=$1,activo=COALESCE($2,activo),actualizado_en=NOW()
             WHERE id_sector=$3
             RETURNING id_sector,nombre,activo,creado_en,actualizado_en`,
            [nombre, activo, idSector],
        );
        await client.query("COMMIT");
        return rows[0];
    } catch (error) {
        await client.query("ROLLBACK");
        if (error.code === "23505") throw Object.assign(new Error("Ya existe un sector con ese nombre"), { status: 409 });
        throw error;
    } finally {
        client.release();
    }
};

const guardarDistribucion = async (elementos) => {
    const distribucion = validarDistribucion(elementos);
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await assertReady(client);
        const actuales = await client.query(
            `SELECT id_mesa,posicion_x,posicion_y,rotacion_grados,forma_visual,ancho_visual,alto_visual
             FROM mesa ORDER BY id_mesa FOR UPDATE`,
        );
        const porId = new Map(actuales.rows.map((mesa) => [Number(mesa.id_mesa), mesa]));
        for (const elemento of distribucion) {
            if (!porId.has(elemento.id_mesa)) {
                throw Object.assign(new Error(`La mesa #${elemento.id_mesa} no existe`), { status: 404 });
            }
            porId.set(elemento.id_mesa, { ...porId.get(elemento.id_mesa), ...elemento });
        }
        validarColisionesPlano([...porId.values()]);

        const { rows } = await client.query(
            `UPDATE mesa AS m
             SET posicion_x = plano.posicion_x,
                 posicion_y = plano.posicion_y,
                 rotacion_grados = plano.rotacion_grados,
                 forma_visual = plano.forma_visual,
                 ancho_visual = plano.ancho_visual,
                 alto_visual = plano.alto_visual,
                 actualizada_en = NOW()
             FROM jsonb_to_recordset($1::jsonb) AS plano(
                 id_mesa BIGINT,posicion_x NUMERIC,posicion_y NUMERIC,
                 rotacion_grados SMALLINT,forma_visual VARCHAR,
                 ancho_visual NUMERIC,alto_visual NUMERIC
             )
             WHERE m.id_mesa = plano.id_mesa
             RETURNING m.id_mesa,m.posicion_x,m.posicion_y,m.rotacion_grados,
                 m.forma_visual,m.ancho_visual,m.alto_visual,m.actualizada_en`,
            [JSON.stringify(distribucion)],
        );
        if (rows.length !== distribucion.length) {
            throw Object.assign(new Error("No se pudo guardar la distribución completa de mesas"), { status: 409 });
        }
        await client.query("COMMIT");
        return rows;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

const abrirAtencion = async (idMesa, idUsuario) => {
    idMesa = validarId(idMesa, "mesa");
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await assertReady(client);
        const mesaResult = await client.query(
            `SELECT m.id_mesa,m.estado,m.habilitada,m.id_sector,
                    COALESCE(s.activo,TRUE) AS sector_activo
             FROM mesa m
             LEFT JOIN sector_mesa s ON s.id_sector=m.id_sector
             WHERE m.id_mesa=$1
             FOR UPDATE OF m`,
            [idMesa],
        );
        if (!mesaResult.rowCount) throw Object.assign(new Error("Mesa no encontrada"), { status: 404 });
        if (mesaResult.rows[0].id_sector !== null && mesaResult.rows[0].id_sector !== undefined) {
            const sector = await client.query(
                "SELECT activo FROM sector_mesa WHERE id_sector=$1 FOR SHARE",
                [mesaResult.rows[0].id_sector],
            );
            if (!sector.rows[0]?.activo) throw Object.assign(new Error("El sector de la mesa está desactivado"), { status: 409 });
        }
        if (!mesaResult.rows[0].habilitada) throw Object.assign(new Error("La mesa está deshabilitada"), { status: 409 });
        if (!mesaResult.rows[0].sector_activo) throw Object.assign(new Error("El sector de la mesa está desactivado"), { status: 409 });
        if (mesaResult.rows[0].estado !== "ACTIVA") throw Object.assign(new Error("La mesa está fuera de servicio"), { status: 409 });
        const actual = await client.query(
            "SELECT id_atencion FROM atencion_mesa WHERE id_mesa=$1 AND estado='ABIERTA' FOR UPDATE",
            [idMesa],
        );
        if (actual.rowCount) throw Object.assign(new Error("La mesa ya tiene una atención abierta"), { status: 409 });
        const insertada = await client.query(
            `INSERT INTO atencion_mesa (id_mesa,id_usuario_apertura)
             VALUES ($1,$2)
             RETURNING id_atencion,id_mesa,id_usuario_apertura,estado,abierta_en`,
            [idMesa, idUsuario],
        );
        await client.query(
            `INSERT INTO historial_atencion_mesa (id_atencion,id_usuario,accion,detalle)
             VALUES ($1,$2,'APERTURA',$3::jsonb)`,
            [insertada.rows[0].id_atencion, idUsuario, JSON.stringify({ id_mesa: Number(idMesa) })],
        );
        await client.query("COMMIT");
        return insertada.rows[0];
    } catch (error) {
        await client.query("ROLLBACK");
        if (error.code === "23505") throw Object.assign(new Error("La mesa ya tiene una atención abierta"), { status: 409 });
        throw error;
    } finally {
        client.release();
    }
};

const listarAtencionesAbiertas = async () => {
    await assertReady(pool, false);
    const { rows } = await pool.query(
        `SELECT a.id_atencion,a.id_mesa,m.numero AS mesa,m.capacidad,
                a.id_usuario_apertura,u.usuario AS responsable,a.abierta_en,
                COUNT(p.id_pedido)::int AS cantidad_pedidos,
                CASE WHEN COUNT(p.id_pedido) FILTER (WHERE p.total IS NULL) > 0 THEN NULL
                     ELSE COALESCE(SUM(GREATEST(p.total-COALESCE(pg.pagado,0),0)),0)
                END AS saldo_pendiente
         FROM atencion_mesa a
         INNER JOIN mesa m ON m.id_mesa=a.id_mesa
         INNER JOIN usuario u ON u.id_usuario=a.id_usuario_apertura
         LEFT JOIN pedido p ON p.id_atencion=a.id_atencion
         LEFT JOIN LATERAL (
             SELECT SUM(monto) AS pagado FROM pago
             WHERE id_pedido=p.id_pedido AND estado='CONFIRMADO'
         ) pg ON TRUE
         WHERE a.estado='ABIERTA'
         GROUP BY a.id_atencion,m.numero,m.capacidad,u.usuario
         ORDER BY a.abierta_en`,
    );
    return rows;
};

const obtenerAtencion = async (idAtencion) => {
    idAtencion = validarId(idAtencion, "atención");
    await assertReady(pool, false);
    const { rows } = await pool.query(
        `SELECT a.id_atencion,a.id_mesa,m.numero AS mesa,m.capacidad,
                a.estado,a.id_usuario_apertura,ua.usuario AS responsable,
                a.abierta_en,a.cerrada_en,a.id_usuario_cierre,uc.usuario AS usuario_cierre,
                COALESCE(json_agg(json_build_object(
                    'id_pedido',p.id_pedido,'estado',p.estado,'total',p.total,
                    'pagado',p.pagado,'pagado_confirmado',COALESCE(pg.pagado,0),
                    'saldo_pendiente',GREATEST(p.total-COALESCE(pg.pagado,0),0)
                )) FILTER (WHERE p.id_pedido IS NOT NULL),'[]') AS pedidos
         FROM atencion_mesa a
         INNER JOIN mesa m ON m.id_mesa=a.id_mesa
         INNER JOIN usuario ua ON ua.id_usuario=a.id_usuario_apertura
         LEFT JOIN usuario uc ON uc.id_usuario=a.id_usuario_cierre
         LEFT JOIN pedido p ON p.id_atencion=a.id_atencion
         LEFT JOIN LATERAL (
             SELECT SUM(monto) AS pagado FROM pago
             WHERE id_pedido=p.id_pedido AND estado='CONFIRMADO'
         ) pg ON TRUE
         WHERE a.id_atencion=$1
         GROUP BY a.id_atencion,m.numero,m.capacidad,ua.usuario,uc.usuario`,
        [idAtencion],
    );
    if (!rows[0]) throw Object.assign(new Error("Atención no encontrada"), { status: 404 });
    return rows[0];
};

const cerrarAtencion = async (idAtencion, idUsuario) => {
    idAtencion = validarId(idAtencion, "atención");
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await assertReady(client, false);
        const atencion = await client.query(
            "SELECT id_atencion,estado FROM atencion_mesa WHERE id_atencion=$1 FOR UPDATE",
            [idAtencion],
        );
        if (!atencion.rowCount) throw Object.assign(new Error("Atención no encontrada"), { status: 404 });
        if (atencion.rows[0].estado !== "ABIERTA") throw Object.assign(new Error("La atención ya está cerrada"), { status: 409 });

        const pedidos = await client.query(
            `SELECT p.id_pedido,p.total,p.estado,
                    COALESCE(pg.confirmados,0) AS confirmados,
                    COALESCE(pg.pendientes,0) AS pagos_pendientes
             FROM pedido p
             LEFT JOIN LATERAL (
                 SELECT SUM(monto) FILTER (WHERE estado='CONFIRMADO') AS confirmados,
                        SUM(monto) FILTER (WHERE estado='PENDIENTE') AS pendientes
                 FROM pago WHERE id_pedido=p.id_pedido
             ) pg ON TRUE
             WHERE p.id_atencion=$1
             ORDER BY p.id_pedido
             FOR UPDATE OF p`,
            [idAtencion],
        );
        for (const pedido of pedidos.rows) {
            if (String(pedido.estado).toUpperCase() === "CANCELADO") {
                throw Object.assign(new Error(`El pedido #${pedido.id_pedido} está cancelado y requiere revisión`), { status: 409 });
            }
            if (pedido.total === null) {
                throw Object.assign(new Error(`El pedido #${pedido.id_pedido} no tiene un total confirmado`), { status: 409 });
            }
            if (Number(pedido.pagos_pendientes) > 0) {
                throw Object.assign(new Error(`El pedido #${pedido.id_pedido} tiene pagos pendientes de confirmación`), { status: 409 });
            }
            const saldo = Number(pedido.total) - Number(pedido.confirmados);
            if (saldo > 0) {
                throw Object.assign(new Error(`El pedido #${pedido.id_pedido} mantiene un saldo de ${saldo.toFixed(2)}`), { status: 409 });
            }
            if (saldo < 0) {
                throw Object.assign(new Error(`El pedido #${pedido.id_pedido} presenta pagos superiores al total; requiere conciliación`), { status: 409 });
            }
            if (String(pedido.estado).toUpperCase() !== "ENTREGADO") {
                throw Object.assign(new Error(`El pedido #${pedido.id_pedido} aún no está entregado`), { status: 409 });
            }
        }
        const adicionales = await client.query(
            `SELECT sa.id_solicitud
             FROM solicitud_adicional sa
             INNER JOIN pedido p ON p.id_pedido=sa.id_pedido
             WHERE p.id_atencion=$1 AND sa.estado IN ('PENDIENTE','APROBADO')
             FOR UPDATE OF sa`,
            [idAtencion],
        );
        if (adicionales.rowCount) throw Object.assign(new Error("La atención tiene adicionales pendientes de incorporar o cobrar"), { status: 409 });

        const cierre = await client.query(
            `UPDATE atencion_mesa
             SET estado='CERRADA',cerrada_en=NOW(),id_usuario_cierre=$1
             WHERE id_atencion=$2
             RETURNING id_atencion,id_mesa,estado,abierta_en,cerrada_en,id_usuario_apertura,id_usuario_cierre`,
            [idUsuario, idAtencion],
        );
        await client.query(
            `INSERT INTO historial_atencion_mesa (id_atencion,id_usuario,accion,detalle)
             VALUES ($1,$2,'CIERRE',$3::jsonb)`,
            [idAtencion, idUsuario, JSON.stringify({ pedidos: pedidos.rows.map((pedido) => Number(pedido.id_pedido)) })],
        );
        await client.query("COMMIT");
        return cierre.rows[0];
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

const historialAtencion = async (idAtencion) => {
    idAtencion = validarId(idAtencion, "atención");
    await assertReady(pool, false);
    const { rows } = await pool.query(
        `SELECT h.id_historial,h.fecha,h.accion,h.detalle,u.usuario
         FROM historial_atencion_mesa h
         INNER JOIN usuario u ON u.id_usuario=h.id_usuario
         WHERE h.id_atencion=$1 ORDER BY h.fecha,h.id_historial`,
        [idAtencion],
    );
    return rows;
};

export default {
    listarMesas,
    crearMesa,
    actualizarMesa,
    listarSectores,
    crearSector,
    actualizarSector,
    guardarDistribucion,
    abrirAtencion,
    listarAtencionesAbiertas,
    obtenerAtencion,
    cerrarAtencion,
    historialAtencion,
};
