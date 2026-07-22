const ok = (res, data, mensaje = "Operación realizada correctamente") => {

    return res.status(200).json({

        ok: true,

        mensaje,

        data

    });

};

const error = (res, mensaje = "Error interno", codigo = 500) => {

    return res.status(codigo).json({

        ok: false,

        mensaje

    });

};

export default {

    ok,

    error

};