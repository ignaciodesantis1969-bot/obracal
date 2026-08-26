import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Search, Loader2, Eye, X, RefreshCw, FileText, CheckCircle2, Archive, Clock } from 'lucide-react';

export default function Presupuestos() {
  const [presupuestos, setPresupuestos] = useState([]);
  const [obras, setObras] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [insumosActuales, setInsumosActuales] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Vistas de Pestañas: 'workspace' (Borrador + Entregado) | 'aprobados' (Aprobado) | 'archivados' (Rechazado + Versiones viejas)
  const [activeTab, setActiveTab] = useState('workspace');

  const [nuevoPresupuesto, setNuevoPresupuesto] = useState({
    codigo: '',
    nombre: '',
    obra_id: '',
    coeficiente_pase: 1.30,
    estado_presupuesto: 'borrador',
    version: 'v1'
  });

  const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzvnfSYgSqwv9pwMH1GQ-WUAzTTsX2yC1My4ebEVjKaQMvrPU3FC6UBHunEiULNV8cJfQ/exec";

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, { 
        method: 'POST', 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
        body: JSON.stringify({ action: 'cargarDetalleCompleto' }) 
      });

      const data = await response.json();

      setPresupuestos(Array.isArray(data.presupuestos) ? data.presupuestos : []);
      setObras(Array.isArray(data.obras) ? data.obras : []);
      setClientes(Array.isArray(data.clientes) ? data.clientes : []);
      setInsumosActuales(Array.isArray(data.insumos) ? data.insumos : []);
    } catch (err) {
      console.error("Error al cargar presupuestos:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const generarCodigoPresupuestoAutomatico = (obraIdSeleccionada) => {
    if (!obraIdSeleccionada) return '';

    const obraEncontrada = obras.find(o => String(o.id) === String(obraIdSeleccionada));
    if (!obraEncontrada) return 'PR001';

    const clienteEncontrado = clientes.find(c => String(c.id) === String(obraEncontrada.cliente_id));
    const codigoCliente = clienteEncontrado && clienteEncontrado.codigo ? clienteEncontrado.codigo : 'CL00X';
    
    let codigoObra = obraEncontrada.codigo || 'OB001';
    if (codigoObra.includes('-')) {
      codigoObra = codigoObra.split('-').pop();
    }

    let maxNum = 0;
    presupuestos.forEach(p => {
      const cod = String(p.codigo || '');
      if (cod.includes('PR')) {
        const partes = cod.split('PR');
        const numParte = parseInt(partes[partes.length - 1], 10);
        if (!isNaN(numParte) && numParte > maxNum) {
          maxNum = numParte;
        }
      }
    });

    const siguienteNum = maxNum + 1;
    const codigoPresupuesto = `PR${String(siguienteNum).padStart(3, '0')}`;

    return `${codigoCliente}-${codigoObra}-${codigoPresupuesto}`;
  };

  const handleObraChange = (e) => {
    const nuevaObraId = e.target.value;
    const codigoGenerado = generarCodigoPresupuestoAutomatico(nuevaObraId);

    setNuevoPresupuesto({
      ...nuevoPresupuesto,
      obra_id: nuevaObraId,
      codigo: codigoGenerado
    });
  };

  const handleCrear = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          tabla: 'Presupuestos',
          action: 'create',
          data: {
            ...nuevoPresupuesto,
            version: 'v1',
            estado_presupuesto: 'borrador',
            items_detalle: JSON.stringify([{ rubro: 'RUBRO GENERAL / PRINCIPAL', tareas: [] }])
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        setNuevoPresupuesto({ codigo: '', nombre: '', obra_id: '', coeficiente_pase: 1.30, estado_presupuesto: 'borrador', version: 'v1' });
        fetchData();
      } else {
        alert("Error al crear presupuesto: " + (data.error || ''));
      }
    } catch (err) {
      console.error("Error:", err);
      alert("Error de conexión al crear.");
    }
  };

  const handleCambiarEstado = async (id, nuevoEstado) => {
    const p = presupuestos.find(presu => String(presu.id) === String(id));
    const estadoActual = String(p?.estado_presupuesto || p?.estado || 'borrador').toLowerCase();

    if (estadoActual === 'entregado' || estadoActual === 'aprobado' || estadoActual === 'rechazado') {
      alert(`⚠️ Este presupuesto está en estado '${estadoActual}' y no puede cambiar su estado directamente.`);
      return;
    }

    try {
      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          tabla: 'Presupuestos',
          action: 'update',
          id: id,
          data: { estado_presupuesto: nuevoEstado }
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        alert("Error al actualizar estado: " + (data.error || ''));
      }
    } catch (err) {
      console.error("Error al cambiar estado:", err);
      alert("Error de conexión al cambiar el estado.");
    }
  };

  const handleActualizarPresupuestoVersion = async (presupuestoActual) => {
    if (!window.confirm(`¿Desea actualizar los precios de este presupuesto y generar una nueva versión basada en los costos actuales de los insumos?`)) return;

    try {
      let versionActualStr = String(presupuestoActual.version || '').toLowerCase();
      if (!versionActualStr || versionActualStr === 'undefined') {
        const matchNombre = (presupuestoActual.nombre || '').match(/\(v(\d+)\)/i);
        versionActualStr = matchNombre ? `v${matchNombre[1]}` : 'v1';
      }
      
      const numVersionMatch = versionActualStr.replace('v', '');
      const siguienteNumVersion = (parseInt(numVersionMatch, 10) || 1) + 1;
      const nuevaVersionStr = `v${siguienteNumVersion}`;

      let itemsDetalleParseado = [];
      try {
        itemsDetalleParseado = typeof presupuestoActual.items_detalle === 'string' 
          ? JSON.parse(presupuestoActual.items_detalle) 
          : (presupuestoActual.items_detalle || []);
      } catch (err) {
        itemsDetalleParseado = [];
      }

      let nuevoCostoDirecto = 0;

      const itemsActualizados = itemsDetalleParseado.map(rubro => {
        const tareasActualizadas = (rubro.tareas || []).map(tarea => {
          let costoUnitarioTarea = 0;
          
          let insumosAsociadosActualizados = (tarea.insumos_asociados || []).map(ins => {
            const insumoReal = insumosActuales.find(i => 
              String(i.id) === String(ins.id) || 
              String(i.nombre || '').trim().toLowerCase() === String(ins.nombre || '').trim().toLowerCase()
            );

            const precioVigente = insumoReal ? Number(insumoReal.costo_unitario || insumoReal.precio || 0) : Number(ins.costo_unitario || ins.precio || 0);
            const cantidadInsumo = Number(ins.cantidad) || 0;
            
            costoUnitarioTarea += (cantidadInsumo * precioVigente);

            return {
              ...ins,
              costo_unitario: precioVigente,
              precio: precioVigente
            };
          });

          if (insumosAsociadosActualizados.length === 0 && tarea.costo_unitario) {
            costoUnitarioTarea = Number(tarea.costo_unitario) || 0;
          }

          const cantidadMetrado = Number(tarea.cantidad_metrado || tarea.cantidad || 1);
          const costoTotalTarea = costoUnitarioTarea * cantidadMetrado;
          nuevoCostoDirecto += costoTotalTarea;

          return {
            ...tarea,
            costo_unitario: costoUnitarioTarea,
            costo_total: costoTotalTarea,
            insumos_asociados: insumosAsociadosActualizados
          };
        });

        return {
          ...rubro,
          tareas: tareasActualizadas
        };
      });

      const coeficientePase = Number(presupuestoActual.coeficiente_pase || 1.30);
      const nuevoPrecioVenta = nuevoCostoDirecto * coeficientePase;

      const nombreBaseLimPIO = (presupuestoActual.nombre || '').replace(/\s*\(v\d+\)\s*$/i, '').trim();
      const nombreNuevaVersion = `${nombreBaseLimPIO} (${nuevaVersionStr})`;

      const datosNuevaVersion = {
        codigo: presupuestoActual.codigo,
        nombre: nombreNuevaVersion,
        obra_id: presupuestoActual.obra_id,
        coeficiente_pase: coeficientePase,
        estado_presupuesto: 'borrador', 
        version: nuevaVersionStr,
        costo_directo: nuevoCostoDirecto,
        precio_venta: nuevoPrecioVenta,
        items_detalle: JSON.stringify(itemsActualizados)
      };

      const res = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          tabla: 'Presupuestos',
          action: 'create',
          data: datosNuevaVersion
        })
      });

      const data = await res.json();
      if (data.success) {
        alert(`¡Se ha generado la versión ${nuevaVersionStr} exitosamente con los precios actualizados!`);
        fetchData();
      } else {
        alert("Error al generar la nueva versión: " + (data.error || ''));
      }
    } catch (err) {
      console.error("Error al actualizar versión del presupuesto:", err);
      alert("Ocurrió un error al procesar la actualización.");
    }
  };

  const handleEliminar = async (id, estadoActual) => {
    const est = String(estadoActual || '').toLowerCase();
    if (est === 'aprobado' || est === 'entregado') {
      alert(`⚠️ Este presupuesto se encuentra en estado '${est}' y no puede ser modificado ni eliminado.`);
      return;
    }

    if (!window.confirm("¿Estás seguro de eliminar este presupuesto?")) return;
    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ tabla: 'Presupuestos', action: 'delete', id })
      });
      fetchData();
    } catch (err) {
      console.error("Error al eliminar:", err);
    }
  };

  // Conteo para los Cuadros Superiores (KPIs)
  const totalBorrador = presupuestos.filter(p => String(p.estado_presupuesto || p.estado || '').toLowerCase() === 'borrador').length;
  const totalEntregado = presupuestos.filter(p => String(p.estado_presupuesto || p.estado || '').toLowerCase() === 'entregado').length;
  const totalAprobado = presupuestos.filter(p => String(p.estado_presupuesto || p.estado || '').toLowerCase() === 'aprobado').length;
  const totalRechazado = presupuestos.filter(p => String(p.estado_presupuesto || p.estado || '').toLowerCase() === 'rechazado').length;

  // Filtrado de acuerdo a las 3 pestañas solicitadas
  const presupuestosFiltradosPorTab = presupuestos.filter(p => {
    const est = String(p.estado_presupuesto || p.estado || 'borrador').toLowerCase();
    
    if (activeTab === 'workspace') {
      return est === 'borrador' || est === 'entregado' || est === 'en revision';
    } else if (activeTab === 'aprobados') {
      return est === 'aprobado';
    } else if (activeTab === 'archivados') {
      return est === 'rechazado';
    }
    return true;
  });

  const presupuestosFinales = presupuestosFiltradosPorTab.filter(p => 
    String(p.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(p.codigo || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return <div className="p-20 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-amber-500" /> <span className="text-sm text-slate-500 font-medium">Cargando presupuestos...</span></div>;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Cabecera Principal */}
      <div className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Presupuestos de Obra</h1>
          <p className="text-slate-500 text-sm mt-1">Gestión integral, cómputo de costos, control de versiones y precios de venta.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium text-sm transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Nuevo Presupuesto
        </button>
      </div>

      {/* Cuadros Superiores - Estilo Insumos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase">Borrador</p>
          <h3 className="text-2xl font-black text-slate-800 mt-1">{totalBorrador}</h3>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase">Entregado</p>
          <h3 className="text-2xl font-black text-purple-600 mt-1">{totalEntregado}</h3>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase">Aprobados</p>
          <h3 className="text-2xl font-black text-emerald-600 mt-1">{totalAprobado}</h3>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase">Rechazados</p>
          <h3 className="text-2xl font-black text-red-600 mt-1">{totalRechazado}</h3>
        </div>
      </div>

      {/* Barra de Búsqueda y Pestañas / Botones Inferiores */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-300 shadow-sm">
        {/* Botones de Navegación solicitados */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('workspace')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'workspace' 
                ? 'bg-amber-500 text-white shadow-sm' 
                : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Espacio de Trabajo (Borrador / Entregado)
          </button>
          <button
            onClick={() => setActiveTab('aprobados')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'aprobados' 
                ? 'bg-amber-500 text-white shadow-sm' 
                : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Aprobados
          </button>
          <button
            onClick={() => setActiveTab('archivados')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'archivados' 
                ? 'bg-amber-500 text-white shadow-sm' 
                : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Archivados / Rechazados
          </button>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Buscar presupuesto..."
            className="w-full bg-transparent outline-none text-xs text-slate-800 placeholder:text-slate-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden">
        {presupuestosFinales.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No se encontraron presupuestos en esta sección.</div>
        ) : (
          <table className="w-full text-left text-xs table-fixed">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="w-[12%] px-6 py-4">Código</th>
                <th className="w-[24%] px-4 py-4">Nombre del Presupuesto</th>
                <th className="w-[7%] px-2 py-4 text-center">Versión</th>
                <th className="w-[20%] px-4 py-4">Obra Asociada</th>
                <th className="w-[14%] px-4 py-4 text-right">Costo Directo</th>
                <th className="w-[14%] px-4 py-4 text-right">Precio Venta</th>
                <th className="w-[10%] px-2 py-4 text-center">Estado</th>
                <th className="w-[9%] px-2 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {presupuestosFinales.map(p => {
                const obraAsociada = obras.find(o => String(o.id) === String(p.obra_id));
                const costoDir = Math.round(Number(p.costo_directo) || 0);
                const precioVta = Math.round(Number(p.precio_venta) || 0);
                
                let versionVisual = p.version;
                if (!versionVisual || versionVisual === 'undefined') {
                  const match = (p.nombre || '').match(/\(v(\d+)\)/i);
                  versionVisual = match ? `v${match[1]}` : 'v1';
                }

                const estadoActual = String(p.estado_presupuesto || p.estado || 'borrador').toLowerCase();

                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="w-[12%] px-6 py-4 font-bold text-blue-600 truncate">{p.codigo || '---'}</td>
                    <td className="w-[24%] px-4 py-4 font-semibold text-slate-800 truncate" title={p.nombre}>{p.nombre || 'Sin nombre'}</td>
                    <td className="w-[7%] px-2 py-4 text-center">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md font-extrabold text-[11px] uppercase">
                        {versionVisual}
                      </span>
                    </td>
                    <td className="w-[20%] px-4 py-4 text-slate-600 truncate" title={obraAsociada?.nombre || obraAsociada?.nombre_obra || 'Sin obra asignada'}>
                      {obraAsociada?.nombre || obraAsociada?.nombre_obra || 'Sin obra asignada'}
                    </td>
                    <td className="w-[14%] px-4 py-4 text-right font-medium text-slate-700 whitespace-nowrap">$ {costoDir.toLocaleString('es-AR')}</td>
                    <td className="w-[14%] px-4 py-4 text-right font-black text-amber-600 whitespace-nowrap">$ {precioVta.toLocaleString('es-AR')}</td>
                    <td className="w-[10%] px-2 py-4 text-center">
                      <select
                        value={estadoActual}
                        disabled={estadoActual === 'entregado' || estadoActual === 'aprobado' || estadoActual === 'rechazado'}
                        onChange={(e) => handleCambiarEstado(p.id, e.target.value)}
                        className={`w-full px-2 py-1 rounded-full font-bold text-[10px] uppercase border outline-none transition-colors ${
                          estadoActual === 'entregado' 
                            ? 'bg-purple-100 text-purple-800 border-purple-300 cursor-not-allowed opacity-75' 
                            : estadoActual === 'aprobado' 
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300 cursor-not-allowed opacity-75'
                            : estadoActual === 'rechazado'
                            ? 'bg-red-100 text-red-800 border-red-300 cursor-not-allowed opacity-75'
                            : 'bg-slate-100 text-slate-700 border-slate-300 cursor-pointer'
                        }`}
                        title={estadoActual !== 'borrador' ? "Estado bloqueado por regla de negocio" : "Cambiar estado"}
                      >
                        <option value="borrador">Borrador</option>
                        <option value="entregado">Entregado</option>
                        <option value="aprobado">Aprobado</option>
                        <option value="rechazado">Rechazado</option>
                      </select>
                    </td>
                    <td className="w-[9%] px-2 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleActualizarPresupuestoVersion(p)}
                          className="p-1.5 text-slate-600 hover:text-blue-600 bg-white border border-slate-200 hover:border-blue-300 rounded-lg shadow-sm transition-all flex items-center justify-center"
                          title="Actualizar Precios y Generar Nueva Versión"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <Link 
                          to={`/presupuestos/${p.id}`}
                          className="p-1.5 text-slate-600 hover:text-amber-600 bg-white border border-slate-200 hover:border-amber-300 rounded-lg shadow-sm transition-all flex items-center justify-center"
                          title="Ver Detalle del Presupuesto"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                        <button 
                          onClick={() => handleEliminar(p.id, p.estado_presupuesto || p.estado)}
                          className={`p-1.5 bg-white border rounded-lg shadow-sm transition-all ${
                            estadoActual === 'aprobado' || estadoActual === 'entregado'
                              ? 'text-slate-300 border-slate-100 cursor-not-allowed' 
                              : 'text-slate-400 hover:text-red-600 border-slate-200 hover:border-red-300'
                          }`}
                          title={estadoActual === 'aprobado' || estadoActual === 'entregado' ? "Bloqueado" : "Eliminar Presupuesto"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b bg-slate-50">
              <h3 className="font-bold text-slate-900">Nuevo Presupuesto</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleCrear} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Obra Asociada *</label>
                <select 
                  required
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 font-semibold"
                  value={nuevoPresupuesto.obra_id}
                  onChange={handleObraChange}
                >
                  <option value="">Seleccione una obra...</option>
                  {obras.map(o => (
                    <option key={o.id} value={o.id}>{o.nombre || o.nombre_obra}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Código del Presupuesto (Automático)</label>
                <input 
                  type="text"
                  required
                  readOnly
                  placeholder="Se autogenera al seleccionar obra"
                  className="w-full bg-slate-100 border border-slate-300 text-blue-600 rounded-lg px-3 py-2 text-sm outline-none font-bold cursor-not-allowed"
                  value={nuevoPresupuesto.codigo}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre del Presupuesto *</label>
                <input 
                  type="text"
                  required
                  placeholder="Ej: Ampliación Edificio Central"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 font-semibold"
                  value={nuevoPresupuesto.nombre}
                  onChange={(e) => setNuevoPresupuesto({...nuevoPresupuesto, nombre: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Coeficiente de Pase</label>
                <input 
                  type="number"
                  step="0.0001"
                  required
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 font-bold text-amber-600"
                  value={nuevoPresupuesto.coeficiente_pase}
                  onChange={(e) => setNuevoPresupuesto({...nuevoPresupuesto, coeficiente_pase: e.target.value})}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-slate-600">Cancelar</button>
                <button type="submit" className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-semibold">Crear Presupuesto</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}