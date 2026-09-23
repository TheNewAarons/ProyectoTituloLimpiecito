const { Joi, validate } = require("express-validation");

const turnotareaSchemaAsociar = Joi.object({
    turnoId: Joi.number().required().min(1),
    tareaId: Joi.number().required().min(1),
    estado: Joi.number().min(0).max(2).required()
})
const turnotareaSchemaCambiarEstado = Joi.object({
    estado: Joi.number().min(0).max(2).required()
})
module.exports = {
    turnotareaSchemaAsociar,
    turnotareaSchemaCambiarEstado,
}