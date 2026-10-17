
const express = require('express');

const app = express();
const PORT = 3000;

// Permite recibir datos en formato JSON
app.use(express.json());

// Almacenamiento temporal de los usuarios registrados
const usuarios = [];

// Ruta para registrar un usuario
app.post('/registro', (req, res) => {
    // Obtenemos el usuario y la contraseña enviados
    const { usuario, contraseña } = req.body;

    // Comprobamos que los campos estén completos
    if (!usuario || !contraseña) {
        return res.status(400).json({
            mensaje: 'El usuario y la contraseña son obligatorios.'
        });
    }

    // Evitamos registrar dos veces el mismo usuario
    const usuarioExiste = usuarios.find(
        (u) => u.usuario === usuario
    );

    if (usuarioExiste) {
        return res.status(409).json({
            mensaje: 'El usuario ya está registrado.'
        });
    }

    // Guardamos el nuevo usuario.
    usuarios.push({ usuario, contraseña });

    // Confirmamos que el registro fue exitoso.
    res.status(201).json({
        mensaje: 'Usuario registrado satisfactoriamente.'
    });
});

// Ruta para iniciar sesion
app.post('/login', (req, res) => {
    // Obtenemos las credenciales enviadas
    const { usuario, contraseña } = req.body;

    // Buscamos un usuario con las credenciales recibidas
    const usuarioEncontrado = usuarios.find(
        (u) => u.usuario === usuario &&
               u.contraseña === contraseña
    );

    // Respondemos segun el resultado de la autenticacion
    if (usuarioEncontrado) {
        return res.status(200).json({
            mensaje: 'Autenticación satisfactoria.'
        });
    }

    // Si las credenciales no coinciden, devolvemos un error
    res.status(401).json({
        mensaje: 'Error en la autenticación.'
    });
});

// Iniciamos el servidor para recibir solicitudes
app.listen(PORT, () => {
    console.log(`API ejecutándose en http://localhost:${PORT}`);
});
