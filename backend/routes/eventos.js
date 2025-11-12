const express = require('express');
const router = express.Router();

module.exports = (pool, formatDateForMySQL) => {

// GET - Obtener todos los eventos (CONSULTA COMPLEJA CON MULTIPLES JOINS)
router.get("/", async (req, res) => {
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
router.get("/:id", async (req, res) => {
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
router.put("/:id", async (req, res) => {
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

router.delete("/:id", async (req, res) => {
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

// POST - Crear nuevo evento (TRANSACCION COMPLEJA)
router.post("/", async (req, res) => {
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
        // Validar y limpiar datos de la promocion
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
        "Verifica que todos los campos requeridos esten completos y en el formato correcto",
    });
  }
});

return router;
};
