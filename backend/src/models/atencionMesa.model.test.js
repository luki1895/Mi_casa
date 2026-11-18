import assert from "node:assert/strict";
import test from "node:test";
import pool from "../config/db.js";
import atencionMesaModel from "./atencionMesa.model.js";

const esquemaCompleto = {
    mesa: true,
    atencion_mesa: true,
    historial_atencion_mesa: true,
    sector_mesa: true,
    configuracion_mesas: true,
    plano_mesas: true,
};

const resultado = (rows = []) => ({ rows, rowCount: rows.length });

test("el tablero incluye las mesas deshabilitadas y conserva el estado de atención real", async (context) => {
    const sentencias = [];
    context.mock.method(pool, "query", async (sql, parametros) => {
        sentencias.push({ sql, parametros });
        if (sql.includes("to_regclass('public.mesa')")) return resultado([esquemaCompleto]);
        return resultado([
            { id_mesa: 1, habilitada: true, estado: "ACTIVA", id_atencion: null },
            { id_mesa: 2, habilitada: true, estado: "FUERA_SERVICIO", id_atencion: 8 },
        ]);
    });

    const mesas = await atencionMesaModel.listarMesas();

    assert.deepEqual(mesas.map((mesa) => mesa.estado_atencion), ["DISPONIBLE", "OCUPADA"]);
    assert.match(sentencias[1].sql, /WHERE \$1::boolean OR m\.habilitada=TRUE/);
    assert.match(sentencias[1].sql, /SUM\(GREATEST\(p\.total-COALESCE\(pg\.pagado,0\),0\)\)/);
    assert.match(sentencias[1].sql, /estado='CONFIRMADO'/);
    assert.match(sentencias[1].sql, /COUNT\(p\.id_pedido\) FILTER \(WHERE p\.total IS NULL\)/);
    assert.deepEqual(sentencias[1].parametros, [true]);
});

test("la consulta administrativa incluye mesas deshabilitadas para poder habilitarlas", async (context) => {
    let parametrosConsulta;
    context.mock.method(pool, "query", async (sql, parameters) => {
        if (sql.includes("to_regclass('public.mesa')")) return resultado([esquemaCompleto]);
        parametrosConsulta = parameters;
        return resultado([{ id_mesa: 4, habilitada: false, estado: "ACTIVA", id_atencion: null }]);
    });

    const mesas = await atencionMesaModel.listarMesas(true);

    assert.deepEqual(parametrosConsulta, [true]);
    assert.equal(mesas[0].habilitada, false);
    assert.equal(mesas[0].estado_atencion, null);
    assert.equal(mesas[0].estado_operativo, "DISPONIBLE");
});

test("el esquema incompleto informa HTTP 503 en lugar de devolver mesas vacías", async (context) => {
    context.mock.method(pool, "query", async () => resultado([{
        ...esquemaCompleto,
        mesa: false,
        sector_mesa: false,
        configuracion_mesas: false,
        plano_mesas: false,
    }]));

    await assert.rejects(
        atencionMesaModel.listarMesas(),
        (error) => error.status === 503
            && error.message.includes("006_mesas_atenciones.sql")
            && error.message.includes("010_configuracion_mesas.sql")
            && error.message.includes("011_distribucion_plano_mesas.sql"),
    );
});

test("las consultas históricas de atenciones no dependen de la nueva migración de configuración", async (context) => {
    let consultas = 0;
    context.mock.method(pool, "query", async (sql) => {
        consultas += 1;
        if (sql.includes("to_regclass('public.mesa')")) {
            return resultado([{
                ...esquemaCompleto,
                sector_mesa: false,
                configuracion_mesas: false,
            }]);
        }
        assert.match(sql, /FROM atencion_mesa a/);
        return resultado([]);
    });

    assert.deepEqual(await atencionMesaModel.listarAtencionesAbiertas(), []);
    assert.equal(consultas, 2);
});

test("la creación persiste capacidad, sector, orden y habilitación en la mesa real", async (context) => {
    let insertParameters;
    context.mock.method(pool, "query", async (sql, parameters) => {
        if (sql.includes("to_regclass('public.mesa')")) return resultado([esquemaCompleto]);
        insertParameters = parameters;
        return resultado([{
            id_mesa: 3,
            numero: "Patio 1",
            capacidad: 4,
            id_sector: 9,
            orden_visualizacion: 2,
            habilitada: false,
            estado: "ACTIVA",
        }]);
    });

    const mesa = await atencionMesaModel.crearMesa({
        numero: " Patio 1 ",
        capacidad: 4,
        id_sector: 9,
        orden_visualizacion: 2,
        habilitada: false,
        estado: "ACTIVA",
    });

    assert.deepEqual(insertParameters, ["Patio 1", 4, 9, 2, false, "ACTIVA", null, null, 0, "CIRCULAR", 0.12, 0.12]);
    assert.equal(mesa.habilitada, false);
});

test("no permite crear una mesa ya ubicada fuera del guardado transaccional del plano", async (context) => {
    let insertEjecutado = false;
    context.mock.method(pool, "query", async (sql) => {
        if (sql.includes("to_regclass('public.mesa')")) return resultado([esquemaCompleto]);
        insertEjecutado = true;
        return resultado();
    });

    await assert.rejects(
        atencionMesaModel.crearMesa({
            numero: "Mesa ubicada",
            capacidad: 2,
            posicion_x: 0.5,
            posicion_y: 0.5,
        }),
        (error) => error.status === 400 && /editor del plano/.test(error.message),
    );
    assert.equal(insertEjecutado, false);
});

test("la edición actualiza organización y datos sin reemplazar el registro de mesa", async (context) => {
    let updateParameters;
    const sentencias = [];
    const client = {
        async query(sql, parameters) {
            sentencias.push(sql);
            if (sql.includes("to_regclass('public.mesa')")) return resultado([esquemaCompleto]);
            if (sql.includes("SELECT id_mesa,posicion_x")) {
                return resultado([{
                    id_mesa: 3,
                    posicion_x: null,
                    posicion_y: null,
                    rotacion_grados: 0,
                    forma_visual: "CIRCULAR",
                    ancho_visual: 0.12,
                    alto_visual: 0.12,
                }]);
            }
            if (sql.startsWith("UPDATE mesa")) {
                updateParameters = parameters;
                return resultado([{
                    id_mesa: 3,
                    numero: "Patio 2",
                    capacidad: 6,
                    id_sector: 9,
                    orden_visualizacion: 4,
                    habilitada: true,
                    estado: "ACTIVA",
                }]);
            }
            return resultado();
        },
        release() {},
    };
    context.mock.method(pool, "connect", async () => client);

    const mesa = await atencionMesaModel.actualizarMesa(3, {
        numero: "Patio 2",
        capacidad: 6,
        id_sector: 9,
        orden_visualizacion: 4,
        habilitada: true,
        estado: "ACTIVA",
    });

    assert.deepEqual(updateParameters, ["Patio 2", 6, 9, 4, true, "ACTIVA", null, null, 0, "CIRCULAR", 0.12, 0.12, 3]);
    assert.equal(mesa.id_mesa, 3);
    assert.ok(sentencias.includes("COMMIT"));
    assert.equal(sentencias.some((sql) => sql.startsWith("DELETE FROM mesa")), false);
});

test("no permite deshabilitar una mesa con atención abierta", async (context) => {
    const sentencias = [];
    const client = {
        async query(sql) {
            sentencias.push(sql);
            if (sql.includes("to_regclass('public.mesa')")) return resultado([esquemaCompleto]);
            if (sql.includes("SELECT id_mesa,posicion_x")) {
                return resultado([{
                    id_mesa: 3,
                    posicion_x: null,
                    posicion_y: null,
                    rotacion_grados: 0,
                    forma_visual: "CIRCULAR",
                    ancho_visual: 0.12,
                    alto_visual: 0.12,
                }]);
            }
            if (sql.includes("SELECT 1 FROM atencion_mesa")) return { rows: [{ id_atencion: 11 }], rowCount: 1 };
            return resultado();
        },
        release() {},
    };
    context.mock.method(pool, "connect", async () => client);

    await assert.rejects(
        atencionMesaModel.actualizarMesa(3, {
            numero: "Mesa 3",
            capacidad: 4,
            habilitada: false,
            estado: "ACTIVA",
        }),
        (error) => error.status === 409 && /atención abierta/.test(error.message),
    );

    assert.ok(sentencias.includes("ROLLBACK"));
    assert.equal(sentencias.some((sql) => sql.includes("UPDATE mesa")), false);
});

test("rechaza cambios de geometría que superponen otra mesa", async (context) => {
    const sentencias = [];
    const client = {
        async query(sql) {
            sentencias.push(sql);
            if (sql.includes("to_regclass('public.mesa')")) return resultado([esquemaCompleto]);
            if (sql.includes("SELECT id_mesa,posicion_x")) {
                return resultado([
                    { id_mesa: 1, posicion_x: 0.3, posicion_y: 0.5, rotacion_grados: 0, forma_visual: "CIRCULAR", ancho_visual: 0.2, alto_visual: 0.2 },
                    { id_mesa: 2, posicion_x: 0.7, posicion_y: 0.5, rotacion_grados: 0, forma_visual: "CIRCULAR", ancho_visual: 0.2, alto_visual: 0.2 },
                ]);
            }
            return resultado();
        },
        release() {},
    };
    context.mock.method(pool, "connect", async () => client);

    await assert.rejects(
        atencionMesaModel.actualizarMesa(1, {
            numero: "Mesa 1",
            capacidad: 2,
            habilitada: true,
            estado: "ACTIVA",
            posicion_x: 0.6,
            posicion_y: 0.5,
            ancho_visual: 0.2,
            alto_visual: 0.2,
        }),
        (error) => error.status === 409 && /se superponen/.test(error.message),
    );

    assert.ok(sentencias.includes("ROLLBACK"));
    assert.equal(sentencias.some((sql) => sql.startsWith("UPDATE mesa")), false);
});

test("no permite abrir una atención en una mesa deshabilitada", async (context) => {
    const sentencias = [];
    const client = {
        async query(sql) {
            sentencias.push(sql);
            if (sql.includes("to_regclass('public.mesa')")) return resultado([esquemaCompleto]);
            if (sql.includes("SELECT id_mesa,estado,habilitada FROM mesa")) {
                return { rows: [{ id_mesa: 3, estado: "ACTIVA", habilitada: false }], rowCount: 1 };
            }
            return resultado();
        },
        release() {},
    };
    context.mock.method(pool, "connect", async () => client);

    await assert.rejects(
        atencionMesaModel.abrirAtencion(3, 5),
        (error) => error.status === 409 && /deshabilitada/.test(error.message),
    );

    assert.ok(sentencias.includes("ROLLBACK"));
    assert.equal(sentencias.some((sql) => sql.includes("INSERT INTO atencion_mesa")), false);
});

test("guarda posiciones y geometría normalizadas dentro de una transacción", async (context) => {
    const sentencias = [];
    const distribucion = [
        { id_mesa: 1, posicion_x: 0.25, posicion_y: 0.25, rotacion_grados: 0, forma_visual: "CIRCULAR", ancho_visual: 0.12, alto_visual: 0.12 },
        { id_mesa: 2, posicion_x: 0.65, posicion_y: 0.65, rotacion_grados: 90, forma_visual: "RECTANGULAR", ancho_visual: 0.18, alto_visual: 0.12 },
        { id_mesa: 3, posicion_x: null, posicion_y: null, rotacion_grados: 0, forma_visual: "CUADRADA", ancho_visual: 0.16, alto_visual: 0.16 },
    ];
    const client = {
        async query(sql, parameters) {
            sentencias.push({ sql, parameters });
            if (sql.includes("to_regclass('public.mesa')")) return resultado([esquemaCompleto]);
            if (sql.includes("SELECT id_mesa,posicion_x")) {
                return resultado(distribucion.map((mesa) => ({
                    ...mesa,
                    posicion_x: null,
                    posicion_y: null,
                })));
            }
            if (sql.includes("jsonb_to_recordset")) {
                return resultado(JSON.parse(parameters[0]));
            }
            return resultado();
        },
        release() {},
    };
    context.mock.method(pool, "connect", async () => client);

    const guardadas = await atencionMesaModel.guardarDistribucion(distribucion);

    assert.equal(guardadas.length, 3);
    assert.ok(sentencias.some(({ sql }) => sql === "BEGIN"));
    assert.ok(sentencias.some(({ sql }) => sql === "COMMIT"));
    assert.equal(sentencias.some(({ sql }) => sql === "ROLLBACK"), false);
});

test("rechaza solapamientos del plano sin ejecutar la actualización", async (context) => {
    const sentencias = [];
    const client = {
        async query(sql) {
            sentencias.push(sql);
            if (sql.includes("to_regclass('public.mesa')")) return resultado([esquemaCompleto]);
            if (sql.includes("SELECT id_mesa,posicion_x")) {
                return resultado([
                    { id_mesa: 1, posicion_x: null, posicion_y: null, rotacion_grados: 0, forma_visual: "CIRCULAR", ancho_visual: 0.2, alto_visual: 0.2 },
                    { id_mesa: 2, posicion_x: null, posicion_y: null, rotacion_grados: 0, forma_visual: "CIRCULAR", ancho_visual: 0.2, alto_visual: 0.2 },
                ]);
            }
            return resultado();
        },
        release() {},
    };
    context.mock.method(pool, "connect", async () => client);

    await assert.rejects(
        atencionMesaModel.guardarDistribucion([
            { id_mesa: 1, posicion_x: 0.5, posicion_y: 0.5, rotacion_grados: 0, forma_visual: "CIRCULAR", ancho_visual: 0.2, alto_visual: 0.2 },
            { id_mesa: 2, posicion_x: 0.5, posicion_y: 0.5, rotacion_grados: 0, forma_visual: "CIRCULAR", ancho_visual: 0.2, alto_visual: 0.2 },
        ]),
        (error) => error.status === 409 && /se superponen/.test(error.message),
    );

    assert.ok(sentencias.includes("ROLLBACK"));
    assert.equal(sentencias.some((sql) => sql.includes("jsonb_to_recordset")), false);
});
