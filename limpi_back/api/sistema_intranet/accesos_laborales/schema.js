const { Joi, validate } = require("express-validation");

const accesoLaboralSchemaCrear = Joi.object({
    correo: Joi.string().required().min(5).max(100),
    password: Joi.string().required().min(3).max(100),
    estado: Joi.number().min(0).max(2).required(),
    tipo: Joi.number().min(0).max(2).required(),
    trabajadoreId: Joi.number().required().min(1)

})
const accesoLaboralSchemaActualizar = Joi.object({
    correo: Joi.string().required().min(5).max(100),
    password: Joi.string().allow(''),
    tipo: Joi.number().min(0).max(2).required(),
})
const accesoLaboralSchemaCambiarEstado = Joi.object({
    estado: Joi.number().min(0).max(2).required()
})
module.exports = {
    accesoLaboralSchemaCrear,
    accesoLaboralSchemaActualizar,
    accesoLaboralSchemaCambiarEstado
}