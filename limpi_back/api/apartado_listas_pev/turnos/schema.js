const { Joi, validate } = require("express-validation");

const turnoSchemaCrear = Joi.object({
    nombre: Joi.string().required().min(1).max(100),
    estado: Joi.number().min(0).max(2).required(),
    clienteId: Joi.number().required().min(1)

})
const turnoSchemaEditar = Joi.object({
    nombre: Joi.string().required().min(1).max(100),
    estado: Joi.number().min(0).max(2).required(),
    clienteId: Joi.number().required().min(1)
})
const turnoSchemaCambiarEstado = Joi.object({
    estado: Joi.number().min(0).max(2).required()
})
module.exports = {
    turnoSchemaCrear,
    turnoSchemaEditar,
    turnoSchemaCambiarEstado
}