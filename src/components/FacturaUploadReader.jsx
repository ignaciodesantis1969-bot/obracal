import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Image, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Componente que sube una imagen/PDF de factura, la procesa con IA
 * y devuelve los datos extraídos para prellenar el formulario.
 * 
 * Props:
 *   onDataExtracted(data, fileUrl): callback con datos extraídos y URL del archivo
 */
export default function FacturaUploadReader({ onDataExtracted }) {
  const [step, setStep] = useState('idle'); // idle | uploading | reading | done | error
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setStep('uploading');

    // 1. Subir archivo
    let fileUrl;
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      fileUrl = res.file_url;
    } catch {
      setStep('error');
      toast.error('Error al subir el archivo');
      return;
    }

    setStep('reading');

    // 2. Extraer datos con IA
    try {
      const prompt = `Eres un asistente especializado en facturas argentinas de construcción.
Analiza esta imagen/documento de factura y extrae TODOS los datos que puedas identificar.
Devuelve SOLO el JSON con los campos que puedas leer claramente. Si no podés leer un campo con certeza, no lo incluyas.

Campos a extraer:
- numero_factura: string (ej: "0001-00012345")
- tipo_comprobante: string, solo uno de: "A", "B", "C", "M", "X"
- fecha: string formato YYYY-MM-DD
- fecha_vencimiento: string formato YYYY-MM-DD (si aparece)
- proveedor_nombre: string (razón social del emisor)
- proveedor_cuit: string
- subtotal: number (neto gravado, sin IVA)
- iva_21: number (monto de IVA al 21%)
- iva_10_5: number (monto de IVA al 10.5%)
- total: number (total de la factura)
- items: array de objetos con { descripcion: string, cantidad: number, unidad: string, precio_unitario: number, precio_total: number }
- notas: string (observaciones adicionales si las hay)`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: [fileUrl],
        response_json_schema: {
          type: 'object',
          properties: {
            numero_factura: { type: 'string' },
            tipo_comprobante: { type: 'string' },
            fecha: { type: 'string' },
            fecha_vencimiento: { type: 'string' },
            proveedor_nombre: { type: 'string' },
            proveedor_cuit: { type: 'string' },
            subtotal: { type: 'number' },
            iva_21: { type: 'number' },
            iva_10_5: { type: 'number' },
            total: { type: 'number' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  descripcion: { type: 'string' },
                  cantidad: { type: 'number' },
                  unidad: { type: 'string' },
                  precio_unitario: { type: 'number' },
                  precio_total: { type: 'number' }
                }
              }
            },
            notas: { type: 'string' }
          }
        }
      });

      setStep('done');
      onDataExtracted(result, fileUrl);
      toast.success('Datos leídos correctamente del comprobante');
    } catch {
      setStep('done'); // igual pasamos con el archivo subido
      onDataExtracted({}, fileUrl);
      toast.warning('No se pudieron leer todos los datos. Completá manualmente.');
    }

    // Reset input para permitir volver a subir el mismo archivo
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="col-span-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={handleFile}
      />

      {step === 'idle' && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-amber-300 bg-amber-50 rounded-xl p-6 text-center cursor-pointer hover:bg-amber-100 transition-colors"
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Upload className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-amber-700">Subí la foto o PDF de la factura</p>
          <p className="text-xs text-amber-500 mt-1">El sistema leerá automáticamente los datos del comprobante</p>
          <p className="text-xs text-slate-400 mt-2">Formatos: JPG, PNG, PDF</p>
        </div>
      )}

      {(step === 'uploading' || step === 'reading') && (
        <div className="border-2 border-dashed border-blue-200 bg-blue-50 rounded-xl p-6 text-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
          <p className="text-sm font-medium text-blue-700">
            {step === 'uploading' ? 'Subiendo archivo...' : 'Leyendo datos de la factura con IA...'}
          </p>
          <p className="text-xs text-blue-400 mt-1">
            {step === 'reading' ? 'Esto puede demorar unos segundos' : 'Por favor esperá'}
          </p>
        </div>
      )}

      {step === 'done' && (
        <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="text-sm font-medium text-emerald-700">Comprobante procesado</p>
              <p className="text-xs text-emerald-500 truncate max-w-xs">{fileName}</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-100"
            onClick={() => { setStep('idle'); setFileName(''); }}
          >
            Cambiar
          </Button>
        </div>
      )}

      {step === 'error' && (
        <div className="border border-red-200 bg-red-50 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-sm text-red-600">Error al procesar. Intentá nuevamente.</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setStep('idle')}>Reintentar</Button>
        </div>
      )}
    </div>
  );
}