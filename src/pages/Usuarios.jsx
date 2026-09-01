import React, { useState, useEffect } from 'react';
import { UserPlus, UserX, Shield, Mail, Loader2 } from 'lucide-react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/firebase';
import { GOOGLE_SCRIPT_URL } from '@/api';

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);


  const cargarUsuarios = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          tabla: 'Usuarios',
          action: 'list'
        })
      });

      const textResponse = await response.text();
      let data;
      try {
        data = JSON.parse(textResponse);
      } catch (e) {
        throw new Error("Google devolvió un error de formato. Verifica la URL.");
      }

      if (Array.isArray(data)) {
        setUsuarios(data);
      } else {
        setError(data.error || 'Error al cargar los datos.');
      }
    } catch (err) {
      setError('Falla técnica: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const [nuevoUsuario, setNuevoUsuario] = useState({ 
    email: '', 
    password: '', 
    nombre: '', 
    role: 'gestor' 
  });

  const handleCrear = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const secondaryAppName = "SecondaryUserCreationApp";
      let secondaryApp = getApps().find(app => app.name === secondaryAppName);
      
      if (!secondaryApp) {
        secondaryApp = initializeApp(auth.app.options, secondaryAppName);
      }
      const secondaryAuth = getAuth(secondaryApp);

      await createUserWithEmailAndPassword(secondaryAuth, nuevoUsuario.email, nuevoUsuario.password);

      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          tabla: 'Usuarios',
          action: 'create',
          data: {
            nombre: nuevoUsuario.nombre,
            email: nuevoUsuario.email,
            password: nuevoUsuario.password,
            role: nuevoUsuario.role,
            obras_asignadas: ''
          }
        })
      });

      const text = await response.text();
      const res = JSON.parse(text);

      if (res.success) {
        alert("Usuario creado con éxito. Se ha enviado el correo de bienvenida.");
        setNuevoUsuario({ email: '', password: '', nombre: '', role: 'gestor' });
        cargarUsuarios();
      } else {
        alert("El usuario se creó en Firebase pero hubo un error al guardar en la hoja: " + res.error);
      }
    } catch (err) {
      console.error("Detalle Firebase:", err);
      let mensajeError = err.message || "Verifica los datos.";
      if (err.code === 'auth/email-already-in-use' || mensajeError.includes('email-already-in-use')) {
        mensajeError = "El correo electrónico ya se encuentra registrado en Firebase Authentication.";
      }
      alert("Error al registrar usuario: " + mensajeError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDarDeBaja = async (id, nombre) => {
    if (window.confirm(`¿Eliminar a ${nombre}?`)) {
      try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            tabla: 'Usuarios',
            action: 'delete',
            id: id
          })
        });
        const text = await response.text();
        const res = JSON.parse(text);
        if (res.success) {
          alert("Usuario eliminado.");
          cargarUsuarios();
        }
      } catch (err) {
        alert("Error al eliminar.");
      }
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Gestión de Usuarios</h1>
        <p className="text-slate-500 text-sm">Sincronizado con Firebase Auth y Google Sheets.</p>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-base font-semibold flex items-center gap-2 mb-4">
          <UserPlus className="w-5 h-5 text-amber-500" /> Alta de Nuevo Usuario
        </h2>
        <form onSubmit={handleCrear} className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <input
            type="text"
            placeholder="Nombre completo"
            disabled={isSubmitting}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 disabled:bg-slate-100"
            value={nuevoUsuario.nombre}
            onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, nombre: e.target.value })}
            required
          />
          <input
            type="email"
            placeholder="Correo electrónico"
            disabled={isSubmitting}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 disabled:bg-slate-100"
            value={nuevoUsuario.email}
            onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, email: e.target.value })}
            required
          />
          <input
            type="password"
            placeholder="Contraseña temporal"
            disabled={isSubmitting}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 disabled:bg-slate-100"
            value={nuevoUsuario.password}
            onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, password: e.target.value })}
            required
          />
          <select
            disabled={isSubmitting}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 bg-white disabled:bg-slate-100"
            value={nuevoUsuario.role}
            onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, role: e.target.value })}
          >
            <option value="admin">Administrador</option>
            <option value="finanzas">Finanzas</option>
            <option value="jefe_obra">Jefe de Obra</option>
            <option value="operador">Operador</option>
          </select>
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-medium rounded-lg px-4 py-2 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSubmitting ? 'Registrando...' : 'Agregar Usuario'}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-base font-semibold">Usuarios Registrados</h2>
          <button onClick={cargarUsuarios} className="text-xs text-amber-600 hover:underline font-medium cursor-pointer">Actualizar</button>
        </div>

        {error && <div className="p-4 bg-red-50 text-red-600 text-sm text-center">{error}</div>}

        <div className="divide-y divide-slate-100">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-amber-500" /> Leyendo usuarios...
            </div>
          ) : usuarios.length > 0 ? (
            usuarios.map((u, index) => (
              <div key={u.id || index} className="p-4 flex items-center justify-between hover:bg-slate-50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">
                    {u.nombre ? u.nombre.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 text-sm">{u.nombre}</h4>
                    <p className="text-xs text-slate-500 flex items-center gap-1"><Mail className="w-3 h-3" /> {u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700 flex items-center gap-1">
                    <Shield className="w-3 h-3" /> {String(u.role || 'operador').toUpperCase()}
                  </span>
                  <button onClick={() => handleDarDeBaja(u.id, u.nombre)} className="text-xs text-red-500 hover:text-red-700 bg-red-50 px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer">
                    <UserX className="w-4 h-4" /> Dar de baja
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-slate-500 text-sm">No hay usuarios registrados.</div>
          )}
        </div>
      </div>
    </div>
  );
}