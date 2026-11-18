import { Alert, Badge, Button, Card } from "./ui";

const importe = (value) => {
    const amount = Number(value);
    return value === null || value === undefined || value === "" || !Number.isFinite(amount)
        ? "No disponible"
        : `Bs ${amount.toFixed(2)}`;
};
const estadoBonito = (value) => String(value || "SIN INFORMACION").replaceAll("_", " ");
const fechaBonita = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? null
        : new Intl.DateTimeFormat("es-BO", { dateStyle: "medium", timeStyle: "short" }).format(date);
};

function MesaAtencionDetail({
    atencion,
    loading = false,
    error = "",
    onRetry,
    actionsForOrder,
    renderOrderEditor,
    paymentsForOrder,
}) {
    if (!atencion && !loading && !error) return null;
    const pedidos = atencion?.pedidos || [];
    const pedidosNoAnulados = pedidos.filter((pedido) => !String(pedido.estado).toUpperCase().startsWith("CANCEL"));
    const totalAtencion = pedidosNoAnulados.some((pedido) =>
        pedido.total === null || pedido.total === undefined || pedido.total === "" || !Number.isFinite(Number(pedido.total))
    )
        ? null
        : pedidosNoAnulados.reduce((sum, pedido) => sum + Number(pedido.total), 0);
    const openedAt = fechaBonita(atencion?.abierta_en);

    return (
        <Card
            title={atencion ? `Atención de la mesa ${atencion.mesa}` : "Detalle de atención"}
            description={atencion ? `Atención #${atencion.id_atencion} · Responsable: ${atencion.responsable || "No disponible"}` : "Consulta de pedidos y saldos"}
            actions={onRetry && atencion ? <Button size="sm" variant="secondary" onClick={() => onRetry(atencion.id_atencion)} loading={loading}>Actualizar detalle</Button> : null}
            className="border-[#E8DDD1]"
        >
            {error && <Alert type="error" onRetry={atencion && onRetry ? () => onRetry(atencion.id_atencion) : undefined}>{error}</Alert>}
            {loading && <p role="status" className="py-4 text-sm text-slate-500">Consultando atención y pedidos...</p>}
            {atencion && (
                <>
                    <section aria-label="Resumen de atención" className="mb-5 rounded-xl border border-[#E8DDD1] bg-[#FCFAF7] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8A796A]">Estado de la atención</p>
                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                    <Badge variant={atencion.estado === "ABIERTA" ? "warning" : "neutral"}>{estadoBonito(atencion.estado)}</Badge>
                                    {openedAt && <span className="text-xs text-[#75675C]">Abierta {openedAt}</span>}
                                </div>
                            </div>
                            <span className="text-xs font-semibold text-[#75675C]">Mesa {atencion.mesa}</span>
                        </div>
                        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-[#E8DDD1] pt-4 text-sm sm:grid-cols-4">
                            <div><dt className="text-xs text-[#75675C]">Pedidos</dt><dd className="mt-1 font-bold text-[#342820]">{pedidos.length}</dd></div>
                            <div><dt className="text-xs text-[#75675C]">Importe no anulado</dt><dd className="mt-1 font-bold text-[#342820]">{importe(totalAtencion)}</dd></div>
                            <div><dt className="text-xs text-[#75675C]">Saldo pendiente</dt><dd className={`mt-1 font-bold ${Number(atencion.saldo_pendiente) > 0 ? "text-rose-700" : "text-[#342820]"}`}>{importe(atencion.saldo_pendiente)}</dd></div>
                            <div><dt className="text-xs text-[#75675C]">Responsable</dt><dd className="mt-1 break-words font-semibold text-[#342820]">{atencion.responsable || "No disponible"}</dd></div>
                        </dl>
                    </section>
                    {error && <Alert type="warning">Se muestran los datos disponibles; revisa el detalle de cada pedido antes de operar.</Alert>}
                    <section aria-label="Pedidos asociados a la atención" className="space-y-4">
                        <div className="flex flex-wrap items-end justify-between gap-2">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#B85C3B]">Detalle de operación</p>
                                <h3 className="text-lg font-black text-[#342820]">Pedidos de esta atención</h3>
                            </div>
                            <span className="text-xs text-[#75675C]">Cada pedido conserva su estado y saldo independiente.</span>
                        </div>
                        {pedidos.map((pedido, index) => {
                            const pagos = paymentsForOrder?.(pedido) || [];
                            const saldo = pedido.saldo_pendiente === null
                                || pedido.saldo_pendiente === undefined
                                || pedido.saldo_pendiente === ""
                                || !Number.isFinite(Number(pedido.saldo_pendiente))
                                ? null
                                : Number(pedido.saldo_pendiente);
                            return (
                                <article key={pedido.id_pedido} className="overflow-hidden rounded-xl border border-[#E8DDD1] bg-white">
                                    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[#F0E9E1] bg-[#FCFAF7] px-4 py-3">
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8A796A]">Pedido {String(index + 1).padStart(2, "0")}</p>
                                            <h4 className="mt-1 text-base font-black text-[#342820]">#{pedido.id_pedido}</h4>
                                            {pedido.cliente && <p className="mt-0.5 text-xs text-[#75675C]">{pedido.cliente}</p>}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge variant={pedido.estado === "ENTREGADO" ? "success" : pedido.estado === "CANCELADO" ? "danger" : "warning"}>{estadoBonito(pedido.estado)}</Badge>
                                            {saldo > 0 && <Badge variant="danger">Con saldo</Badge>}
                                        </div>
                                    </header>

                                    <div className="space-y-4 p-4">
                                        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                                            <div><dt className="text-xs text-[#75675C]">Total del pedido</dt><dd className="mt-1 font-bold text-[#342820]">{importe(pedido.total)}</dd></div>
                                            <div><dt className="text-xs text-[#75675C]">Pagos confirmados</dt><dd className="mt-1 font-semibold text-[#342820]">{importe(pedido.pagado_confirmado)}</dd></div>
                                            <div><dt className="text-xs text-[#75675C]">Saldo pendiente</dt><dd className={`mt-1 font-bold ${saldo > 0 ? "text-rose-700" : "text-[#342820]"}`}>{importe(pedido.saldo_pendiente)}</dd></div>
                                            <div><dt className="text-xs text-[#75675C]">Estado de pago</dt><dd className="mt-1 font-semibold text-[#342820]">{pedido.pagado ? "Pagado" : saldo === null ? "No disponible" : saldo > 0 ? "Pendiente" : "Sin saldo"}</dd></div>
                                        </dl>

                                        {pagos.length > 0 && (
                                            <section aria-label={`Pagos registrados del pedido ${pedido.id_pedido}`} className="rounded-lg border border-[#E8DDD1] px-3 py-2">
                                                <h5 className="text-xs font-bold uppercase tracking-wide text-[#75675C]">Pagos registrados</h5>
                                                <ul className="mt-2 space-y-2 text-xs">
                                                    {pagos.map((pago) => (
                                                        <li key={pago.id_pago} className="flex flex-wrap justify-between gap-2 border-t border-[#F0E9E1] pt-2">
                                                            <span>#{pago.id_pago} · {pago.metodo} · {estadoBonito(pago.estado)}</span>
                                                            <strong>{importe(pago.monto)}</strong>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </section>
                                        )}

                                        <section aria-label={`Productos del pedido ${pedido.id_pedido}`}>
                                            <h5 className="text-xs font-bold uppercase tracking-wide text-[#75675C]">Productos y cantidades</h5>
                                            {pedido.detalleNoDisponible ? (
                                                <p className="mt-2 text-sm text-rose-700">No se pudo cargar el detalle de productos de este pedido.</p>
                                            ) : pedido.detalle?.length ? (
                                                <ul className="mt-2 divide-y divide-[#F0E9E1] rounded-lg border border-[#F0E9E1]">
                                                    {pedido.detalle.map((item, lineIndex) => (
                                                        <li key={`${pedido.id_pedido}-${item.id_producto}-${lineIndex}`} className="flex flex-wrap justify-between gap-2 px-3 py-2 text-sm">
                                                            <span className="min-w-0 flex-1"><strong>{item.cantidad} ×</strong> {item.nombre}</span>
                                                            <strong className="text-[#342820]">{importe(item.subtotal ?? Number(item.precio) * Number(item.cantidad))}</strong>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="mt-2 rounded-lg bg-[#FCFAF7] p-3 text-sm text-[#75675C]">Este pedido no tiene productos disponibles para mostrar.</p>
                                            )}
                                        </section>

                                        {actionsForOrder && <div className="flex flex-wrap gap-2 border-t border-[#F0E9E1] pt-3">{actionsForOrder(pedido)}</div>}
                                        {renderOrderEditor?.(pedido)}
                                    </div>
                                </article>
                            );
                        })}
                        {!pedidos.length && <p className="rounded-lg bg-[#FCFAF7] py-5 text-center text-sm text-[#75675C]">Esta atención todavía no tiene pedidos asociados.</p>}
                    </section>
                </>
            )}
        </Card>
    );
}

export default MesaAtencionDetail;
