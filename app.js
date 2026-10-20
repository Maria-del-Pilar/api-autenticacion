
const express = require('express');
const bcrypt = require('bcryptjs');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const PORT = 3000;

// Permite recibir solicitudes con datos JSON.
app.use(express.json());

// Configuracion de la conexion con MongoDB local.
const URL = 'mongodb://127.0.0.1:27017';
const client = new MongoClient(URL);
const DB_NAME = 'api_autenticacion';

// Esta variable contendra la coleccion de usuarios.
let usuarios;

// Comprueba si el identificador tiene un formato valido.
function idValido(id) {
    return ObjectId.isValid(id) &&
        new ObjectId(id).toString() === id;
}

// Registro de usuarios.
app.post('/registro', async (req, res) => {
    try {
        const { usuario, contraseña } = req.body;

        // Validamos que los campos estan completos.
        if (
            typeof usuario !== 'string' ||
            !usuario.trim() ||
            typeof contraseña !== 'string' ||
            contraseña.length < 6
        ) {
            return res.status(400).json({
                mensaje: 'Ingrese un usuario y una contraseña de al menos 6 caracteres.'
            });
        }

        const nombreUsuario = usuario.trim();

        // Verificamos que el usuario no este registrado.
        const existente = await usuarios.findOne({
            usuario: nombreUsuario
        });

        if (existente) {
            return res.status(409).json({
                mensaje: 'El usuario ya está registrado.'
            });
        }

        // Protegemos la contraseña antes de almacenarla.
        const passwordHash = await bcrypt.hash(contraseña, 10);

        // Guardamos el usuario en la base de datos.
        await usuarios.insertOne({
            usuario: nombreUsuario,
            passwordHash: passwordHash,
            fechaRegistro: new Date()
        });

        res.status(201).json({
            mensaje: 'Usuario registrado satisfactoriamente.'
        });
    } catch (error) {
        console.error('Error en el registro:', error);
        res.status(500).json({
            mensaje: 'Error interno al registrar el usuario.'
        });
    }
});

// Inicio de sesion.
app.post('/login', async (req, res) => {
    try {
        const { usuario, contraseña } = req.body;

        // Verificamos que se reciban las credenciales.
        if (
            typeof usuario !== 'string' ||
            typeof contraseña !== 'string'
        ) {
            return res.status(400).json({
                mensaje: 'El usuario y la contraseña son obligatorios.'
            });
        }

        // Buscamos al usuario en MongoDB.
        const encontrado = await usuarios.findOne({
            usuario: usuario.trim()
        });

        // Comprobamos la contraseña con su hash.
        if (
            !encontrado ||
            !(await bcrypt.compare(
                contraseña,
                encontrado.passwordHash
            ))
        ) {
            return res.status(401).json({
                mensaje: 'Error en la autenticación.'
            });
        }

        res.status(200).json({
            mensaje: 'Autenticación satisfactoria.'
        });
    } catch (error) {
        console.error('Error en el inicio de sesión:', error);
        res.status(500).json({
            mensaje: 'Error interno al iniciar sesión.'
        });
    }
});

// Consultar todos los usuarios sin exponer sus contraseñas.
app.get('/usuarios', async (req, res) => {
    try {
        const lista = await usuarios.find(
            {},
            { projection: { passwordHash: 0 } }
        ).toArray();

        res.status(200).json(lista);
    } catch (error) {
        console.error('Error al consultar usuarios:', error);
        res.status(500).json({
            mensaje: 'Error al consultar los usuarios.'
        });
    }
});

// Actualizar el nombre de usuario o la contraseña.
app.put('/usuarios/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { usuario, contraseña } = req.body;

        // Validamos el identificador recibido.
        if (!idValido(id)) {
            return res.status(400).json({
                mensaje: 'El identificador no es válido.'
            });
        }

        // Construimos unicamente los campos permitidos.
        const cambios = {};

        if (usuario !== undefined) {
            if (
                typeof usuario !== 'string' ||
                !usuario.trim()
            ) {
                return res.status(400).json({
                    mensaje: 'El nombre de usuario no es válido.'
                });
            }

            cambios.usuario = usuario.trim();
        }

        if (contraseña !== undefined) {
            if (
                typeof contraseña !== 'string' ||
                contraseña.length < 6
            ) {
                return res.status(400).json({
                    mensaje: 'La contraseña debe tener al menos 6 caracteres.'
                });
            }

            cambios.passwordHash = await bcrypt.hash(
                contraseña,
                10
            );
        }

        if (Object.keys(cambios).length === 0) {
            return res.status(400).json({
                mensaje: 'Debe proporcionar algún dato para actualizar.'
            });
        }

        const resultado = await usuarios.updateOne(
            { _id: new ObjectId(id) },
            { $set: cambios }
        );

        if (resultado.matchedCount === 0) {
            return res.status(404).json({
                mensaje: 'Usuario no encontrado.'
            });
        }

        res.status(200).json({
            mensaje: 'Usuario actualizado satisfactoriamente.'
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                mensaje: 'El nombre de usuario ya existe.'
            });
        }

        console.error('Error al actualizar usuario:', error);
        res.status(500).json({
            mensaje: 'Error al actualizar el usuario.'
        });
    }
});

// Eliminar un usuario por su identificador.
app.delete('/usuarios/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!idValido(id)) {
            return res.status(400).json({
                mensaje: 'El identificador no es válido.'
            });
        }

        const resultado = await usuarios.deleteOne({
            _id: new ObjectId(id)
        });

        if (resultado.deletedCount === 0) {
            return res.status(404).json({
                mensaje: 'Usuario no encontrado.'
            });
        }

        res.status(200).json({
            mensaje: 'Usuario eliminado satisfactoriamente.'
        });
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        res.status(500).json({
            mensaje: 'Error al eliminar el usuario.'
        });
    }
});

// Conectamos la base de datos antes de iniciar el servidor.
async function iniciarServidor() {
    try {
        await client.connect();

        const db = client.db(DB_NAME);
        usuarios = db.collection('usuarios');

        // Impide registrar nombres de usuario duplicados.
        await usuarios.createIndex(
            { usuario: 1 },
            { unique: true }
        );

        app.listen(PORT, () => {
            console.log(
                `API ejecutándose en http://localhost:${PORT}`
            );
            console.log('Conexión con MongoDB establecida.');
        });
    } catch (error) {
        console.error(
            'No se pudo iniciar la API o conectar con MongoDB:',
            error
        );
        process.exit(1);
    }
}

iniciarServidor();

