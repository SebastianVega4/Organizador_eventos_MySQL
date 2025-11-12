const express = require('express');
const router = express.Router();

module.exports = (pool, formatDateForMySQL) => {

// GET - Obtener todos los asistentes (CONSULTA CON MULTIPLES JOINS)
router.get("/", async (req, res) => {
  try {
    const connection = await pool.getConnection();

    const [asistantes] = await connection.execute(
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
    res.json(asistantes);
  } catch (err) {
    console.error("Error:", err);
    res
      .status(500)
      .json({ mensaje: "Error al obtener asistentes", error: err.message });
  }
});

// POST - Crear nuevo asistente (TRANSACCION COMPLEJA)
router.post("/", async (req, res) => {
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
    const [asistantes] = await connection.execute(
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
router.put("/:id", async (req, res) => {
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
router.delete("/:id", async (req, res) => {
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

return router;
};
