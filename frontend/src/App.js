import React, { useState, useEffect } from 'react';
import { Calendar, Users, Trash2, Plus } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

export default function EventosApp() {
  const [activeTab, setActiveTab] = useState('eventos');
  const [eventos, setEventos] = useState([]);
  const [asistentes, setAsistentes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (activeTab === 'eventos') fetchEventos();
    if (activeTab === 'asistentes') fetchAsistentes();
  }, [activeTab]);

  const fetchEventos = async () => {
    try {
      const res = await fetch(`${API_URL}/eventos`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.mensaje || `HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setEventos(data);
    } catch (err) {
      console.error('Error al obtener eventos:', err);
      alert(`Error al obtener eventos: ${err.message}`);
    }
  };

  const fetchAsistentes = async () => {
    try {
      const res = await fetch(`${API_URL}/asistentes`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.mensaje || `HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setAsistentes(data);
    } catch (err) {
      console.error('Error al obtener asistentes:', err);
      alert(`Error al obtener asistentes: ${err.message}`);
    }
  };

  const handleSave = async () => {
    const url = modalType === 'evento' ? `${API_URL}/eventos` : `${API_URL}/asistentes`;
    
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        setShowModal(false);
        setFormData({});
        activeTab === 'eventos' ? fetchEventos() : fetchAsistentes();
      } else {
        const errorData = await res.json();
        console.error('Error del servidor:', errorData);
        alert(`Error: ${errorData.mensaje || 'Ocurrió un error.'}\n${errorData.error || ''}`);
      }
    } catch (err) {
      console.error('Error de red:', err);
      alert('Error de red. Revisa la consola para más detalles.');
    }
  };

  const handleDelete = async (id, tipo) => {
    if (!confirm('¿Estás seguro de eliminar?')) return;
    
    try {
      const url = tipo === 'evento' ? `${API_URL}/eventos/${id}` : `${API_URL}/asistentes/${id}`;
      const res = await fetch(url, { method: 'DELETE' });
      if (res.ok) {
        tipo === 'evento' ? fetchEventos() : fetchAsistentes();
      } else {
        const errorData = await res.json();
        console.error('Error al eliminar:', errorData);
        alert(`Error: ${errorData.mensaje || 'No se pudo eliminar.'}`);
      }
    } catch (err) {
      console.error('Error de red:', err);
      alert('Error de red. Revisa la consola para más detalles.');
    }
  };

  const openModal = (tipo) => {
    setModalType(tipo);
    setFormData({});
    setShowModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Calendar className="text-indigo-600" size={36} />
            Sistema de Gestión de Eventos - MongoDB
          </h1>
          <p className="text-gray-600 mt-2">Comparativa SQL vs NoSQL - Proyecto Final UPTC</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('eventos')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition ${
              activeTab === 'eventos'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Calendar size={20} />
            Eventos
          </button>
          <button
            onClick={() => setActiveTab('asistentes')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition ${
              activeTab === 'asistentes'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Users size={20} />
            Asistentes
          </button>
        </div>

        {activeTab === 'eventos' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Lista de Eventos</h2>
              <button
                onClick={() => openModal('evento')}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
              >
                <Plus size={20} />
                Nuevo Evento
              </button>
            </div>

            <div className="grid gap-4">
              {eventos.map((evento) => (
                <div key={evento._id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800">{evento.nombre}</h3>
                      <p className="text-gray-600 mt-1">{evento.descripcion}</p>
                      
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="flex items-center gap-2 text-gray-700">
                          <Calendar size={16} />
                          <span>{new Date(evento.fecha).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                          <Users size={16} />
                          <span>Capacidad: {evento.capacidad}</span>
                        </div>
                      </div>

                      {evento.tickets && evento.tickets.length > 0 && (
                        <div className="mt-4">
                          <p className="font-semibold text-gray-700 mb-2">Tickets:</p>
                          <div className="flex gap-2 flex-wrap">
                            {evento.tickets.map((ticket, idx) => (
                              <span key={idx} className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                                {ticket.tipo}: ${ticket.precio.toLocaleString()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {evento.promociones && evento.promociones.length > 0 && (
                        <div className="mt-3">
                          <p className="font-semibold text-gray-700 mb-2">Promociones:</p>
                          <div className="flex gap-2 flex-wrap">
                            {evento.promociones.map((promo, idx) => (
                              <span key={idx} className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
                                {promo.codigo}: {promo.descuento}%
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleDelete(evento._id, 'evento')}
                      className="text-red-600 hover:text-red-800 p-2"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'asistentes' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Lista de Asistentes</h2>
              <button
                onClick={() => openModal('asistente')}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
              >
                <Plus size={20} />
                Nuevo Asistente
              </button>
            </div>

            <div className="grid gap-4">
              {asistentes.map((asistente) => (
                <div key={asistente._id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800">{asistente.nombre}</h3>
                      <p className="text-gray-600">{asistente.email}</p>
                      
                      {asistente.empresa && (
                        <p className="text-gray-600 mt-2">
                          <span className="font-semibold">Empresa:</span> {asistente.empresa}
                        </p>
                      )}

                      {asistente.preferencias?.intereses?.length > 0 && (
                        <div className="mt-3">
                          <p className="font-semibold text-gray-700 mb-2">Intereses:</p>
                          <div className="flex gap-2 flex-wrap">
                            {asistente.preferencias.intereses.map((interes, idx) => (
                              <span key={idx} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                                {interes}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {asistente.asistencias && asistente.asistencias.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm text-gray-600">
                            Eventos asistidos: {asistente.asistencias.length}
                          </p>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleDelete(asistente._id, 'asistente')}
                      className="text-red-600 hover:text-red-800 p-2"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">
              Crear {modalType === 'evento' ? 'Evento' : 'Asistente'}
            </h3>
            
            <div className="space-y-3">
              {modalType === 'evento' ? (
                <>
                  <input
                    type="text"
                    placeholder="Nombre del evento"
                    className="w-full px-3 py-2 border rounded-lg"
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  />
                  <textarea
                    placeholder="Descripción"
                    className="w-full px-3 py-2 border rounded-lg"
                    onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                  />
                  <input
                    type="date"
                    className="w-full px-3 py-2 border rounded-lg"
                    onChange={(e) => setFormData({...formData, fecha: e.target.value})}
                  />
                  <input
                    type="text"
                    placeholder="Lugar"
                    className="w-full px-3 py-2 border rounded-lg"
                    onChange={(e) => setFormData({...formData, lugar: e.target.value})}
                  />
                  <input
                    type="number"
                    placeholder="Capacidad"
                    className="w-full px-3 py-2 border rounded-lg"
                    onChange={(e) => setFormData({...formData, capacidad: parseInt(e.target.value)})}
                  />
                </>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="Nombre completo"
                    className="w-full px-3 py-2 border rounded-lg"
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    className="w-full px-3 py-2 border rounded-lg"
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                  <input
                    type="tel"
                    placeholder="Teléfono"
                    className="w-full px-3 py-2 border rounded-lg"
                    onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                  />
                  <input
                    type="text"
                    placeholder="Empresa (opcional)"
                    className="w-full px-3 py-2 border rounded-lg"
                    onChange={(e) => setFormData({...formData, empresa: e.target.value})}
                  />
                </>
              )}

              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleSave}
                  className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
                >
                  Guardar
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}