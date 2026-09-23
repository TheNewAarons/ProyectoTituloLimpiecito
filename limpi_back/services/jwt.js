const jwt = require('jsonwebtoken')

const generarTokenLogin = (usuario) => {
    const token = jwt.sign(
        {
            usuario
        },
        process.env.JWT_SEED,
        {
            expiresIn: '1h'
        });
    return token
}

const generarTokenPerfil = (perfil) => {
    const token = jwt.sign({
        perfil
    },
        process.env.JWT_SEED,
        {
            expiresIn: '10h'
        });
    return token
}

const generarTokenCambiarPassword = (usuario) => {
    const token = jwt.sign({ usuario },
        process.env.JWT_SEED,
        {
            expiresIn: '2h'
        });
    return token
}

const validarTokenLogin = (req, res, next) => {
    try {
        const token = req.headers['x-access-token'];
        const decodificacion = jwt.verify(token, process.env.JWT_SEED);
        req.usuario_decodificado = decodificacion.usuario;
        next();
    } catch (error) {
        res.status(500).json({ 'login': false, error });
    }
}

const validarTokenPerfil = (req, res, next) => {
    try {
        const token = req.headers['x-access-token'];
        const decodificacion = jwt.verify(token, process.env.JWT_SEED);
        req.perfil_decodificado = decodificacion.perfil;
        next();
    } catch (error) {
        res.status(500).json({ 'login': false, error });
    }
}

const validarTokenCambiarPassword = (req, res, next) => {
    try {
        const token = req.headers['x-access-token'];
        const decodificacion = jwt.verify(token, process.env.JWT_SEED);
        req.usuario_decodificado = decodificacion.usuario;
        next();
    } catch (error) {
        res.status(500).json({ 'token': false, error });
    }
}

module.exports = {
    generarTokenLogin,
    generarTokenPerfil,
    generarTokenCambiarPassword,
    validarTokenLogin,
    validarTokenPerfil,
    validarTokenCambiarPassword
}