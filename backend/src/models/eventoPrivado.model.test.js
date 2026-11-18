import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import pool from "../config/db.js";
import eventoPrivadoModel from "./eventoPrivado.model.js";

const codigo = "EVENTO-TEST";
const token = "token-de-prueba-largo-y-aleatorio-123456";
const usuarioAdmin = 7;

const eventoInicial = (estado = "PENDIENTE_REVISION") => ({
    id_evento: 1,
    codigo,
    token_hash: crypto.createHash("sha256").update(token).digest("hex"),
    token_revocado_en: null,
    token_expira_en: null,
    nombre_responsable: "Cliente",
    celular: "70000000",
    correo: null,
    tipo_evento: "Cumpleaños",
    fecha: "2099-12-01",
    hora_inicio: "18:00",
    hora_fin: "22:00",
    invitados: 20,
    decoracion: "NO",
    observaciones: null,
    estado,
    subtotal: 0,
    costos_adicionales: 0,
    total: 0,
    anticipo_requerido: 0,
    condiciones_cancelacion: null,
});

const fixture = ({ estado, pagos = [], montoPago = 50 } = {}) => {
    const state = {
        evento: eventoInicial(estado),
        detalle: [{ id_detalle: 1, id_producto: null, preparacion: "Cena", cantidad_personas: 20, precio_unitario: 0, subtotal: 0, es_adicional: false }],
        historial: [{
            id_historial: 1,
            id_evento: 1,
            accion: "SOLICITUD_PUBLICA",
            estado_anterior: null,
            estado_nuevo: "PENDIENTE_REVISION",
            fecha: "2099-01-01T10:00:00.000Z",
            detalle: { version: 1, propuesta: null, solicitud: { tipo_evento: "Cumpleaños" } },
        }],
        pagos: pagos.map((item, index) => ({
            id_pago_evento: index + 1,
            id_evento: 1,
            importe: montoPago,
            metodo: item.metodo || "TRANSFERENCIA",
            estado: item.estado,
            referencia: item.referencia || null,
        })),
        cancelacion: null,
        caja: [],
    };

    const result = (rows = []) => ({ rows, rowCount: rows.length });
    const fakeQuery = async (statement, params = []) => {
        const sql = String(statement).replace(/\s+/g, " ").trim().toLowerCase();
        if (["begin", "commit", "rollback"].includes(sql)) return result();
        if (sql.includes("to_regclass('public.evento_privado')")) return result([{ ready: true }]);
        if (sql.includes("select a.id_apertura")) return { rows: [{ id_apertura: 1 }], rowCount: 1 };
        if (sql.startsWith("select (($1::date + $2::time)")) {
            return result([{ anticipacion_valida: true, horario_valido: true }]);
        }
        if (sql.startsWith("select (($1::date+$2::time)")) return result([{ valida: true }]);
        if (sql.startsWith("select pg_advisory_xact_lock")) return result([{}]);
        if (sql.startsWith("select codigo from evento_privado")) return result();
        if (sql.startsWith("select count(*)::int + 1 as version")) {
            const count = state.historial.filter((item) => [
                "SOLICITUD_PUBLICA", "REVISION_ADMIN", "RESPUESTA_CLIENTE",
            ].includes(item.accion)).length;
            return result([{ version: count + 1 }]);
        }
        if (sql.includes("select detalle->'propuesta' as propuesta")) {
            const latest = [...state.historial].reverse().find((item) => item.accion === "REVISION_ADMIN");
            return result(latest ? [{ propuesta: latest.detalle.propuesta }] : []);
        }
        if (sql.startsWith("select 1 from pago_evento") && sql.includes("estado in")) {
            const active = state.pagos.some((item) => ["PENDIENTE", "VERIFICADO"].includes(item.estado));
            return active ? result([{}]) : result();
        }
        if (sql.startsWith("select 1 from pago_evento") && sql.includes("estado='pendiente'")) {
            return state.pagos.some((item) => item.estado === "PENDIENTE") ? result([{}]) : result();
        }
        if (sql.startsWith("select coalesce(sum(importe),0) as total from pago_evento")) {
            const total = state.pagos
                .filter((item) => sql.includes("estado='verificado'") ? item.estado === "VERIFICADO" : ["VERIFICADO", "PENDIENTE"].includes(item.estado))
                .reduce((sum, item) => sum + Number(item.importe), 0);
            return result([{ total }]);
        }
        if (sql.startsWith("select coalesce(sum(ingreso-egreso),0) as total from caja")) {
            const total = state.caja.reduce((sum, item) => sum + item.ingreso - item.egreso, 0);
            return result([{ total }]);
        }
        if (sql.includes("from evento_privado") && sql.includes("where codigo=$1")) {
            return state.evento.codigo === params[0] ? result([{ ...state.evento }]) : result();
        }
        if (sql.includes("from evento_privado") && sql.includes("where id_evento=$1")) {
            return Number(params[0]) === state.evento.id_evento ? result([{ ...state.evento }]) : result();
        }
        if (sql.includes("from cancelacion_evento_privado") && sql.includes("where id_evento=$1")) {
            return state.cancelacion ? result([{ ...state.cancelacion }]) : result();
        }
        if (sql.startsWith("select") && sql.includes("from detalle_evento_privado") && sql.includes("where id_evento=$1")) {
            return result(state.detalle.map((item) => ({ ...item })));
        }
        if (sql.includes("from pago_evento") && sql.includes("where p.id_evento=$1")) {
            return result(state.pagos.map((item) => ({ ...item, registrado_por: null, verificado_por: null })));
        }
        if (sql.includes("from pago_evento") && sql.includes("where id_evento=$1")) {
            return result(state.pagos.map(({ importe, metodo, estado: pagoEstado }) => ({
                importe, metodo, estado: pagoEstado, registrado_en: "2099-01-01T10:00:00.000Z", verificado_en: null,
            })));
        }
        if (sql.includes("from historial_evento_privado") && sql.includes("where id_evento=$1")) {
            if (sql.includes("detalle->>'solicitud_id'")) {
                const found = state.historial.find((item) => item.accion === "RESPUESTA_CLIENTE"
                    && item.id_evento === Number(params[0])
                    && item.detalle.solicitud_id === params[1]);
                return found ? result([{ id_historial: found.id_historial }]) : result();
            }
            return result([...state.historial].sort((a, b) => a.id_historial - b.id_historial).map((item) => ({ ...item })));
        }
        if (sql.startsWith("update evento_privado set nombre_responsable=")) {
            const [nombre, celular, correo, tipo, fecha, inicio, fin, invitados, decoracion, observaciones] = params;
            Object.assign(state.evento, {
                nombre_responsable: nombre, celular, correo, tipo_evento: tipo, fecha,
                hora_inicio: inicio, hora_fin: fin, invitados, decoracion, observaciones,
                estado: "PENDIENTE_REVISION", subtotal: 0, costos_adicionales: 0,
                total: 0, anticipo_requerido: 0,
            });
            return result();
        }
        if (sql.startsWith("update evento_privado set estado=$1,subtotal=$2")) {
            const [newState, subtotal, costs, total, advance, conditions, date, start, end] = params;
            Object.assign(state.evento, {
                estado: newState, subtotal, costos_adicionales: costs, total,
                anticipo_requerido: advance, condiciones_cancelacion: conditions,
                fecha: date, hora_inicio: start, hora_fin: end,
            });
            return result();
        }
        if (sql.startsWith("update evento_privado set estado='rechazado'")) {
            state.evento.estado = "RECHAZADO";
            return result();
        }
        if (sql.startsWith("update evento_privado set estado='cancelado'")) {
            state.evento.estado = "CANCELADO";
            return result();
        }
        if (sql.startsWith("delete from detalle_evento_privado")) {
            state.detalle = [];
            return result();
        }
        if (sql.startsWith("insert into detalle_evento_privado")) {
            if (sql.includes("values ($1,$2,$3,0,0,false)")) {
                state.detalle.push({
                    id_detalle: state.detalle.length + 1,
                    id_evento: params[0], preparacion: params[1], cantidad_personas: params[2],
                    id_producto: null, precio_unitario: 0, subtotal: 0, es_adicional: false,
                });
            } else {
                state.detalle.push({
                    id_detalle: state.detalle.length + 1,
                    id_evento: params[0], id_producto: params[1], preparacion: params[2],
                    cantidad_personas: params[3], precio_unitario: params[4], subtotal: params[5], es_adicional: params[6],
                });
            }
            return result();
        }
        if (sql.startsWith("insert into historial_evento_privado")) {
            const [idEvento, idUsuario, accion, anterior, nuevo, detalle] = params;
            state.historial.push({
                id_historial: state.historial.length + 1,
                id_evento: idEvento,
                id_usuario: idUsuario,
                accion,
                estado_anterior: anterior,
                estado_nuevo: nuevo,
                detalle: JSON.parse(detalle),
                fecha: `2099-01-${String(state.historial.length + 1).padStart(2, "0")}T10:00:00.000Z`,
            });
            return result();
        }
        if (sql.startsWith("insert into cancelacion_evento_privado")) {
            const [idEvento, idUsuario, motivo, condiciones, recibido, devuelto, retenido, metodo, estado, solicitudId] = params;
            state.cancelacion = {
                id_cancelacion: 1,
                id_evento: idEvento,
                tipo_responsable: "USUARIO",
                id_usuario_responsable: idUsuario,
                motivo,
                condiciones_aplicadas: condiciones,
                monto_recibido: recibido,
                monto_devuelto: devuelto,
                monto_retenido: retenido,
                metodo_devolucion: metodo,
                estado,
                solicitud_id: solicitudId,
                id_usuario_autorizacion: estado === "AUTORIZADA" ? idUsuario : null,
                autorizada_en: estado === "AUTORIZADA" ? "2099-01-01T10:00:00.000Z" : null,
                id_usuario_devolucion: null,
                devuelta_en: null,
                solicitud_devolucion_id: null,
                id_caja: null,
                creada_en: "2099-01-01T10:00:00.000Z",
            };
            return result([{ ...state.cancelacion }]);
        }
        if (sql.startsWith("insert into caja")) {
            const [concepto, egreso, saldo, idUsuario] = params;
            state.caja.push({ id_caja: state.caja.length + 1, concepto, ingreso: 0, egreso, saldo, id_usuario: idUsuario });
            return result([{ id_caja: state.caja.length }]);
        }
        if (sql.startsWith("update cancelacion_evento_privado")) {
            const [referencia, solicitudId, idUsuario, idCaja] = params;
            Object.assign(state.cancelacion, {
                estado: "DEVUELTA",
                referencia_devolucion: referencia,
                solicitud_devolucion_id: solicitudId,
                id_usuario_devolucion: idUsuario,
                devuelta_en: "2099-01-02T10:00:00.000Z",
                id_caja: idCaja,
            });
            return result([{ ...state.cancelacion }]);
        }
        if (sql.startsWith("insert into bitacora_operaciones")) return result();
        throw new Error(`Consulta no simulada en prueba: ${sql}`);
    };

    return {
        state,
        query: fakeQuery,
        connect: async () => ({ query: fakeQuery, release() {} }),
    };
};

const withDatabase = async (t, mock) => {
    const originalQuery = pool.query;
    const originalConnect = pool.connect;
    pool.query = mock.query;
    pool.connect = mock.connect;
    t.after(() => {
        pool.query = originalQuery;
        pool.connect = originalConnect;
    });
};

test("simulated change request, customer response and new review preserve proposal versions", async (t) => {
    const mock = fixture();
    await withDatabase(t, mock);
    const primera = await eventoPrivadoModel.revisar(1, {
        accion: "SOLICITAR_CAMBIOS",
        observaciones_admin: "Ajustar cantidades y confirmar horario",
        condiciones_cancelacion: "Según lo acordado por escrito",
        detalle: [{ preparacion: "Cena", cantidad_personas: 20, precio_unitario: 100 }],
        costos_adicionales: 50,
        anticipo_requerido: 100,
    }, usuarioAdmin);
    assert.equal(primera.estado, "REQUIERE_CAMBIOS");
    assert.equal(primera.total, 2050);
    assert.equal(primera.historial.at(-1).accion, "REVISION_ADMIN");

    const respuestaDatos = {
        solicitud_id: "99ff2a95-b42e-4027-a889-cf3eeacbb7e6",
        nombre_responsable: "Cliente actualizado",
        celular: "71111111",
        tipo_evento: "Cumpleaños",
        fecha: "2099-12-02",
        hora_inicio: "17:00",
        hora_fin: "21:00",
        invitados: 24,
        decoracion: "NO",
        detalle: [{ preparacion: "Cena", cantidad_personas: 24 }],
        total: 1,
        anticipo_requerido: 1,
    };
    const respuesta = await eventoPrivadoModel.responderSolicitud(codigo, token, respuestaDatos);
    const respuestaDuplicada = await eventoPrivadoModel.responderSolicitud(codigo, token, respuestaDatos);
    assert.equal(respuesta.estado, "PENDIENTE_REVISION");
    assert.equal(respuestaDuplicada.duplicate, true);
    assert.equal(respuesta.total, 0);
    assert.equal(respuesta.detalle[0].precio_unitario, 0);
    assert.equal(respuesta.propuestas.find((item) => item.version === 2).propuesta.total, 2050);
    assert.equal(respuesta.propuestas.find((item) => item.version === 3).solicitud.invitados, 24);

    const aprobada = await eventoPrivadoModel.revisar(1, {
        accion: "APROBAR",
        detalle: [{ preparacion: "Cena", cantidad_personas: 24, precio_unitario: 125 }],
        costos_adicionales: 75,
        anticipo_requerido: 500,
        condiciones_cancelacion: "Condiciones específicas de esta propuesta",
    }, usuarioAdmin);
    assert.equal(aprobada.estado, "APROBADO_PENDIENTE_ANTICIPO");
    assert.equal(aprobada.total, 3075);
    assert.deepEqual(
        aprobada.historial.filter((item) => item.detalle?.version).map((item) => item.detalle.version),
        [1, 2, 3, 4],
    );
    assert.equal(aprobada.historial.find((item) => item.detalle?.version === 2).detalle.propuesta.detalle[0].precio_unitario, 100);
    assert.equal(mock.state.detalle[0].precio_unitario, 125);
    assert.equal(aprobada.detalle[0].precio_unitario, 125);
});

test("simulated cancellation and cash refund are auditable, idempotent and do not rewrite incoming payments", async (t) => {
    const mock = fixture({
        estado: "CONFIRMADO",
        pagos: [{ estado: "VERIFICADO", metodo: "EFECTIVO" }],
        montoPago: 50,
    });
    await withDatabase(t, mock);
    const solicitudCancelacion = "7e13d262-2fc3-4ba7-93d6-33e55fbe1d12";
    const datos = {
        solicitud_id: solicitudCancelacion,
        motivo: "Cancelación acordada con el cliente",
        condiciones_aplicadas: "Se retiene Bs 20 según el acuerdo de este evento",
        monto_devuelto: 30,
        monto_retenido: 20,
        metodo_devolucion: "EFECTIVO",
    };
    const autorizada = await eventoPrivadoModel.cancelarAdministrativamente(1, datos, usuarioAdmin);
    assert.equal(autorizada.estado, "AUTORIZADA");
    const repetida = await eventoPrivadoModel.cancelarAdministrativamente(1, datos, usuarioAdmin);
    assert.equal(repetida.duplicate, true);

    const solicitudDevolucion = "5ac1a477-a7ac-420f-9f35-6a9c1c58a990";
    const devolucion = await eventoPrivadoModel.registrarDevolucion(1, {
        solicitud_id: solicitudDevolucion,
        referencia_devolucion: "RECIBO-DEV-001",
    }, usuarioAdmin);
    const repetidaDevolucion = await eventoPrivadoModel.registrarDevolucion(1, {
        solicitud_id: solicitudDevolucion,
        referencia_devolucion: "RECIBO-DEV-001",
    }, usuarioAdmin);
    assert.equal(devolucion.estado, "DEVUELTA");
    assert.equal(repetidaDevolucion.duplicate, true);
    assert.equal(mock.state.caja.length, 1);
    assert.equal(mock.state.caja[0].ingreso, 0);
    assert.equal(mock.state.caja[0].egreso, 30);
    assert.equal(mock.state.pagos[0].estado, "VERIFICADO");
    assert.equal(mock.state.pagos[0].importe, 50);
    assert.equal(mock.state.cancelacion.id_caja, 1);
    assert.ok(mock.state.historial.some((item) => item.accion === "CANCELACION_ADMIN"));
    assert.ok(mock.state.historial.some((item) => item.accion === "DEVOLUCION_REGISTRADA"));
});

test("simulated cancellation rejects amounts that do not reconcile with verified payments", async (t) => {
    const mock = fixture({
        estado: "CONFIRMADO",
        pagos: [{ estado: "VERIFICADO", metodo: "TRANSFERENCIA" }],
        montoPago: 50,
    });
    await withDatabase(t, mock);
    await assert.rejects(
        eventoPrivadoModel.cancelarAdministrativamente(1, {
            solicitud_id: "16c1b33e-b658-416c-a73d-b6e8f24d743d",
            motivo: "Cancelación",
            condiciones_aplicadas: "Acuerdo individual",
            monto_devuelto: 40,
            monto_retenido: 5,
            metodo_devolucion: "TRANSFERENCIA",
        }, usuarioAdmin),
        (error) => error.status === 400,
    );
    assert.equal(mock.state.cancelacion, null);
    assert.equal(mock.state.evento.estado, "CONFIRMADO");
});

test("simulated transfer refund does not create a Caja movement", async (t) => {
    const mock = fixture({
        estado: "CONFIRMADO",
        pagos: [{ estado: "VERIFICADO", metodo: "TRANSFERENCIA" }],
        montoPago: 50,
    });
    await withDatabase(t, mock);
    await eventoPrivadoModel.cancelarAdministrativamente(1, {
        solicitud_id: "f2be12c9-199b-4a9d-bc55-3c660257bfaf",
        motivo: "Cancelación acordada",
        condiciones_aplicadas: "Devolución íntegra según acuerdo",
        monto_devuelto: 50,
        monto_retenido: 0,
        metodo_devolucion: "TRANSFERENCIA",
    }, usuarioAdmin);
    await eventoPrivadoModel.registrarDevolucion(1, {
        solicitud_id: "e374c8f6-7a8a-4286-9aa3-e10463fb266e",
        referencia_devolucion: "TRF-DEV-008",
    }, usuarioAdmin);
    assert.equal(mock.state.cancelacion.estado, "DEVUELTA");
    assert.equal(mock.state.cancelacion.id_caja, null);
    assert.equal(mock.state.caja.length, 0);
});
