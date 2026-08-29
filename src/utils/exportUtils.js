import * as XLSXModule from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
    const pageWidth = doc.internal.pageSize.getWidth();

    // 1 & 2) Encabezado superior con Código, Versión, Título, Fecha y Logo SICE SA
    doc.setFillColor(254, 243, 199); // Fondo color ámbar suave para el código
    doc.roundedRect(14, 14, 38, 7, 1, 1, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(180, 83, 9);
    doc.text(presupuesto?.codigo || 'CL004-OB002', 17, 19);

    doc.setFillColor(239, 246, 255); // Fondo azul versión
    doc.roundedRect(55, 14, 12, 7, 1, 1, 'F');
    doc.setTextColor(29, 78, 216);
    doc.text(presupuesto?.version || 'V1', 58, 19);

    // Título Principal de la Cotización
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(presupuesto?.nombre || 'Cotización Obra', 72, 19);

    // Fecha en lugar de la leyenda "ENTREGADO" (con el mismo estilo de badge suave)
    const fechaTexto = presupuesto?.fecha || new Date().toLocaleDateString('es-AR');
    doc.setFillColor(241, 245, 249); // Fondo gris suave (estilo píldora estado)
    doc.roundedRect(pageWidth - 45, 13, 31, 8, 2, 2, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(fechaTexto, pageWidth - 40, 18.5);

    // Logo SICE SA en la esquina superior derecha (reemplazando botones)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text("SICE SA", pageWidth - 25, 28, { align: 'right' });

    // Línea de Obra y Cliente
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Obra: ${presupuesto?.obra_nombre || 'Ampliacion Sala de Cargas Baterias'}   •   Cliente: ${cliente?.razon_social || cliente?.nombre || 'LDC ARGENTINA S.A.'}`, 14, 28);

    // Línea divisoria decorativa
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, 34, pageWidth - 14, 34);

    // 3) Tabla de Ítems (Sin recuadros de totales superiores ni solapas)
    const tableColumn = ["Descripción del Ítem", "Cant.", "P. Unitario", "Subtotal"];
    const tableRows = (items || []).map(item => [
      item.descripcion || '---',
      item.cantidad || 0,
      `$ ${Number(item.precio_unitario || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
      `$ ${Number(item.subtotal || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
    ]);

    autoTable(doc, {
      startY: 40,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 8.5, textColor: [51, 65, 85] },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 15, halign: 'center' },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 35, halign: 'right' }
      },
      styles: { cellPadding: 4 }
    });

    const finalY = doc.lastAutoTable.finalY ? doc.lastAutoTable.finalY + 12 : 50;
    const totalGeneral = (items || []).reduce((acc, curr) => acc + Number(curr.subtotal || 0), 0);

    // 4) Total General al final y espacio preparado para Notas
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(
      `TOTAL GENERAL: $ ${Number(presupuesto?.total || totalGeneral || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, 
      pageWidth - 14, 
      finalY,
      { align: 'right' }
    );

    // Espacio reservado para las notas (preparado para cuando me las envíes)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text("Notas y Condiciones:", 14, finalY + 15);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("• (Aquí se agregarán tus notas redactadas próximamente)", 14, finalY + 22);

    doc.save(`Presupuesto_${presupuesto?.codigo || 'Detalle'}.pdf`);
  } catch (error) {
    console.error("Error al exportar PDF:", error);
    alert("No se pudo generar el archivo PDF. Revisa la consola para más detalles.");
  }
};