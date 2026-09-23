const { Joi, validate } = require("express-validation");

const sectorSchemaCrear = Joi.object({
    nombre: Joi.string().required().min(1).max(100),
    estado: Joi.number().min(0).max(2).required(),
    clienteId: Joi.number().required().min(1)

})
const sectorSchemaEditar = Joi.object({
    nombre: Joi.string().required().min(1).max(100),
    estado: Joi.number().min(0).max(2).required(),
    clienteId: Joi.number().required().min(1)
})
const sectorSchemaCambiarEstado = Joi.object({
    estado: Joi.number().min(0).max(2).required()
})
module.exports = {
    sectorSchemaCrear,
    sectorSchemaEditar,
    sectorSchemaCambiarEstado
}