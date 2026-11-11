import { useState, useRef } from 'react';
import { auth } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const APPS_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL;

export default function FacturaUploadReader({ onDataExtracted }) {
  const [step, setStep] = useState('idle'); // idle | uploading | reading | done | error
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef(null);

  const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setStep('uploading');

    try {
      const token = await auth.currentUser?.getIdToken(true);
      const base64Data = await toBase64(file);

      // 1. Subir archivo a Drive
      const resUpload = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'subirArchivoDrive',
          base64: base64Data,
          tabla: 'facturas_compras',
          idToken: token
        })
      });

      const jsonUpload = await resUpload.json();
      if (!jsonUpload.success) throw new Error(jsonUpload.error || 'Error al subir archivo');
      const fileUrl = jsonUpload.archivo_url;

      setStep('reading');

      // 2. Extraer datos con IA
      const resIA = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'procesarFacturaConAI',
          base64: base64Data,
          mimeType: file.type || 'application/pdf',
          idToken: token
        })
      });

      const jsonIA = await resIA.json();
      
      setStep('done');
      // El backend devuelve los datos directo en la raíz del json (success: true, ...parsedData)
      onDataExtracted(jsonIA.success ? jsonIA : {}, fileUrl);
      toast.success('Datos leídos correctamente del comprobante');
    } catch (error) {
      console.error(error);
      setStep('error');
      toast.error('Error al procesar la factura');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // (El JSX se mantiene exactamente igual al que te pasé antes)
  return (
    <div className="col-span-2">
      <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFile} />
      {step === 'idle' && (
        <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-amber-300 bg-amber-50 rounded-xl p-6 text-center cursor-pointer hover:bg-amber-100 transition-colors">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Upload className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-amber-700">Subí la foto o PDF de la factura</p>
          <p className="text-xs text-amber-500 mt-1">El sistema leerá automáticamente los datos del comprobante</p>
        </div>
      )}
      {(step === 'uploading' || step === 'reading') && (
        <div className="border-2 border-dashed border-blue-200 bg-blue-50 rounded-xl p-6 text-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
          <p className="text-sm font-medium text-blue-700">
            {step === 'uploading' ? 'Subiendo archivo...' : 'Leyendo datos de la factura con IA...'}
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
          <Button size="sm" variant="outline" className="text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-100" onClick={() => { setStep('idle'); setFileName(''); }}>Cambiar</Button>
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