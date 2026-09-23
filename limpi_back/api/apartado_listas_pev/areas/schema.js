const { Joi, validate } = require("express-validation");

const areaSchemaCrear = Joi.object({
    nombre: Joi.string().required().min(1).max(100),
    estado: Joi.number().min(0).max(2).required(),
    sectoreId: Joi.number().required().min(1)

})
const areaSchemaEditar = Joi.object({
    nombre: Joi.string().required().min(1).max(100),
    estado: Joi.number().min(0).max(2).required(),
    sectoreId: Joi.number().required().min(1)
})
const areaSchemaCambiarEstado = Joi.object({
    estado: Joi.number().min(0).max(2).required()
})
module.exports = {
    areaSchemaCrear,
    areaSchemaEditar,
    areaSchemaCambiarEstado
}