const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Configuración de MySQL
const dbConfig = {
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || 'password',
    database: process.env.MYSQL_DATABASE || 'eventos_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

// Verificar conexión
pool.getConnection()
    .then(connection => {
        console.log(' Conectado a MySQL');
        connection.release();
    })
    .catch(err => {
        console.error(' Error conectando a MySQL:', err);
    });

// --- RUTAS DE EVENTOS ---

// GET - Obtener todos los eventos (CONSULTA COMPLEJA CON MÚLTIPLES JOINS)
app.get('/api/eventos', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        
        const [eventos] = await connection.execute(`
            SELECT e.*, 
                   COUNT(DISTINCT a.id) as total_asistentes,
                   SUM(tt.cantidad) as total_capacidad_tickets
            FROM eventos e
            LEFT JOIN tipos_ticket tt ON e.id = tt.evento_id
            LEFT JOIN asistencias a ON e.id = a.evento_id
            GROUP BY e.id
            ORDER BY e.fecha ASC
        `);

        // Para cada evento, obtener tickets y promociones (N+1 QUERY PROBLEM)
        for (let evento of eventos) {
            const [tickets] = await connection.execute(`
                SELECT tt.*, t.vendidos 
                FROM tipos_ticket tt 
                LEFT JOIN tickets t ON tt.id = t.tipo_ticket_id 
                WHERE tt.evento_id = ?
            `, [evento.id]);
            
            const [promociones] = await connection.execute(`
                SELECT * FROM promociones WHERE evento_id = ? AND activa = TRUE
            `, [evento.id]);
            
            evento.tickets = tickets;
            evento.promociones = promociones;
        }

        connection.release();
        res.json(eventos);
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ mensaje: 'Error al obtener eventos', error: err.message });
    }
});

// GET - Obtener evento por ID
app.get('/api/eventos/:id', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        
        const [eventos] = await connection.execute('SELECT * FROM eventos WHERE id = ?', [req.params.id]);
        
        if (eventos.length === 0) {
            connection.release();
            return res.status(404).json({ mensaje: 'Evento no encontrado' });
        }
        
        const evento = eventos[0];
        
        // Obtener tickets relacionados
        const [tickets] = await connection.execute(`
            SELECT tt.*, t.vendidos 
            FROM tipos_ticket tt 
            LEFT JOIN tickets t ON tt.id = t.tipo_ticket_id 
            WHERE tt.evento_id = ?
        `, [evento.id]);
        
        // Obtener promociones relacionadas
        const [promociones] = await connection.execute(`
            SELECT * FROM promociones WHERE evento_id = ?
        `, [evento.id]);
        
        evento.tickets = tickets;
        evento.promociones = promociones;
        
        connection.release();
        res.json(evento);
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ mensaje: 'Error al obtener evento', error: err.message });
    }
});

// POST - Crear nuevo evento (TRANSACCIÓN COMPLEJA)
app.post('/api/eventos', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { nombre, descripcion, fecha, lugar, capacidad, categoria, organizador, tickets, promociones } = req.body;
        
        // Insertar evento principal
        const [result] = await connection.execute(
            'INSERT INTO eventos (nombre, descripcion, fecha, lugar, capacidad, categoria, organizador_nombre, organizador_contacto, organizador_email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [nombre, descripcion, fecha, lugar, capacidad, categoria, organizador?.nombre, organizador?.contacto, organizador?.email]
        );
        
        const eventoId = result.insertId;
        
        // Insertar tickets (si existen)
        if (tickets && tickets.length > 0) {
            for (const ticket of tickets) {
                const [ticketResult] = await connection.execute(
                    'INSERT INTO tipos_ticket (evento_id, tipo, precio, cantidad, caracteristicas) VALUES (?, ?, ?, ?, ?)',
                    [eventoId, ticket.tipo, ticket.precio, ticket.cantidad, JSON.stringify(ticket.caracteristicas)]
                );
                
                // Insertar en tabla de tickets vendidos
                await connection.execute(
                    'INSERT INTO tickets (tipo_ticket_id, vendidos) VALUES (?, ?)',
                    [ticketResult.insertId, ticket.vendidos || 0]
                );
            }
        }
        
        // Insertar promociones (si existen)
        if (promociones && promociones.length > 0) {
            for (const promo of promociones) {
                await connection.execute(
                    'INSERT INTO promociones (evento_id, codigo, descuento, fecha_inicio, fecha_fin, activa, condiciones) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [eventoId, promo.codigo, promo.descuento, promo.fechaInicio, promo.fechaFin, promo.activa, JSON.stringify(promo.condiciones)]
                );
            }
        }
        
        await connection.commit();
        
        // Obtener el evento completo creado
        const [eventos] = await connection.execute('SELECT * FROM eventos WHERE id = ?', [eventoId]);
        const eventoCompleto = eventos[0];
        
        // Agregar tickets y promociones
        const [ticketsDb] = await connection.execute(`
            SELECT tt.*, t.vendidos 
            FROM tipos_ticket tt 
            LEFT JOIN tickets t ON tt.id = t.tipo_ticket_id 
            WHERE tt.evento_id = ?
        `, [eventoId]);
        
        const [promocionesDb] = await connection.execute('SELECT * FROM promociones WHERE evento_id = ?', [eventoId]);
        
        eventoCompleto.tickets = ticketsDb;
        eventoCompleto.promociones = promocionesDb;
        
        connection.release();
        res.status(201).json(eventoCompleto);
        
    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error('Error:', err);
        res.status(400).json({ mensaje: 'Error al crear evento', error: err.message });
    }
});

// --- RUTAS DE ASISTENTES ---

// GET - Obtener todos los asistentes (CONSULTA CON MÚLTIPLES JOINS)
app.get('/api/asistentes', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        
        const [asistentes] = await connection.execute('SELECT * FROM asistentes ORDER BY nombre');
        
        // Para cada asistente, obtener datos relacionados (N+1 QUERY PROBLEM)
        for (let asistente of asistentes) {
            const [preferencias] = await connection.execute(
                'SELECT preferencia FROM preferencias_dietarias WHERE asistente_id = ?',
                [asistente.id]
            );
            
            const [intereses] = await connection.execute(
                'SELECT interes FROM intereses WHERE asistente_id = ?',
                [asistente.id]
            );
            
            const [datosAdicionales] = await connection.execute(
                'SELECT clave, valor FROM datos_adicionales WHERE asistente_id = ?',
                [asistente.id]
            );
            
            const [asistencias] = await connection.execute(`
                SELECT a.*, e.nombre as evento_nombre, e.fecha as evento_fecha, tt.tipo as ticket_tipo
                FROM asistencias a
                JOIN eventos e ON a.evento_id = e.id
                JOIN tipos_ticket tt ON a.tipo_ticket_id = tt.id
                WHERE a.asistente_id = ?
            `, [asistente.id]);
            
            asistente.preferencias = {
                dietarias: preferencias.map(p => p.preferencia),
                intereses: intereses.map(i => i.interes)
            };
            asistente.datosAdicionales = Object.fromEntries(
                datosAdicionales.map(da => [da.clave, da.valor])
            );
            asistente.asistencias = asistencias;
        }
        
        connection.release();
        res.json(asistentes);
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ mensaje: 'Error al obtener asistentes', error: err.message });
    }
});

// POST - Crear nuevo asistente (TRANSACCIÓN COMPLEJA)
app.post('/api/asistentes', async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const { nombre, email, telefono, documento, empresa, cargo, preferencias, datosAdicionales } = req.body;
        
        // Insertar asistente principal
        const [result] = await connection.execute(
            'INSERT INTO asistentes (nombre, email, telefono, documento, empresa, cargo) VALUES (?, ?, ?, ?, ?, ?)',
            [nombre, email, telefono, documento, empresa, cargo]
        );
        
        const asistenteId = result.insertId;
        
        // Insertar preferencias dietarias
        if (preferencias?.dietarias && preferencias.dietarias.length > 0) {
            for (const dieta of preferencias.dietarias) {
                await connection.execute(
                    'INSERT INTO preferencias_dietarias (asistente_id, preferencia) VALUES (?, ?)',
                    [asistenteId, dieta]
                );
            }
        }
        
        // Insertar intereses
        if (preferencias?.intereses && preferencias.intereses.length > 0) {
            for (const interes of preferencias.intereses) {
                await connection.execute(
                    'INSERT INTO intereses (asistente_id, interes) VALUES (?, ?)',
                    [asistenteId, interes]
                );
            }
        }
        
        // Insertar datos adicionales (EAV)
        if (datosAdicionales) {
            for (const [clave, valor] of Object.entries(datosAdicionales)) {
                await connection.execute(
                    'INSERT INTO datos_adicionales (asistente_id, clave, valor) VALUES (?, ?, ?)',
                    [asistenteId, clave, valor]
                );
            }
        }
        
        await connection.commit();
        
        // Obtener asistente completo
        const [asistentes] = await connection.execute('SELECT * FROM asistentes WHERE id = ?', [asistenteId]);
        const asistenteCompleto = asistentes[0];
        
        // Agregar datos relacionados
        const [preferenciasDb] = await connection.execute(
            'SELECT preferencia FROM preferencias_dietarias WHERE asistente_id = ?',
            [asistenteId]
        );
        
        const [interesesDb] = await connection.execute(
            'SELECT interes FROM intereses WHERE asistente_id = ?',
            [asistenteId]
        );
        
        const [datosAdicionalesDb] = await connection.execute(
            'SELECT clave, valor FROM datos_adicionales WHERE asistente_id = ?',
            [asistenteId]
        );
        
        asistenteCompleto.preferencias = {
            dietarias: preferenciasDb.map(p => p.preferencia),
            intereses: interesesDb.map(i => i.interes)
        };
        asistenteCompleto.datosAdicionales = Object.fromEntries(
            datosAdicionalesDb.map(da => [da.clave, da.valor])
        );
        
        connection.release();
        res.status(201).json(asistenteCompleto);
        
    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error('Error:', err);
        res.status(400).json({ mensaje: 'Error al crear asistente', error: err.message });
    }
});

// Ruta de prueba
app.get('/', (req, res) => {
    res.json({ 
        mensaje: ' API de Gestión de Eventos - MySQL (Sistema Antiguo)',
        advertencia: 'Este sistema presenta limitaciones de escalabilidad y flexibilidad'
    });
});

app.listen(PORT, () => {
    console.log(` Servidor MySQL corriendo en http://localhost:${PORT}`);
    console.log(' Este es el sistema ANTIGUO con limitaciones de escalabilidad');
});