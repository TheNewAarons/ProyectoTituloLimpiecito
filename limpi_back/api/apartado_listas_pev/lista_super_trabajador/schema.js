const { Joi, validate } = require("express-validation");

const listaSuperTrabajadorSchemaCrear = Joi.object({
    estado: Joi.number().min(0).max(2).required(),
    fecha_creacion: Joi.date().allow(null),
    fecha_firma: Joi.date().allow(null),
    n_empleado: Joi.number().min(0).required(),
})
const listaSuperTrabajadorSchemaCambiarEstado = Joi.object({
    estado: Joi.number().min(0).max(2).required(),
    fecha_firma: Joi.date().allow(null),
})
module.exports = {
    listaSuperTrabajadorSchemaCrear,
    listaSuperTrabajadorSchemaCambiarEstado,
}