import * as XLSXModule from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Solución de compatibilidad para empaquetadores modernos (Vite/Webpack)
const XLSX = XLSXModule.default || XLSXModule;

export const exportarPresupuestoExcel = (presupuesto, items) => {
  try {
    if (!items || items.length === 0) {
      alert("No hay ítems disponibles para exportar.");
      return;
    }

    const datosFormateados = items.map(item => ({
      Descripción: item.descripcion || '---',
      Cantidad: Number(item.cantidad || 0),
      'Precio Unitario': Number(item.precio_unitario || 0),
      Subtotal: Number(item.subtotal || 0)
    }));

    const worksheet = XLSX.utils.json_to_sheet(datosFormateados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Presupuesto");
    
    XLSX.writeFile(workbook, `Presupuesto_${presupuesto?.codigo || 'Detalle'}.xlsx`);
  } catch (error) {
    console.error("Error al exportar Excel:", error);
    alert("No se pudo generar el archivo Excel. Revisa la consola para más detalles.");
  }
};

export const exportarPresupuestoPDF = (presupuesto, cliente, items) => {
  try {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.text("PRESUPUESTO DE OBRA", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Comprobante N°: ${presupuesto?.codigo || 'N/A'}`, 14, 28);
    doc.text(`Cliente: ${cliente?.razon_social || cliente?.nombre || '---'}`, 14, 34);
    doc.text(`Fecha: ${presupuesto?.fecha || new Date().toLocaleDateString()}`, 14, 40);

    const tableColumn = ["Descripción", "Cant.", "P. Unitario", "Subtotal"];
    const tableRows = (items || []).map(item => [
      item.descripcion || '---',
      item.cantidad || 0,
      `$ ${Number(item.precio_unitario || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
      `$ ${Number(item.subtotal || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
    ]);

    doc.autoTable({
      startY: 48,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [245, 158, 11] },
      styles: { fontSize: 9, cellPadding: 4 }
    });

    const finalY = doc.lastAutoTable.finalY ? doc.lastAutoTable.finalY + 10 : 60;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    
    const totalGeneral = (items || []).reduce((acc, curr) => acc + Number(curr.subtotal || 0), 0);
    doc.text(
      `Total General: $ ${Number(presupuesto?.total || totalGeneral || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, 
      14, 
      finalY
    );

    doc.save(`Presupuesto_${presupuesto?.codigo || 'Detalle'}.pdf`);
  } catch (error) {
    console.error("Error al exportar PDF:", error);
    alert("No se pudo generar el archivo PDF. Revisa la consola para más detalles.");
  }
};