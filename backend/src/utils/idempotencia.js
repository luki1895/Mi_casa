import { createHash } from "node:crypto";

const validarSolicitudId = (solicitudId) => {
    const texto = String(solicitudId || "").trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(texto)) {
        throw Object.assign(new Error("Envía una clave Idempotency-Key UUID válida para crear esta operación"), { status: 400 });
    }
    return texto.toLowerCase();
};

const hashPayload = (payload) => createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");

const obtenerReintento = async (client, idUsuario, solicitudId, operacion, payload) => {
    const clave = validarSolicitudId(solicitudId);
    const payloadHash = hashPayload(payload);
    await client.query(
        "SELECT pg_advisory_xact_lock(hashtext($1))",
        [`idempotencia:${idUsuario}:${clave}`],
    );
    const existente = await client.query(
        `SELECT operacion,payload_hash,resultado
         FROM idempotencia_operacion
         WHERE id_usuario=$1 AND solicitud_id=$2
         FOR UPDATE`,
        [idUsuario, clave],
    );
    if (!existente.rowCount) return { clave, payloadHash, resultado: null };
    if (existente.rows[0].operacion !== operacion || existente.rows[0].payload_hash !== payloadHash) {
        throw Object.assign(new Error("La clave Idempotency-Key ya fue utilizada para una solicitud distinta"), { status: 409 });
    }
    return { clave, payloadHash, resultado: existente.rows[0].resultado };
};

const guardarResultado = async (client, idUsuario, solicitud, operacion, resultado) => {
    await client.query(
        `INSERT INTO idempotencia_operacion
            (id_usuario,solicitud_id,operacion,payload_hash,resultado)
         VALUES ($1,$2,$3,$4,$5::jsonb)`,
        [
            idUsuario,
            solicitud.clave,
            operacion,
            solicitud.payloadHash,
            JSON.stringify(resultado),
        ],
    );
};

export { guardarResultado, obtenerReintento, validarSolicitudId };
