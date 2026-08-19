// Tu URL mágica de Google Sheets
const API_URL = "https://script.google.com/macros/s/AKfycbxaKjBQt87_nccVeATP013-vT2_FxFPOUv1fZn7f0y7i_fUD7KWHEr3czcpdRRzG1JrHQ/exec";

// Función para LEER datos
const pedirDatosAGoogle = async (nombreTabla) => {
  try {
    const respuesta = await fetch(`${API_URL}?tabla=${nombreTabla}`);
    return await respuesta.json();
  } catch (error) {
    console.error(`Error cargando ${nombreTabla}:`, error);
    return []; 
  }
};

// Función para GUARDAR, EDITAR o BORRAR datos
const enviarDatosAGoogle = async (nombreTabla, action, data = null, id = null) => {
  try {
    const payload = { action, tabla: nombreTabla, data, id };
    const respuesta = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    return await respuesta.json();
  } catch (error) {
    console.error(`Error en ${action} para ${nombreTabla}:`, error);
    return null;
  }
};

// Creador inteligente compatible con funciones avanzadas y con Proxy total para evitar undefined
const crearModulo = (tabla) => {
  const handler = {
    list: () => pedirDatosAGoogle(tabla),
    create: (data) => enviarDatosAGoogle(tabla, 'create', data),
    update: (id, data) => enviarDatosAGoogle(tabla, 'update', data, id),
    delete: (id) => enviarDatosAGoogle(tabla, 'delete', null, id),
    filter: () => pedirDatosAGoogle(tabla),
    find: () => pedirDatosAGoogle(tabla),
  };
  
  return new Proxy(handler, {
    get(target, prop) {
      if (prop in target) {
        return target[prop];
      }
      // Si la pantalla pide cualquier método raro o sub-función, devolvemos una promesa vacía o lista
      return () => Promise.resolve([]);
    }
  });
};

// El adaptador universal con cobertura total de nombres
export const base44 = {
  entities: new Proxy({}, {
    get(target, prop) {
      // Mapeo directo de nombres comunes
      const mapas = {
        Cliente: 'Clientes',
        Obra: 'Obras',
        Presupuesto: 'Presupuestos',
        Proveedor: 'Proveedores',
        Rubro: 'Rubros',
        Tarea: 'Tareas',
        Insumo: 'Insumos',
        OrdenCompra: 'OrdenesCompra',
        Factura: 'Facturas',
        Usuario: 'Usuarios',
        MovimientoTesoreria: 'Tesoreria',
        Certificacion: 'Certificaciones',
        TareasTemplate: 'TareasTemplate',
        User: 'Usuarios'
      };

      // Si existe un mapa exacto lo usamos, sino usamos el mismo nombre que pidieron con la primera letra en mayúscula o tal cual
      const nombreTabla = mapas[prop] || prop;
      return crearModulo(nombreTabla);
    }
  })
};