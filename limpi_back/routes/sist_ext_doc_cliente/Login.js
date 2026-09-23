const express = require('express')
const login = express.Router()

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const atob = require('atob');

const Acceso_cliente = require('../../modelos/sistema_base/Acceso_cliente')

process.env.SECRET_KEY = '89434abc3444limpi904384dsadDASdasdsa';

//INICIO DE SESION SISTEMA EXTERNO, USUARIO ASOCIADO A UN CLIENTE
login.post('/inicio_sesion',async (req,res)=>{
    const login = req.body
    const pass = atob(login.password)

    Acceso_cliente.findOne({
        where: {
            correo:login.correo
        }
    })
    .then((acceso)=>{
        if(acceso){
            if(bcrypt.compareSync(login.password,acceso.password)){
                delete acceso.dataValues.password
                let token = jwt.sign(acceso.dataValues, process.env.SECRET_KEY,{
                    expiresIn:'1d'
                })
                return res.json({error:false,token,mensaje:'Acceso Correcto'})
            }else{
                return res.json({error:true,mensaje:'Contraseña Incorrecta'})
            }
        }else{
            return res.json({error:true,mensaje:'No Existe este Acceso Cliente'})
        }
    })
    .catch((error)=>{
        return res.status(500).json({error})
    })

})

module.exports = login;