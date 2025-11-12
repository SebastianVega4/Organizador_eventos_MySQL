const { Sequelize } = require('sequelize');

// Reemplaza 'organizador_eventos', 'root' y 'password' si tus credenciales de MySQL son diferentes.
// El host 'db' es el nombre del servicio del contenedor de MySQL en Docker Compose.
const sequelize = new Sequelize('organizador_eventos', 'root', 'password', {
  host: 'db',
  dialect: 'mysql',
  logging: false, // Puedes ponerlo en `true` para ver las consultas SQL en la consola
});

module.exports = sequelize;
