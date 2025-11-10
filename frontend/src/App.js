import React, { useState, useEffect } from "react";
// 1. Importar el icono 'Edit'
import {
  Calendar,
  Users,
  Trash2,
  Plus,
  X,
  Ticket,
  Tag,
  Edit,
} from "lucide-react";

// La variable de entorno que ya corregimos
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

  // 2. Nuevo estado para saber si estamos editando o creando
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

  useEffect(() => {
    if (activeTab === "eventos") fetchEventos();
    if (activeTab === "asistentes") fetchAsistentes();
  }, [activeTab]);

  const fetchEventos = async () => {
    try {
      const res = await fetch(`${API_URL}/eventos`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setEventos(data);
    } catch (err) {
      console.error("Error:", err);
      alert(`Error al obtener eventos: ${err.message}`);
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
      alert(`Error al obtener asistentes: ${err.message}`);
    }
  };

  // --- LÓGICA DE TICKETS Y PROMOCIONES (Sin cambios) ---
  const addTicket = () => {
    if (!newTicket.tipo || !newTicket.precio || !newTicket.cantidad) {
      alert("Completa todos los campos del ticket");
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
      alert("Completa todos los campos de la promoción");
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

  // --- 4. LÓGICA DE GUARDADO (Refactorizada) ---

  // handleSave ahora decide si crear o actualizar
  const handleSave = () => {
    if (currentItem) {
      handleUpdate();
    } else {
      handleCreate();
    }
  };

  // Lógica de Creación (Tu 'handleSave' original)
  const handleCreate = async () => {
    const url =
      modalType === "evento" ? `${API_URL}/eventos` : `${API_URL}/asistentes`;

    let dataToSend = { ...formData };

    if (modalType === "evento") {
      if (
        !formData.nombre ||
        !formData.descripcion ||
        !formData.fecha ||
        !formData.lugar ||
        !formData.capacidad
      ) {
        alert("Por favor completa todos los campos requeridos");
        return;
      }

      // Asegurar que los números sean números
      dataToSend = {
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
    } else {
      // Lógica para asistentes (similar corrección)
      if (!formData.nombre || !formData.email) {
        alert("Por favor completa nombre y email");
        return;
      }
      dataToSend = {
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
        datosAdicionales: formData.datosAdicionales || {},
      };
    }

    try {
      console.log("Datos a enviar:", dataToSend);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSend),
      });

      if (res.ok) {
        handleCloseModal();
        activeTab === "eventos" ? fetchEventos() : fetchAsistentes();
        alert("¡Guardado exitosamente!");
      } else {
        const errorData = await res.json();
        console.error("Error del servidor:", errorData);
        alert(
          `Error: ${
            errorData.mensaje || errorData.detalles || "Ocurrió un error."
          }`
        );
      }
    } catch (err) {
      console.error("Error:", err);
      alert("Error de red. Revisa la consola para más detalles.");
    }
  };

  // Nueva lógica de Actualización
  const handleUpdate = async () => {
    if (!currentItem) return;

    const url =
      modalType === "evento"
        ? `${API_URL}/eventos/${currentItem.id}`
        : `${API_URL}/asistentes/${currentItem.id}`;

    let dataToSend = { ...formData };

    if (modalType === "evento") {
      if (
        !formData.nombre ||
        !formData.descripcion ||
        !formData.fecha ||
        !formData.lugar ||
        !formData.capacidad
      ) {
        alert("Por favor completa todos los campos requeridos");
        return;
      }
      dataToSend = {
        ...dataToSend,
        tickets: tickets,
        promociones: promociones,
        categoria: formData.categoria || "Otro",
        organizador: {
          nombre: formData.organizador?.nombre || "Sin especificar",
          contacto: formData.organizador?.contacto || "",
          email: formData.organizador?.email || "",
        }
      };
    } else {
      if (!formData.nombre || !formData.email) {
        alert("Por favor completa nombre y email");
        return;
      }
      dataToSend = {
        nombre: formData.nombre,
        email: formData.email,
        telefono: formData.telefono || null,
        documento: formData.documento || null,
        empresa: formData.empresa || null,
        cargo: formData.cargo || null,
        preferencias: formData.preferencias || {
          dietarias: [],
          intereses: []
        },
        datosAdicionales: formData.datosAdicionales || {}
      };
    }

    try {
      const res = await fetch(url, {
        method: "PUT", // Usamos PUT para actualizar
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSend),
      });

      if (res.ok) {
        handleCloseModal();
        activeTab === "eventos" ? fetchEventos() : fetchAsistentes();
        alert("¡Actualizado exitosamente!");
      } else {
        const errorData = await res.json();
        console.error("Error del servidor:", errorData);
        alert(`Error: ${errorData.mensaje || "Ocurrió un error."}`);
      }
    } catch (err) {
      console.error("Error:", err);
      alert("Error de red. Revisa la consola para más detalles.");
    }
  };

  // --- LÓGICA DE ELIMINACIÓN (Sin cambios) ---
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
        alert("Eliminado exitosamente");
      } else {
        const errorData = await res.json();
        alert(`Error: ${errorData.mensaje}`);
      }
    } catch (err) {
      console.error("Error:", err);
      alert("Error de red");
    } finally {
      setShowDeleteModal(false);
      setItemToDelete(null);
    }
  };

  // --- 3. LÓGICA DEL MODAL (Actualizada) ---

  // openModal ahora maneja "crear" (item=null) y "editar" (item=objeto)
  const openModal = (tipo, item = null) => {
    setModalType(tipo);

    if (item) {
      // Estamos EDITANDO
      setCurrentItem(item);
      // Formateamos la fecha para el input type="date"
      const formattedItem = {
        ...item,
        fecha: item.fecha
          ? new Date(item.fecha).toISOString().split("T")[0]
          : "",
      };
      setFormData(formattedItem);
      // Poblamos los tickets y promociones si es un evento
      if (tipo === "evento") {
        setTickets(item.tickets || []);
        setPromociones(item.promociones || []);
      }
    } else {
      // Estamos CREANDO
      setCurrentItem(null);
      setFormData({});
      setTickets([]);
      setPromociones([]);
    }
    setShowModal(true);
  };

  // Nueva función para centralizar el cierre del modal
  const handleCloseModal = () => {
    setShowModal(false);
    setCurrentItem(null);
    setFormData({});
    setTickets([]);
    setPromociones([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* --- HEADER (Sin cambios) --- */}
      <div className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Calendar className="text-indigo-600" size={36} />
            Sistema de Gestión de Eventos - MySQL
          </h1>
          <p className="text-gray-600 mt-2">
             MySQL - Proyecto Final UPTC
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* --- PESTAÑAS (Sin cambios) --- */}
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
            {/* --- LISTA DE EVENTOS (Botón de editar agregado) --- */}
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

                    {/* --- 3. Botones de Acción (Editar y Borrar) --- */}
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
            {/* --- LISTA DE ASISTENTES (Botón de editar agregado) --- */}
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

                      {asistente.preferencias?.intereses?.length > 0 && (
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
                    </div>

                    {/* --- 3. Botones de Acción (Editar y Borrar) --- */}
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

      {/* --- MODAL DE ELIMINAR (Sin cambios) --- */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-xl font-bold mb-4">Confirmar Eliminación</h3>
            <p>¿Estás seguro de que quieres eliminar este elemento?</p>
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

      {/* --- 5. MODAL DE CREAR/EDITAR (Campos 'value' agregados) --- */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full my-8">
            <h3 className="text-xl font-bold mb-4">
              {/* El título ahora es dinámico */}
              {currentItem ? "Editar" : "Crear"}{" "}
              {modalType === "evento" ? "Evento" : "Asistente"}
            </h3>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              {modalType === "evento" ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre del evento *
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border rounded-lg"
                      value={formData.nombre || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, nombre: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descripción *
                    </label>
                    <textarea
                      className="w-full px-3 py-2 border rounded-lg"
                      rows="3"
                      value={formData.descripcion || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          descripcion: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha *
                      </label>
                      <input
                        type="date"
                        className="w-full px-3 py-2 border rounded-lg"
                        value={formData.fecha || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, fecha: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Capacidad *
                      </label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 border rounded-lg"
                        value={formData.capacidad || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            capacidad: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Lugar *
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border rounded-lg"
                      value={formData.lugar || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, lugar: e.target.value })
                      }
                    />
                  </div>

                  {/* --- Lógica de Tickets y Promociones --- */}
                  {/* (Esta parte no usa 'value' porque se maneja con estados separados) */}
                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Ticket size={20} className="text-green-600" />
                      <h4 className="font-semibold text-gray-800">Tickets</h4>
                    </div>

                    <div className="grid grid-cols-4 gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Tipo"
                        className="px-3 py-2 border rounded-lg"
                        value={newTicket.tipo}
                        onChange={(e) =>
                          setNewTicket({ ...newTicket, tipo: e.target.value })
                        }
                      />
                      <input
                        type="number"
                        placeholder="Precio"
                        className="px-3 py-2 border rounded-lg"
                        value={newTicket.precio}
                        onChange={(e) =>
                          setNewTicket({ ...newTicket, precio: e.target.value })
                        }
                      />
                      <input
                        type="number"
                        placeholder="Cantidad"
                        className="px-3 py-2 border rounded-lg"
                        value={newTicket.cantidad}
                        onChange={(e) =>
                          setNewTicket({
                            ...newTicket,
                            cantidad: e.target.value,
                          })
                        }
                      />
                      <button
                        onClick={addTicket}
                        className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center">
                        <Plus size={16} />
                      </button>
                    </div>

                    <div className="space-y-2">
                      {tickets.map((ticket, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between bg-green-50 p-2 rounded">
                          <span className="text-sm">
                            {ticket.tipo} - ${ticket.precio.toLocaleString()} (
                            {ticket.cantidad} disponibles)
                          </span>
                          <button
                            onClick={() => removeTicket(idx)}
                            className="text-red-600 hover:text-red-800">
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Tag size={20} className="text-purple-600" />
                      <h4 className="font-semibold text-gray-800">
                        Promociones
                      </h4>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Código"
                        className="px-3 py-2 border rounded-lg"
                        value={newPromo.codigo}
                        onChange={(e) =>
                          setNewPromo({ ...newPromo, codigo: e.target.value })
                        }
                      />
                      <input
                        type="number"
                        placeholder="% Descuento"
                        className="px-3 py-2 border rounded-lg"
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
                        className="px-3 py-2 border rounded-lg"
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
                        className="px-3 py-2 border rounded-lg"
                        value={newPromo.fechaFin}
                        onChange={(e) =>
                          setNewPromo({ ...newPromo, fechaFin: e.target.value })
                        }
                      />
                    </div>

                    <button
                      onClick={addPromocion}
                      className="w-full bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2 mb-2">
                      <Plus size={16} /> Agregar Promoción
                    </button>

                    <div className="space-y-2">
                      {promociones.map((promo, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between bg-purple-50 p-2 rounded">
                          <span className="text-sm">
                            {promo.codigo} - {promo.descuento}%
                          </span>
                          <button
                            onClick={() => removePromocion(idx)}
                            className="text-red-600 hover:text-red-800">
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
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
                    placeholder="Teléfono"
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

                  {/* NUEVO: Campo de Intereses */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Intereses (separados por comas)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Tecnología, Música, Deportes"
                      className="w-full px-3 py-2 border rounded-lg"
                      value={formData.interesesInput || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          interesesInput: e.target.value,
                        })
                      }
                      onBlur={(e) => {
                        // Convertir el texto a array cuando el campo pierde el foco
                        if (e.target.value.trim()) {
                          const interesesArray = e.target.value
                            .split(",")
                            .map((interes) => interes.trim())
                            .filter((interes) => interes.length > 0);

                          setFormData({
                            ...formData,
                            interesesInput: e.target.value,
                            preferencias: {
                              ...formData.preferencias,
                              intereses: interesesArray,
                            },
                          });
                        }
                      }}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Escribe los intereses separados por comas
                    </p>

                    {/* Mostrar intereses actuales */}
                    {formData.preferencias?.intereses?.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-gray-700 mb-1">
                          Intereses actuales:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {formData.preferencias.intereses.map(
                            (interes, index) => (
                              <span
                                key={index}
                                className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                                {interes}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t">
              <button
                onClick={handleSave} // Esta función ahora decide si crear o guardar
                className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
                {currentItem ? "Actualizar" : "Guardar"}
              </button>
              <button
                onClick={handleCloseModal} // Usamos la nueva función de cierre
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}