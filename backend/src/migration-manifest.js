const filename = (name) => `${name}.sql`;

export const migrationManifest = Object.freeze({
    [filename("000_init_schema")]: {
        dependencies: [],
        manualOnly: false,
    },
    [filename("001_operaciones_restaurante")]: {
        dependencies: [filename("000_init_schema")],
        manualOnly: false,
    },
    [filename("002_saldos_independientes_pensionados")]: {
        dependencies: [filename("000_init_schema")],
        manualOnly: false,
    },
    [filename("003_restaurar_usuarios_prueba")]: {
        dependencies: [filename("000_init_schema")],
        manualOnly: true,
    },
    [filename("004_maria_prueba_como_mesera")]: {
        dependencies: null,
        manualOnly: true,
    },
    [filename("005_integral_completion")]: {
        dependencies: [filename("001_operaciones_restaurante")],
        manualOnly: false,
    },
    [filename("006_mesas_atenciones")]: {
        dependencies: [filename("000_init_schema")],
        manualOnly: false,
    },
    [filename("007_producto_imagen")]: {
        dependencies: [filename("000_init_schema")],
        manualOnly: false,
    },
    [filename("008_reservas_platos")]: {
        dependencies: [filename("000_init_schema")],
        manualOnly: false,
    },
    [filename("009_eventos_cancelaciones")]: {
        dependencies: [
            filename("000_init_schema"),
            filename("008_reservas_platos"),
        ],
        manualOnly: false,
    },
    [filename("010_configuracion_mesas")]: {
        dependencies: [filename("006_mesas_atenciones")],
        manualOnly: false,
    },
    [filename("011_distribucion_plano_mesas")]: {
        dependencies: [filename("010_configuracion_mesas")],
        manualOnly: false,
    },
});
