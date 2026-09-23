const { Joi, validate } = require("express-validation");

const tareaSchemaCrear = Joi.object({
    nombre: Joi.string().required().min(1).max(100),
    estado: Joi.number().min(0).max(2).required(),
    areaId: Joi.number().required().min(1)

})
const tareaSchemaEditar = Joi.object({
    nombre: Joi.string().required().min(1).max(100),
    estado: Joi.number().min(0).max(2).required(),
    areaId: Joi.number().required().min(1)
})
const tareaSchemaCambiarEstado = Joi.object({
    estado: Joi.number().min(0).max(2).required()
})
module.exports = {
    tareaSchemaCrear,
    tareaSchemaEditar,
    tareaSchemaCambiarEstado
}