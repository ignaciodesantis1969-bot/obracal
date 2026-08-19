import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle, Download } from 'lucide-react';
import { toast } from 'sonner';

// Parsea Excel via InvokeLLM para máxima compatibilidad
export default function ImportarInsumosExcel({ proveedores, onImportado }) {
  const [open, setOpen] = useState(false);
  const [fase, setFase] = useState('idle'); // idle | uploading | preview | importing | done
  const [archivo, setArchivo] = useState(null);
  const [filas, setFilas] = useState([]);
  const [errores, setErrores] = useState([]);
  const [importados, setImportados] = useState(0);
  const inputRef = useRef();

  const handleFile = async (file) => {
    if (!file) return;
    setArchivo(file);
    setFase('uploading');
    setErrores([]);
    setFilas([]);

    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    setFase('uploading');
    const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: 'object',
        properties: {
          insumos: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                nombre: { type: 'string' },
                tipo: { type: 'string', description: 'material | mano_de_obra | equipo | subcontrato' },
                proveedor_nombre: { type: 'string' },
                unidad_medida: { type: 'string' },
                unidad_comercial: { type: 'string' },
                unidad_calculo: { type: 'string' },
                costo_unitario: { type: 'number' },
                descripcion: { type: 'string' }
              }
            }
          }
        }
      }
    });

    const rawFilas = result?.insumos || [];
    const TIPOS_VALIDOS = ['material', 'mano_de_obra', 'equipo', 'subcontrato'];

    const filasConValidacion = rawFilas.map((f, idx) => {
      const errs = [];
      if (!f.nombre?.trim()) errs.push('Falta nombre');
      if (!TIPOS_VALIDOS.includes(f.tipo)) errs.push(`Tipo inválido: "${f.tipo}"`);
      const prov = proveedores.find(p =>
        p.razon_social?.toLowerCase() === f.proveedor_nombre?.toLowerCase() ||
        p.codigo?.toLowerCase() === f.proveedor_nombre?.toLowerCase()
      );
      if (!prov) errs.push(`Proveedor no encontrado: "${f.proveedor_nombre}"`);
      return { ...f, _idx: idx, _proveedor: prov, _errores: errs, _ok: errs.length === 0 };
    });

    setFilas(filasConValidacion);
    setFase('preview');
  };

  const handleImport = async () => {
    setFase('importing');
    let ok = 0;

    const insumosExistentes = await base44.entities.Insumo.list();

    for (const fila of filas) {
      if (!fila._ok) continue;
      const prov = fila._proveedor;
      // Generar código
      const delProv = insumosExistentes.filter(i => i.proveedor_id === prov.id);
      const nums = delProv.map(i => parseInt(i.codigo?.split('-INS')[1] || '0')).filter(n => !isNaN(n));
      const max = nums.length > 0 ? Math.max(...nums) : 0;
      const codigo = `${prov.codigo}-INS${String(max + 1 + ok).padStart(3, '0')}`;

      await base44.entities.Insumo.create({
        nombre: fila.nombre,
        tipo: fila.tipo,
        proveedor_id: prov.id,
        proveedor_codigo: prov.codigo,
        proveedor_nombre: prov.razon_social,
        unidad_medida: fila.unidad_medida || '',
        unidad_comercial: fila.unidad_comercial || '',
        unidad_calculo: fila.unidad_calculo || '',
        costo_unitario: parseFloat(fila.costo_unitario) || 0,
        descripcion: fila.descripcion || '',
        estado: 'activo',
        codigo
      });
      ok++;
    }

    setImportados(ok);
    setFase('done');
    toast.success(`${ok} insumos importados correctamente`);
    onImportado?.();
  };

  const reset = () => {
    setFase('idle');
    setArchivo(null);
    setFilas([]);
    setErrores([]);
    setImportados(0);
  };

  const okCount = filas.filter(f => f._ok).length;
  const errorCount = filas.filter(f => !f._ok).length;

  return (
    <>
      <Button variant="outline" onClick={() => { reset(); setOpen(true); }} className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50">
        <FileSpreadsheet className="w-4 h-4" /> Importar Excel
      </Button>

      <Dialog open={open} onOpenChange={v => { if (!v) reset(); setOpen(v); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-amber-500" />
              Importar Insumos desde Excel
            </DialogTitle>
          </DialogHeader>

          {fase === 'idle' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                <p className="font-semibold mb-1">Formato esperado del archivo Excel:</p>
                <p>El archivo debe tener columnas: <strong>nombre, tipo, proveedor_nombre, unidad_medida, costo_unitario</strong></p>
                <p className="mt-1">Tipos válidos: <code>material</code>, <code>mano_de_obra</code>, <code>equipo</code>, <code>subcontrato</code></p>
                <p className="mt-1">El proveedor debe coincidir con los proveedores ya cargados en el sistema.</p>
              </div>

              <div
                onClick={() => inputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer hover:border-amber-400 hover:bg-amber-50 transition-colors"
              >
                <Upload className="w-10 h-10 text-slate-400" />
                <p className="text-slate-600 font-medium">Hacé clic para seleccionar un archivo</p>
                <p className="text-slate-400 text-sm">Excel (.xlsx, .xls) o CSV</p>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={e => handleFile(e.target.files[0])}
                />
              </div>
            </div>
          )}

          {(fase === 'uploading') && (
            <div className="flex flex-col items-center gap-4 py-12">
              <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-600">Procesando archivo con IA...</p>
            </div>
          )}

          {fase === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="w-4 h-4" />{okCount} listos para importar</span>
                {errorCount > 0 && <span className="flex items-center gap-1 text-red-600"><XCircle className="w-4 h-4" />{errorCount} con errores (se omitirán)</span>}
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-80 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      {['Estado','Nombre','Tipo','Proveedor','Unidad','Costo'].map(h => (
                        <th key={h} className="text-left px-3 py-2 text-slate-600 font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filas.map((f, idx) => (
                      <tr key={idx} className={f._ok ? '' : 'bg-red-50'}>
                        <td className="px-3 py-2">
                          {f._ok
                            ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            : <span title={f._errores.join(', ')}><AlertTriangle className="w-4 h-4 text-red-500" /></span>
                          }
                        </td>
                        <td className="px-3 py-2 font-medium">{f.nombre || '—'}</td>
                        <td className="px-3 py-2">{f.tipo || '—'}</td>
                        <td className="px-3 py-2">{f._proveedor?.razon_social || <span className="text-red-500">{f.proveedor_nombre}</span>}</td>
                        <td className="px-3 py-2">{f.unidad_medida || '—'}</td>
                        <td className="px-3 py-2">{f.costo_unitario ? `$${f.costo_unitario}` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {errorCount > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 space-y-1">
                  <p className="font-semibold">Errores encontrados:</p>
                  {filas.filter(f => !f._ok).map((f, i) => (
                    <p key={i}>Fila {f._idx + 1} — {f._errores.join(' · ')}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {fase === 'importing' && (
            <div className="flex flex-col items-center gap-4 py-12">
              <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-600">Importando insumos...</p>
            </div>
          )}

          {fase === 'done' && (
            <div className="flex flex-col items-center gap-4 py-10">
              <CheckCircle2 className="w-14 h-14 text-emerald-500" />
              <p className="text-lg font-semibold text-slate-800">{importados} insumos importados</p>
              <Button onClick={() => { reset(); setOpen(false); }} className="bg-amber-500 hover:bg-amber-600 text-white">Cerrar</Button>
            </div>
          )}

          {fase === 'preview' && (
            <DialogFooter>
              <Button variant="outline" onClick={reset}>Cancelar</Button>
              <Button onClick={handleImport} disabled={okCount === 0} className="bg-amber-500 hover:bg-amber-600 text-white">
                Importar {okCount} insumo{okCount !== 1 ? 's' : ''}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}