import React, { useState, useEffect } from "react";
import {
  Calendar,
  Users,
  Trash2,
  Plus,
  X,
  Ticket,
  Tag,
  Edit,
  Key, // Nuevo icono para datos adicionales
} from "lucide-react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

export default function EventosApp() {
  const [activeTab, setActiveTab] = useState("eventos");
  const [eventos, setEventos] = useState([]);
  const [asistentes, setAsistentes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("");
  const [formData, setFormData] = useState({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [notification, setNotification] = useState(null);

  const [currentItem, setCurrentItem] = useState(null);

  // Estados para tickets y promociones
  const [tickets, setTickets] = useState([]);
  const [promociones, setPromociones] = useState([]);
  const [newTicket, setNewTicket] = useState({
    tipo: "",
    precio: "",
    cantidad: "",
  });
  const [newPromo, setNewPromo] = useState({
    codigo: "",
    descuento: "",
    fechaInicio: "",
    fechaFin: "",
  });

  // Estado para datos adicionales del asistente
  const [datosAdicionales, setDatosAdicionales] = useState([]);

  useEffect(() => {
    if (activeTab === "eventos") fetchEventos();
    if (activeTab === "asistentes") fetchAsistentes();
  }, [activeTab]);

  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  const hideNotification = () => {
    setNotification(null);
  };

  const fetchEventos = async () => {
    try {
      const res = await fetch(`${API_URL}/eventos`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setEventos(data);
    } catch (err) {
      console.error("Error:", err);
      showNotification(`Error al obtener eventos: ${err.message}`, "error");
    }
  };

  const fetchAsistentes = async () => {
    try {
      const res = await fetch(`${API_URL}/asistentes`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setAsistentes(data);
    } catch (err) {
      console.error("Error:", err);
      showNotification(`Error al obtener asistentes: ${err.message}`, "error");
    }
  };

  // --- LÓGICA DE TICKETS Y PROMOCIONES ---
  const addTicket = () => {
    if (!newTicket.tipo || !newTicket.precio || !newTicket.cantidad) {
      showNotification("Completa todos los campos del ticket", "error");
      return;
    }
    setTickets([
      ...tickets,
      {
        tipo: newTicket.tipo,
        precio: parseFloat(newTicket.precio),
        cantidad: parseInt(newTicket.cantidad),
        vendidos: 0,
      },
    ]);
    setNewTicket({ tipo: "", precio: "", cantidad: "" });
  };

  const removeTicket = (index) => {
    setTickets(tickets.filter((_, i) => i !== index));
  };

  const addPromocion = () => {
    if (
      !newPromo.codigo ||
      !newPromo.descuento ||
      !newPromo.fechaInicio ||
      !newPromo.fechaFin
    ) {
      showNotification("Completa todos los campos de la promoción", "error");
      return;
    }
    setPromociones([
      ...promociones,
      {
        codigo: newPromo.codigo,
        descuento: parseFloat(newPromo.descuento),
        fechaInicio: new Date(newPromo.fechaInicio),
        fechaFin: new Date(newPromo.fechaFin),
        activa: true,
      },
    ]);
    setNewPromo({ codigo: "", descuento: "", fechaInicio: "", fechaFin: "" });
  };

  const removePromocion = (index) => {
    setPromociones(promociones.filter((_, i) => i !== index));
  };

  // --- LÓGICA DE DATOS ADICIONALES ---
  const handleAddAdicional = () => {
    setDatosAdicionales([...datosAdicionales, { clave: "", valor: "" }]);
  };

  const handleRemoveAdicional = (index) => {
    setDatosAdicionales(datosAdicionales.filter((_, i) => i !== index));
  };

  const handleChangeAdicional = (index, field, value) => {
    const updatedDatos = datosAdicionales.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    setDatosAdicionales(updatedDatos);
  };

  // --- LÓGICA DE GUARDADO ---
  const handleSave = () => {
    if (currentItem) {
      handleUpdate();
    } else {
      handleCreate();
    }
  };

  const handleCreate = async () => {
    const url =
      modalType === "evento" ? `${API_URL}/eventos` : `${API_URL}/asistentes`;

    if (modalType === "evento") {
      if (
        !formData.nombre ||
        !formData.descripcion ||
        !formData.fecha ||
        !formData.lugar ||
        !formData.capacidad
      ) {
        showNotification(
          "Por favor completa todos los campos requeridos: Nombre, Descripcion, Fecha, Lugar y Capacidad",
          "error"
        );
        return;
      }

      const dataToSend = {
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        fecha: formData.fecha,
        lugar: formData.lugar,
        capacidad: parseInt(formData.capacidad) || 0,
        categoria: formData.categoria || "Otro",
        organizador: {
          nombre: formData.organizador?.nombre || "Sin especificar",
          contacto: formData.organizador?.contacto || "",
          email: formData.organizador?.email || "",
        },
        tickets: tickets.map((ticket) => ({
          tipo: ticket.tipo,
          precio: parseFloat(ticket.precio) || 0,
          cantidad: parseInt(ticket.cantidad) || 0,
          vendidos: 0,
          caracteristicas: ticket.caracteristicas || {},
        })),
        promociones: promociones.map((promo) => ({
          codigo: promo.codigo,
          descuento: parseFloat(promo.descuento) || 0,
          fechaInicio: promo.fechaInicio,
          fechaFin: promo.fechaFin,
          activa: true,
          condiciones: promo.condiciones || {},
        })),
      };

      console.log("Datos a enviar para crear evento:", dataToSend);

      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dataToSend),
        });

        if (res.ok) {
          handleCloseModal();
          fetchEventos();
          showNotification("¡Evento creado exitosamente!", "success");
        } else {
          const errorData = await res.json();
          console.error("Error del servidor:", errorData);
          showNotification(
            `Error: ${
              errorData.mensaje ||
              errorData.detalles ||
              "Ocurrio un error al crear el evento."
            }`,
            "error"
          );
        }
      } catch (err) {
        console.error("Error:", err);
        showNotification("Error de red. Revisa la consola para mas detalles.", "error");
      }
    } else {
      // Lógica para crear asistente
      if (!formData.nombre || !formData.email) {
        showNotification("Por favor completa nombre y email", "error");
        return;
      }
      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(formData.email)) {
        showNotification("Por favor introduce un formato de email valido.", "error");
        return;
      }

      // Transformar datosAdicionales de array a objeto para el backend
      const datosAdicionalesObj = datosAdicionales.reduce((acc, item) => {
        if (item.clave && item.valor) {
          acc[item.clave] = item.valor;
        }
        return acc;
      }, {});

      const dataToSend = {
        nombre: formData.nombre,
        email: formData.email,
        telefono: formData.telefono || null,
        documento: formData.documento || null,
        empresa: formData.empresa || null,
        cargo: formData.cargo || null,
        preferencias: {
          dietarias: formData.preferencias?.dietarias || [],
          intereses: formData.preferencias?.intereses || [],
        },
        datosAdicionales: datosAdicionalesObj,
      };

      console.log("Datos a enviar para crear asistente:", dataToSend);

      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dataToSend),
        });

        if (res.ok) {
          handleCloseModal();
          fetchAsistentes();
          showNotification("¡Asistente creado exitosamente!", "success");
        } else {
          const errorData = await res.json();
          console.error("Error del servidor:", errorData);
          showNotification(
            `Error: ${
              errorData.mensaje || "Ocurrio un error al crear el asistente."
            }`,
            "error"
          );
        }
      } catch (err) {
        console.error("Error:", err);
        showNotification("Error de red. Revisa la consola para mas detalles.", "error");
      }
    }
  };

  const handleUpdate = async () => {
    if (!currentItem) return;

    if (modalType === "evento") {
      const url = `${API_URL}/eventos/${currentItem.id}`;

      const dataToSend = {
        nombre: formData.nombre || "",
        descripcion: formData.descripcion || "",
        fecha: formData.fecha || "",
        lugar: formData.lugar || "",
        capacidad: parseInt(formData.capacidad) || 0,
        categoria: formData.categoria || "Otro",
        organizador: {
          nombre: formData.organizador?.nombre || "Sin especificar",
          contacto: formData.organizador?.contacto || "",
          email: formData.organizador?.email || "",
        },
        tickets: tickets.map((ticket) => ({
          tipo: ticket.tipo,
          precio: parseFloat(ticket.precio) || 0,
          cantidad: parseInt(ticket.cantidad) || 0,
          vendidos: parseInt(ticket.vendidos) || 0,
          caracteristicas: ticket.caracteristicas || {},
        })),
        promociones: promociones.map((promo) => ({
          codigo: promo.codigo,
          descuento: parseFloat(promo.descuento) || 0,
          fechaInicio: promo.fechaInicio,
          fechaFin: promo.fechaFin,
          activa: promo.activa !== undefined ? promo.activa : true,
          condiciones: promo.condiciones || {},
        })),
      };

      console.log("Datos a enviar en actualizacion de evento:", dataToSend);

      try {
        const res = await fetch(url, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dataToSend),
        });

        if (res.ok) {
          handleCloseModal();
          fetchEventos();
          showNotification("¡Evento actualizado exitosamente!", "success");
        } else {
          const errorData = await res.json();
          console.error("Error del servidor:", errorData);
          showNotification(
            `Error: ${errorData.mensaje || "Ocurrio un error al actualizar."}`,
            "error"
          );
        }
      } catch (err) {
        console.error("Error:", err);
        showNotification("Error de red. Revisa la consola para mas detalles.", "error");
      }
    } else {
      // Lógica para actualizar asistente
      const url = `${API_URL}/asistentes/${currentItem.id}`;

      if (!formData.nombre || !formData.email) {
        showNotification("Por favor completa nombre y email", "error");
        return;
      }
      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(formData.email)) {
        showNotification("Por favor introduce un formato de email valido.", "error");
        return;
      }

      // Transformar datosAdicionales de array a objeto para el backend
      const datosAdicionalesObj = datosAdicionales.reduce((acc, item) => {
        if (item.clave && item.valor) {
          acc[item.clave] = item.valor;
        }
        return acc;
      }, {});

      const dataToSend = {
        nombre: formData.nombre,
        email: formData.email,
        telefono: formData.telefono || null,
        documento: formData.documento || null,
        empresa: formData.empresa || null,
        cargo: formData.cargo || null,
        preferencias: {
          dietarias: formData.preferencias?.dietarias || [],
          intereses: formData.preferencias?.intereses || [],
        },
        datosAdicionales: datosAdicionalesObj,
      };

      console.log("Datos a enviar en actualizacion de asistente:", dataToSend);

      try {
        const res = await fetch(url, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dataToSend),
        });

        if (res.ok) {
          handleCloseModal();
          fetchAsistentes();
          showNotification("¡Asistente actualizado exitosamente!", "success");
        } else {
          const errorData = await res.json();
          console.error("Error del servidor:", errorData);
          showNotification(
            `Error: ${errorData.mensaje || "Ocurrio un error al actualizar."}`,
            "error"
          );
        }
      } catch (err) {
        console.error("Error:", err);
        showNotification("Error de red. Revisa la consola para mas detalles.", "error");
      }
    }
  };

  const handleDelete = (id, tipo) => {
    setItemToDelete({ id, tipo });
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    const { id, tipo } = itemToDelete;

    try {
      const url =
        tipo === "evento"
          ? `${API_URL}/eventos/${id}`
          : `${API_URL}/asistentes/${id}`;

      const res = await fetch(url, { method: "DELETE" });

      if (res.ok) {
        tipo === "evento" ? fetchEventos() : fetchAsistentes();
        showNotification("Eliminado exitosamente", "success");
      } else {
        const errorData = await res.json();
        showNotification(`Error: ${errorData.mensaje}`, "error");
      }
    } catch (err) {
      console.error("Error:", err);
      showNotification("Error de red", "error");
    } finally {
      setShowDeleteModal(false);
      setItemToDelete(null);
    }
  };

  const openModal = (tipo, item = null) => {
    setModalType(tipo);
    setTickets([]); // Limpiar tickets y promociones al abrir modal
    setPromociones([]);
    setDatosAdicionales([]); // Limpiar datos adicionales al abrir modal

    if (item) {
      setCurrentItem(item);
      const formattedItem = {
        ...item,
        fecha: item.fecha
          ? new Date(item.fecha).toISOString().split("T")[0]
          : "",
        capacidad: item.capacidad || "",
        categoria: item.categoria || "Otro",
        lugar: item.lugar || "",
        organizador: item.organizador || {
          nombre: "",
          contacto: "",
          email: "",
        },
        preferencias: item.preferencias || { dietarias: [], intereses: [] },
      };

      setFormData(formattedItem);

      if (tipo === "evento") {
        setTickets(item.tickets || []);
        setPromociones(
          item.promociones
            ? item.promociones.map((promo) => ({
                ...promo,
                fechaInicio: promo.fecha_inicio
                  ? new Date(promo.fecha_inicio).toISOString().split("T")[0]
                  : "",
                fechaFin: promo.fecha_fin
                  ? new Date(promo.fecha_fin).toISOString().split("T")[0]
                  : "",
              }))
            : []
        );
      } else if (tipo === "asistente") {
        if (item.datosAdicionales) {
          const transformedDatos = Object.entries(item.datosAdicionales).map(
            ([clave, valor]) => ({ clave, valor })
          );
          setDatosAdicionales(transformedDatos);
        }
      }
    } else {
      setCurrentItem(null);
      setFormData({
        nombre: "",
        descripcion: "",
        fecha: "",
        lugar: "",
        capacidad: "",
        categoria: "Otro",
        organizador: {
          nombre: "",
          contacto: "",
          email: "",
        },
        preferencias: {
          dietarias: [],
          intereses: [],
        },
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCurrentItem(null);
    setFormData({});
    setTickets([]);
    setPromociones([]);
    setDatosAdicionales([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Calendar className="text-indigo-600" size={36} />
            Sistema de Gestion de Eventos - MySQL
          </h1>
          <p className="text-gray-600 mt-2">MySQL - Proyecto Final UPTC</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab("eventos")}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition ${
              activeTab === "eventos"
                ? "bg-indigo-600 text-white shadow-lg"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}>
            <Calendar size={20} />
            Eventos
          </button>
          <button
            onClick={() => setActiveTab("asistentes")}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition ${
              activeTab === "asistentes"
                ? "bg-indigo-600 text-white shadow-lg"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}>
            <Users size={20} />
            Asistentes
          </button>
        </div>

        {activeTab === "eventos" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Lista de Eventos
              </h2>
              <button
                onClick={() => openModal("evento")}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
                <Plus size={20} />
                Nuevo Evento
              </button>
            </div>

            <div className="grid gap-4">
              {eventos.map((evento) => (
                <div
                  key={evento.id}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800">
                        {evento.nombre}
                      </h3>
                      <p className="text-gray-600 mt-1">{evento.descripcion}</p>
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="flex items-center gap-2 text-gray-700">
                          <Calendar size={16} />
                          <span>
                            {new Date(evento.fecha).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                          <Users size={16} />
                          <span>Capacidad: {evento.capacidad}</span>
                        </div>
                      </div>

                      {evento.tickets && evento.tickets.length > 0 && (
                        <div className="mt-4">
                          <p className="font-semibold text-gray-700 mb-2">
                            Tickets:
                          </p>
                          <div className="flex gap-2 flex-wrap">
                            {evento.tickets.map((ticket, idx) => (
                              <span
                                key={idx}
                                className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                                {ticket.tipo}: ${ticket.precio.toLocaleString()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {evento.promociones && evento.promociones.length > 0 && (
                        <div className="mt-3">
                          <p className="font-semibold text-gray-700 mb-2">
                            Promociones:
                          </p>
                          <div className="flex gap-2 flex-wrap">
                            {evento.promociones.map((promo, idx) => (
                              <span
                                key={idx}
                                className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
                                {promo.codigo}: {promo.descuento}%
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex">
                      <button
                        onClick={() => openModal("evento", evento)}
                        className="text-blue-600 hover:text-blue-800 p-2">
                        <Edit size={20} />
                      </button>
                      <button
                        onClick={() => handleDelete(evento.id, "evento")}
                        className="text-red-600 hover:text-red-800 p-2">
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "asistentes" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Lista de Asistentes
              </h2>
              <button
                onClick={() => openModal("asistente")}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition">
                <Plus size={20} />
                Nuevo Asistente
              </button>
            </div>

            <div className="grid gap-4">
              {asistentes.map((asistente) => (
                <div
                  key={asistente.id}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800">
                        {asistente.nombre}
                      </h3>
                      <p className="text-gray-600">{asistente.email}</p>
                      {asistente.empresa && (
                        <p className="text-gray-600 mt-2">
                          <span className="font-semibold">Empresa:</span>{" "}
                          {asistente.empresa}
                        </p>
                      )}

                      {asistente.preferencias?.intereses &&
                        asistente.preferencias.intereses.length > 0 &&
                        asistente.preferencias.intereses[0] !== "" && (
                          <div className="mt-3">
                            <p className="font-semibold text-gray-700 mb-2">
                              Intereses:
                            </p>
                            <div className="flex gap-2 flex-wrap">
                              {asistente.preferencias.intereses.map(
                                (interes, idx) => (
                                  <span
                                    key={idx}
                                    className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                                    {interes}
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        )}

                      {asistente.datosAdicionales &&
                        Object.keys(asistente.datosAdicionales).length > 0 && (
                          <div className="mt-3">
                            <p className="font-semibold text-gray-700 mb-2">
                              Datos Adicionales:
                            </p>
                            <div className="flex gap-2 flex-wrap">
                              {Object.entries(asistente.datosAdicionales).map(
                                ([clave, valor], idx) => (
                                  <span
                                    key={idx}
                                    className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">
                                    {clave}: {valor}
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        )}
                    </div>

                    <div className="flex">
                      <button
                        onClick={() => openModal("asistente", asistente)}
                        className="text-blue-600 hover:text-blue-800 p-2">
                        <Edit size={20} />
                      </button>
                      <button
                        onClick={() => handleDelete(asistente.id, "asistente")}
                        className="text-red-600 hover:text-red-800 p-2">
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-xl font-bold mb-4">Confirmar Eliminacion</h3>
            <p>¿Estas seguro de que quieres eliminar este elemento?</p>
            <div className="flex gap-3 mt-4">
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
                Eliminar
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setItemToDelete(null);
                }}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full my-8">
            <h3 className="text-xl font-bold mb-4">
              {currentItem ? "Editar" : "Crear"}{" "}
              {modalType === "evento" ? "Evento" : "Asistente"}
            </h3>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              {modalType === "evento" ? (
                <>
                  <input
                    type="text"
                    placeholder="Nombre del Evento *"
                    className="w-full px-3 py-2 border rounded-lg"
                    value={formData.nombre || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, nombre: e.target.value })
                    }
                  />
                  <textarea
                    placeholder="Descripcion *"
                    className="w-full px-3 py-2 border rounded-lg"
                    value={formData.descripcion || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, descripcion: e.target.value })
                    }
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="date"
                      className="w-full px-3 py-2 border rounded-lg"
                      value={formData.fecha || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, fecha: e.target.value })
                      }
                    />
                    <input
                      type="number"
                      placeholder="Capacidad *"
                      className="w-full px-3 py-2 border rounded-lg"
                      value={formData.capacidad || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, capacidad: e.target.value })
                      }
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Lugar *"
                    className="w-full px-3 py-2 border rounded-lg"
                    value={formData.lugar || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, lugar: e.target.value })
                    }
                  />
                  <input
                    type="text"
                    placeholder="Categoria"
                    className="w-full px-3 py-2 border rounded-lg"
                    value={formData.categoria || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, categoria: e.target.value })
                    }
                  />

                  {/* Sección de Tickets */}
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Ticket size={18} /> Tickets
                    </h4>
                    {tickets.map((ticket, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 mb-2 bg-gray-50 p-2 rounded-lg">
                        <p className="flex-1">
                          {ticket.tipo} - ${ticket.precio} - ({ticket.cantidad}{" "}
                          disp.)
                        </p>
                        <button
                          onClick={() => removeTicket(index)}
                          className="text-red-500 hover:text-red-700">
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Tipo"
                        className="w-1/3 px-2 py-1 border rounded"
                        value={newTicket.tipo}
                        onChange={(e) =>
                          setNewTicket({ ...newTicket, tipo: e.target.value })
                        }
                      />
                      <input
                        type="number"
                        placeholder="Precio"
                        className="w-1/3 px-2 py-1 border rounded"
                        value={newTicket.precio}
                        onChange={(e) =>
                          setNewTicket({
                            ...newTicket,
                            precio: e.target.value,
                          })
                        }
                      />
                      <input
                        type="number"
                        placeholder="Cantidad"
                        className="w-1/3 px-2 py-1 border rounded"
                        value={newTicket.cantidad}
                        onChange={(e) =>
                          setNewTicket({
                            ...newTicket,
                            cantidad: e.target.value,
                          })
                        }
                      />
                    </div>
                    <button
                      onClick={addTicket}
                      className="mt-2 text-sm bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600">
                      Agregar Ticket
                    </button>
                  </div>

                  {/* Sección de Promociones */}
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Tag size={18} /> Promociones
                    </h4>
                    {promociones.map((promo, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 mb-2 bg-gray-50 p-2 rounded-lg">
                        <p className="flex-1">
                          {promo.codigo} - {promo.descuento}%
                        </p>
                        <button
                          onClick={() => removePromocion(index)}
                          className="text-red-500 hover:text-red-700">
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Codigo"
                        className="px-2 py-1 border rounded"
                        value={newPromo.codigo}
                        onChange={(e) =>
                          setNewPromo({ ...newPromo, codigo: e.target.value })
                        }
                      />
                      <input
                        type="number"
                        placeholder="Descuento %"
                        className="px-2 py-1 border rounded"
                        value={newPromo.descuento}
                        onChange={(e) =>
                          setNewPromo({
                            ...newPromo,
                            descuento: e.target.value,
                          })
                        }
                      />
                      <input
                        type="date"
                        placeholder="Fecha Inicio"
                        className="px-2 py-1 border rounded"
                        value={newPromo.fechaInicio}
                        onChange={(e) =>
                          setNewPromo({
                            ...newPromo,
                            fechaInicio: e.target.value,
                          })
                        }
                      />
                      <input
                        type="date"
                        placeholder="Fecha Fin"
                        className="px-2 py-1 border rounded"
                        value={newPromo.fechaFin}
                        onChange={(e) =>
                          setNewPromo({ ...newPromo, fechaFin: e.target.value })
                        }
                      />
                    </div>
                    <button
                      onClick={addPromocion}
                      className="mt-2 text-sm bg-purple-500 text-white px-3 py-1 rounded hover:bg-purple-600">
                      Agregar Promocion
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="Nombre completo *"
                    className="w-full px-3 py-2 border rounded-lg"
                    value={formData.nombre || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, nombre: e.target.value })
                    }
                  />

                  <input
                    type="email"
                    placeholder="Email *"
                    className="w-full px-3 py-2 border rounded-lg"
                    value={formData.email || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />

                  <input
                    type="tel"
                    placeholder="Telefono"
                    className="w-full px-3 py-2 border rounded-lg"
                    value={formData.telefono || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, telefono: e.target.value })
                    }
                  />

                  <input
                    type="text"
                    placeholder="Empresa (opcional)"
                    className="w-full px-3 py-2 border rounded-lg"
                    value={formData.empresa || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, empresa: e.target.value })
                    }
                  />
                  <input
                    type="text"
                    placeholder="Intereses (separados por comas)"
                    className="w-full px-3 py-2 border rounded-lg"
                    value={
                      formData.preferencias?.intereses
                        ? formData.preferencias.intereses.join(", ")
                        : ""
                    }
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        preferencias: {
                          ...formData.preferencias,
                          intereses: e.target.value
                            .split(",")
                            .map((i) => i.trim()),
                        },
                      })
                    }
                  />

                  {/* Sección de Datos Adicionales */}
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Key size={18} /> Datos Adicionales
                    </h4>
                    {datosAdicionales.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 mb-2 bg-gray-50 p-2 rounded-lg">
                        <input
                          type="text"
                          placeholder="Clave"
                          className="w-1/2 px-2 py-1 border rounded"
                          value={item.clave}
                          onChange={(e) =>
                            handleChangeAdicional(
                              index,
                              "clave",
                              e.target.value
                            )
                          }
                        />
                        <input
                          type="text"
                          placeholder="Valor"
                          className="w-1/2 px-2 py-1 border rounded"
                          value={item.valor}
                          onChange={(e) =>
                            handleChangeAdicional(
                              index,
                              "valor",
                              e.target.value
                            )
                          }
                        />
                        <button
                          onClick={() => handleRemoveAdicional(index)}
                          className="text-red-500 hover:text-red-700">
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={handleAddAdicional}
                      className="mt-2 text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600">
                      Añadir Campo
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t">
              <button
                onClick={handleSave}
                className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
                {currentItem ? "Actualizar" : "Guardar"}
              </button>

              <button
                onClick={handleCloseModal}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Componente de Notificacion */}
      {notification && (
        <div
          className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg flex items-center justify-between z-50 ${
            notification.type === "success"
              ? "bg-green-500 text-white"
              : "bg-red-500 text-white"
          }`}>
          <span>{notification.message}</span>
          <button onClick={hideNotification} className="ml-4 font-bold">
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
