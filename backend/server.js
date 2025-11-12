const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Configuración de MySQL
const dbConfig = {
  host: process.env.MYSQL_HOST || "localhost",
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "1234",
  database: process.env.MYSQL_DATABASE || "eventos_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

const pool = mysql.createPool(dbConfig);

// Función para formatear la fecha para MySQL
const formatDateForMySQL = (dateString) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  return date.toISOString().slice(0, 19).replace('T', ' ');
};

// Verificar conexión
pool
  .getConnection()
  .then((connection) => {
    console.log(" Conectado a MySQL");
    connection.release();
  })
  .catch((err) => {
    console.error(" Error conectando a MySQL:", err);
  });

// --- RUTAS DE EVENTOS ---

// GET - Obtener todos los eventos (CONSULTA COMPLEJA CON MÚLTIPLES JOINS)
app.get("/api/eventos", async (req, res) => {
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

    // Para cada evento, obtener tickets y promociones
    for (let evento of eventos) {
      const [tickets] = await connection.execute(
        `SELECT tt.*, t.vendidos 
         FROM tipos_ticket tt 
         LEFT JOIN tickets t ON tt.id = t.tipo_ticket_id 
         WHERE tt.evento_id = ?`,
        [evento.id]
      );

      const [promociones] = await connection.execute(
        `SELECT * FROM promociones WHERE evento_id = ? AND activa = TRUE`,
        [evento.id]
      );

      evento.tickets = tickets;
      evento.promociones = promociones;
    }

    connection.release();
    res.json(eventos);
  } catch (err) {
    console.error("Error:", err);
    res
      .status(500)
      .json({ mensaje: "Error al obtener eventos", error: err.message });
  }
});

// GET - Obtener evento por ID
app.get("/api/eventos/:id", async (req, res) => {
  try {
    const connection = await pool.getConnection();

    const [eventos] = await connection.execute(
      "SELECT * FROM eventos WHERE id = ?",
      [req.params.id]
    );

    if (eventos.length === 0) {
      connection.release();
      return res.status(404).json({ mensaje: "Evento no encontrado" });
    }

    const evento = eventos[0];

    // Obtener tickets relacionados
    const [tickets] = await connection.execute(
      `
            SELECT tt.*, t.vendidos 
            FROM tipos_ticket tt 
            LEFT JOIN tickets t ON tt.id = t.tipo_ticket_id 
            WHERE tt.evento_id = ?
        `,
      [evento.id]
    );

    // Obtener promociones relacionadas
    const [promociones] = await connection.execute(
      `
            SELECT * FROM promociones WHERE evento_id = ?
        `,
      [evento.id]
    );

    evento.tickets = tickets;
    evento.promociones = promociones;

    connection.release();
    res.json(evento);
  } catch (err) {
    console.error("Error:", err);
    res
      .status(500)
      .json({ mensaje: "Error al obtener evento", error: err.message });
  }
});

// PUT - Actualizar evento existente
app.put("/api/eventos/:id", async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const eventoId = req.params.id;
    console.log("ID del evento a actualizar:", eventoId);
    console.log("Datos recibidos para actualizar:", req.body);
    const {
      nombre,
      descripcion,
      fecha,
      lugar,
      capacidad,
      categoria,
      organizador,
      tickets,
      promociones,
    } = req.body;

    // Actualizar evento principal
    const [result] = await connection.execute(
      "UPDATE eventos SET nombre = ?, descripcion = ?, fecha = ?, lugar = ?, capacidad = ?, categoria = ?, organizador_nombre = ?, organizador_contacto = ?, organizador_email = ? WHERE id = ?",
      [
        nombre,
        descripcion,
        formatDateForMySQL(fecha),
        lugar,
        capacidad,
        categoria,
        organizador?.nombre,
        organizador?.contacto,
        organizador?.email,
        eventoId,
      ]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ mensaje: "Evento no encontrado" });
    }

    // Eliminar tickets existentes
    await connection.execute(
      "DELETE t FROM tickets t INNER JOIN tipos_ticket tt ON t.tipo_ticket_id = tt.id WHERE tt.evento_id = ?",
      [eventoId]
    );
    await connection.execute("DELETE FROM tipos_ticket WHERE evento_id = ?", [
      eventoId,
    ]);

    // Insertar nuevos tickets
    if (tickets && tickets.length > 0) {
      for (const ticket of tickets) {
        const [ticketResult] = await connection.execute(
          "INSERT INTO tipos_ticket (evento_id, tipo, precio, cantidad, caracteristicas) VALUES (?, ?, ?, ?, ?)",
          [
            eventoId,
            ticket.tipo,
            ticket.precio,
            ticket.cantidad,
            JSON.stringify(ticket.caracteristicas || {}),
          ]
        );

        await connection.execute(
          "INSERT INTO tickets (tipo_ticket_id, vendidos) VALUES (?, ?)",
          [ticketResult.insertId, ticket.vendidos || 0]
        );
      }
    }

    // Eliminar promociones existentes
    await connection.execute("DELETE FROM promociones WHERE evento_id = ?", [
      eventoId,
    ]);

    // Insertar nuevas promociones
    if (promociones && promociones.length > 0) {
      for (const promo of promociones) {
        await connection.execute(
          "INSERT INTO promociones (evento_id, codigo, descuento, fecha_inicio, fecha_fin, activa, condiciones) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [
            eventoId,
            promo.codigo,
            promo.descuento,
            formatDateForMySQL(promo.fechaInicio),
            formatDateForMySQL(promo.fechaFin),
            promo.activa || true,
            JSON.stringify(promo.condiciones || {}),
          ]
        );
      }
    }

    await connection.commit();

    // Obtener el evento actualizado completo
    const [eventos] = await connection.execute(
      "SELECT * FROM eventos WHERE id = ?",
      [eventoId]
    );
    const eventoActualizado = eventos[0];

    const [ticketsDb] = await connection.execute(
      `
            SELECT tt.*, t.vendidos 
            FROM tipos_ticket tt 
            LEFT JOIN tickets t ON tt.id = t.tipo_ticket_id 
            WHERE tt.evento_id = ?
        `,
      [eventoId]
    );

    const [promocionesDb] = await connection.execute(
      "SELECT * FROM promociones WHERE evento_id = ?",
      [eventoId]
    );

    eventoActualizado.tickets = ticketsDb;
    eventoActualizado.promociones = promocionesDb;

    connection.release();
    res.json(eventoActualizado);
  } catch (err) {
    await connection.rollback();
    connection.release();
    console.error("Error:", err);
    res
      .status(400)
      .json({ mensaje: "Error al actualizar evento", error: err.message });
  }
});

app.delete("/api/eventos/:id", async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const eventoId = req.params.id;

    // Verificar si el evento existe
    const [eventos] = await connection.execute(
      "SELECT * FROM eventos WHERE id = ?",
      [eventoId]
    );

    if (eventos.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ mensaje: "Evento no encontrado" });
    }

    // Eliminar en cascada (gracias a las foreign keys)
    await connection.execute("DELETE FROM eventos WHERE id = ?", [eventoId]);

    await connection.commit();
    connection.release();
    
    res.json({ mensaje: "Evento eliminado correctamente" });
  } catch (err) {
    await connection.rollback();
    connection.release();
    console.error("Error:", err);
    res.status(500).json({ 
      mensaje: "Error al eliminar evento", 
      error: err.message 
    });
  }
});

// POST - Crear nuevo evento (TRANSACCIÓN COMPLEJA)
app.post("/api/eventos", async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const {
      nombre,
      descripcion,
      fecha,
      lugar,
      capacidad,
      categoria,
      organizador,
      tickets,
      promociones,
    } = req.body;

    // Validar campos requeridos
    if (!nombre || !descripcion || !fecha || !lugar || !capacidad) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({
        mensaje:
          "Faltan campos requeridos: nombre, descripcion, fecha, lugar, capacidad",
      });
    }

    // Asegurar que no haya valores undefined - convertir a null
    const orgNombre = organizador?.nombre || null;
    const orgContacto = organizador?.contacto || null;
    const orgEmail = organizador?.email || null;
    const cat = categoria || "Otro";

    console.log("Datos recibidos para crear evento:", {
      nombre,
      descripcion,
      fecha,
      lugar,
      capacidad,
      categoria: cat,
      organizador: { orgNombre, orgContacto, orgEmail },
    });

    // Insertar evento principal
    const [result] = await connection.execute(
      "INSERT INTO eventos (nombre, descripcion, fecha, lugar, capacidad, categoria, organizador_nombre, organizador_contacto, organizador_email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        nombre,
        descripcion,
        formatDateForMySQL(fecha),
        lugar,
        parseInt(capacidad),
        cat,
        orgNombre,
        orgContacto,
        orgEmail,
      ]
    );

    const eventoId = result.insertId;
    console.log("Evento creado con ID:", eventoId);

    // Insertar tickets (si existen)
    if (tickets && tickets.length > 0) {
      console.log("Insertando tickets:", tickets);
      for (const ticket of tickets) {
        // Validar y limpiar datos del ticket
        const ticketTipo = ticket.tipo || "General";
        const ticketPrecio = parseFloat(ticket.precio) || 0;
        const ticketCantidad = parseInt(ticket.cantidad) || 0;
        const ticketVendidos = parseInt(ticket.vendidos) || 0;
        const ticketCaracteristicas = ticket.caracteristicas
          ? JSON.stringify(ticket.caracteristicas)
          : JSON.stringify({});

        const [ticketResult] = await connection.execute(
          "INSERT INTO tipos_ticket (evento_id, tipo, precio, cantidad, caracteristicas) VALUES (?, ?, ?, ?, ?)",
          [
            eventoId,
            ticketTipo,
            ticketPrecio,
            ticketCantidad,
            ticketCaracteristicas,
          ]
        );

        // Insertar en tabla de tickets vendidos
        await connection.execute(
          "INSERT INTO tickets (tipo_ticket_id, vendidos) VALUES (?, ?)",
          [ticketResult.insertId, ticketVendidos]
        );
      }
    }

    // Insertar promociones (si existen)
    if (promociones && promociones.length > 0) {
      console.log("Insertando promociones:", promociones);
      for (const promo of promociones) {
        // Validar y limpiar datos de la promoción
        const promoActiva = promo.activa !== undefined ? promo.activa : true;
        const promoCondiciones = promo.condiciones
          ? JSON.stringify(promo.condiciones)
          : JSON.stringify({});

        await connection.execute(
          "INSERT INTO promociones (evento_id, codigo, descuento, fecha_inicio, fecha_fin, activa, condiciones) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [
            eventoId,
            promo.codigo,
            parseFloat(promo.descuento),
            formatDateForMySQL(promo.fechaInicio),
            formatDateForMySQL(promo.fechaFin),
            promoActiva,
            promoCondiciones,
          ]
        );
      }
    }

    await connection.commit();

    // Obtener el evento completo creado
    const [eventos] = await connection.execute(
      "SELECT * FROM eventos WHERE id = ?",
      [eventoId]
    );
    const eventoCompleto = eventos[0];

    // Agregar tickets y promociones
    const [ticketsDb] = await connection.execute(
      `
            SELECT tt.*, t.vendidos 
            FROM tipos_ticket tt 
            LEFT JOIN tickets t ON tt.id = t.tipo_ticket_id 
            WHERE tt.evento_id = ?
        `,
      [eventoId]
    );

    const [promocionesDb] = await connection.execute(
      "SELECT * FROM promociones WHERE evento_id = ?",
      [eventoId]
    );

    eventoCompleto.tickets = ticketsDb;
    eventoCompleto.promociones = promocionesDb;

    connection.release();
    res.status(201).json(eventoCompleto);
  } catch (err) {
    await connection.rollback();
    connection.release();
    console.error("Error en crear evento:", err);
    res.status(400).json({
      mensaje: "Error al crear evento",
      error: err.message,
      detalles:
        "Verifica que todos los campos requeridos estén completos y en el formato correcto",
    });
  }
});

// --- RUTAS DE ASISTENTES ---

// GET - Obtener todos los asistentes (CONSULTA CON MÚLTIPLES JOINS)
app.get("/api/asistentes", async (req, res) => {
  try {
    const connection = await pool.getConnection();

    const [asistentes] = await connection.execute(
      "SELECT * FROM asistentes ORDER BY nombre"
    );

    // Para cada asistente, obtener datos relacionados (N+1 QUERY PROBLEM)
    for (let asistente of asistentes) {
      const [preferencias] = await connection.execute(
        "SELECT preferencia FROM preferencias_dietarias WHERE asistente_id = ?",
        [asistente.id]
      );

      const [intereses] = await connection.execute(
        "SELECT interes FROM intereses WHERE asistente_id = ?",
        [asistente.id]
      );

      const [datosAdicionales] = await connection.execute(
        "SELECT clave, valor FROM datos_adicionales WHERE asistente_id = ?",
        [asistente.id]
      );

      const [asistencias] = await connection.execute(
        `
                SELECT a.*, e.nombre as evento_nombre, e.fecha as evento_fecha, tt.tipo as ticket_tipo
                FROM asistencias a
                JOIN eventos e ON a.evento_id = e.id
                JOIN tipos_ticket tt ON a.tipo_ticket_id = tt.id
                WHERE a.asistente_id = ?
            `,
        [asistente.id]
      );

      asistente.preferencias = {
        dietarias: preferencias.map((p) => p.preferencia),
        intereses: intereses.map((i) => i.interes),
      };
      asistente.datosAdicionales = Object.fromEntries(
        datosAdicionales.map((da) => [da.clave, da.valor])
      );
      asistente.asistencias = asistencias;
    }

    connection.release();
    res.json(asistentes);
  } catch (err) {
    console.error("Error:", err);
    res
      .status(500)
      .json({ mensaje: "Error al obtener asistentes", error: err.message });
  }
});

// POST - Crear nuevo asistente (TRANSACCIÓN COMPLEJA)
app.post("/api/asistentes", async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const {
      nombre,
      email,
      telefono,
      documento,
      empresa,
      cargo,
      preferencias,
      datosAdicionales,
    } = req.body;

    // Insertar asistente principal
    const [result] = await connection.execute(
      "INSERT INTO asistentes (nombre, email, telefono, documento, empresa, cargo) VALUES (?, ?, ?, ?, ?, ?)",
      [nombre, email, telefono, documento, empresa, cargo]
    );

    const asistenteId = result.insertId;

    // Insertar preferencias dietarias
    if (preferencias?.dietarias && preferencias.dietarias.length > 0) {
      for (const dieta of preferencias.dietarias) {
        await connection.execute(
          "INSERT INTO preferencias_dietarias (asistente_id, preferencia) VALUES (?, ?)",
          [asistenteId, dieta]
        );
      }
    }

    // Insertar intereses
    if (preferencias?.intereses && preferencias.intereses.length > 0) {
      for (const interes of preferencias.intereses) {
        await connection.execute(
          "INSERT INTO intereses (asistente_id, interes) VALUES (?, ?)",
          [asistenteId, interes]
        );
      }
    }

    // Insertar datos adicionales (EAV)
    if (datosAdicionales) {
      for (const [clave, valor] of Object.entries(datosAdicionales)) {
        await connection.execute(
          "INSERT INTO datos_adicionales (asistente_id, clave, valor) VALUES (?, ?, ?)",
          [asistenteId, clave, valor]
        );
      }
    }

    await connection.commit();

    // Obtener asistente completo
    const [asistentes] = await connection.execute(
      "SELECT * FROM asistentes WHERE id = ?",
      [asistenteId]
    );
    const asistenteCompleto = asistentes[0];

    // Agregar datos relacionados
    const [preferenciasDb] = await connection.execute(
      "SELECT preferencia FROM preferencias_dietarias WHERE asistente_id = ?",
      [asistenteId]
    );

    const [interesesDb] = await connection.execute(
      "SELECT interes FROM intereses WHERE asistente_id = ?",
      [asistenteId]
    );

    const [datosAdicionalesDb] = await connection.execute(
      "SELECT clave, valor FROM datos_adicionales WHERE asistente_id = ?",
      [asistenteId]
    );

    asistenteCompleto.preferencias = {
      dietarias: preferenciasDb.map((p) => p.preferencia),
      intereses: interesesDb.map((i) => i.interes),
    };
    asistenteCompleto.datosAdicionales = Object.fromEntries(
      datosAdicionalesDb.map((da) => [da.clave, da.valor])
    );

    connection.release();
    res.status(201).json(asistenteCompleto);
  } catch (err) {
    await connection.rollback();
    connection.release();
    console.error("Error:", err);
    res
      .status(400)
      .json({ mensaje: "Error al crear asistente", error: err.message });
  }
});

// PUT - Actualizar asistente existente
app.put("/api/asistentes/:id", async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const asistenteId = req.params.id;
    console.log("ID del asistente a actualizar:", asistenteId);
    console.log("Datos recibidos para actualizar:", req.body);
    
    const {
      nombre,
      email,
      telefono,
      documento,
      empresa,
      cargo,
      preferencias,
      datosAdicionales,
    } = req.body;

    // Validar campos requeridos
    if (!nombre || !email) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ 
        mensaje: "Faltan campos requeridos: nombre, email" 
      });
    }

    // Actualizar asistente principal
    const [result] = await connection.execute(
      "UPDATE asistentes SET nombre = ?, email = ?, telefono = ?, documento = ?, empresa = ?, cargo = ? WHERE id = ?",
      [
        nombre,
        email,
        telefono || null,
        documento || null,
        empresa || null,
        cargo || null,
        asistenteId,
      ]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ mensaje: "Asistente no encontrado" });
    }

    // Eliminar preferencias dietarias existentes
    await connection.execute(
      "DELETE FROM preferencias_dietarias WHERE asistente_id = ?",
      [asistenteId]
    );

    // Insertar nuevas preferencias dietarias
    if (preferencias?.dietarias && preferencias.dietarias.length > 0) {
      for (const dieta of preferencias.dietarias) {
        await connection.execute(
          "INSERT INTO preferencias_dietarias (asistente_id, preferencia) VALUES (?, ?)",
          [asistenteId, dieta]
        );
      }
    }

    // Eliminar intereses existentes
    await connection.execute(
      "DELETE FROM intereses WHERE asistente_id = ?",
      [asistenteId]
    );

    // Insertar nuevos intereses
    if (preferencias?.intereses && preferencias.intereses.length > 0) {
      for (const interes of preferencias.intereses) {
        await connection.execute(
          "INSERT INTO intereses (asistente_id, interes) VALUES (?, ?)",
          [asistenteId, interes]
        );
      }
    }

    // Eliminar datos adicionales existentes
    await connection.execute(
      "DELETE FROM datos_adicionales WHERE asistente_id = ?",
      [asistenteId]
    );

    // Insertar nuevos datos adicionales
    if (datosAdicionales) {
      for (const [clave, valor] of Object.entries(datosAdicionales)) {
        await connection.execute(
          "INSERT INTO datos_adicionales (asistente_id, clave, valor) VALUES (?, ?, ?)",
          [asistenteId, clave, valor]
        );
      }
    }

    await connection.commit();

    // Obtener el asistente actualizado completo
    const [asistentes] = await connection.execute(
      "SELECT * FROM asistentes WHERE id = ?",
      [asistenteId]
    );
    const asistenteActualizado = asistentes[0];

    // Agregar datos relacionados actualizados
    const [preferenciasDb] = await connection.execute(
      "SELECT preferencia FROM preferencias_dietarias WHERE asistente_id = ?",
      [asistenteId]
    );

    const [interesesDb] = await connection.execute(
      "SELECT interes FROM intereses WHERE asistente_id = ?",
      [asistenteId]
    );

    const [datosAdicionalesDb] = await connection.execute(
      "SELECT clave, valor FROM datos_adicionales WHERE asistente_id = ?",
      [asistenteId]
    );

    const [asistenciasDb] = await connection.execute(
      `SELECT a.*, e.nombre as evento_nombre, e.fecha as evento_fecha, tt.tipo as ticket_tipo
       FROM asistencias a
       JOIN eventos e ON a.evento_id = e.id
       JOIN tipos_ticket tt ON a.tipo_ticket_id = tt.id
       WHERE a.asistente_id = ?`,
      [asistenteId]
    );

    asistenteActualizado.preferencias = {
      dietarias: preferenciasDb.map((p) => p.preferencia),
      intereses: interesesDb.map((i) => i.interes),
    };
    asistenteActualizado.datosAdicionales = Object.fromEntries(
      datosAdicionalesDb.map((da) => [da.clave, da.valor])
    );
    asistenteActualizado.asistencias = asistenciasDb;

    connection.release();
    res.json(asistenteActualizado);
  } catch (err) {
    await connection.rollback();
    connection.release();
    console.error("Error:", err);
    res.status(400).json({ 
      mensaje: "Error al actualizar asistente", 
      error: err.message 
    });
  }
});

// DELETE - Eliminar asistente
app.delete("/api/asistentes/:id", async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const asistenteId = req.params.id;

    // Verificar si el asistente existe
    const [asistentes] = await connection.execute(
      "SELECT * FROM asistentes WHERE id = ?",
      [asistenteId]
    );

    if (asistentes.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ mensaje: "Asistente no encontrado" });
    }

    // Eliminar en cascada (gracias a las foreign keys)
    await connection.execute("DELETE FROM asistentes WHERE id = ?", [asistenteId]);

    await connection.commit();
    connection.release();
    
    res.json({ mensaje: "Asistente eliminado correctamente" });
  } catch (err) {
    await connection.rollback();
    connection.release();
    console.error("Error:", err);
    res.status(500).json({ 
      mensaje: "Error al eliminar asistente", 
      error: err.message 
    });
  }
});


// Ruta de prueba
app.get("/", (req, res) => {
  res.json({
    mensaje: " API de Gestión de Eventos - MySQL (Sistema Antiguo)",
    advertencia:
      "Este sistema presenta limitaciones de escalabilidad y flexibilidad",
  });
});

app.listen(PORT, () => {
  console.log(` Servidor MySQL corriendo en http://localhost:${PORT}`);
  console.log(" Este es el sistema ANTIGUO con limitaciones de escalabilidad");
});
