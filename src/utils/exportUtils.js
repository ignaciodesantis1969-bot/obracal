import * as XLSXModule from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const XLSX = XLSXModule.default || XLSXModule;

export const exportarPresupuestoExcel = (presupuesto, rubrosItems, esVenta = false, coeficiente = 1) => {
  try {
    if (!rubrosItems || rubrosItems.length === 0) {
      alert("No hay ítems disponibles para exportar.");
      return;
    }

    const datosExcel = [];

    // Encabezado superior idéntico al PDF
    datosExcel.push([presupuesto?.nombre || 'COTIZACIÓN DE OBRA', '', '', '', '']);
    datosExcel.push([`Código: ${presupuesto?.codigo || 'N/A'}`, '', '', `Fecha: ${presupuesto?.fecha || new Date().toLocaleDateString('es-AR')}`, '']);
    datosExcel.push([]); // Espacio en blanco

    let granTotal = 0;

    // Estructurar rubro por rubro exactamente igual al formato visual
    rubrosItems.forEach((rubroObj, index) => {
      const tareas = rubroObj.tareas || [];
      if (tareas.length === 0) return;

      // Fila título del rubro
      datosExcel.push([`N° ${index + 1} - ${rubroObj.rubro || 'RUBRO'}`, '', '', '', '']);
      
      // Cabecera de columnas de la tabla
      datosExcel.push(["Tareas", "Unidades", "Cantidad", "Precio Unitario", "Precio Total"]);

      let subtotalRubro = 0;

      tareas.forEach(t => {
        const cant = Number(t.cantidad || 0);
        const cUnit = Number(t.costo_unitario || 0);
        const pUnit = esVenta ? cUnit * coeficiente : cUnit;
        const subtotal = cant * pUnit;
        subtotalRubro += subtotal;

        datosExcel.push([
          t.tarea || '---',
          (t.unidad || 'GL').toUpperCase(),
          cant,
          pUnit,
          subtotal
        ]);
      });

      granTotal += subtotalRubro;

      // Subtotal del Rubro
      const labelSubtotal = esVenta ? "Subtotal Venta Rubro:" : "Subtotal Costo Rubro:";
      datosExcel.push(['', '', '', labelSubtotal, subtotalRubro]);
      datosExcel.push([]); // Línea en blanco separadora
    });

    // Fila de Total General al final
    datosExcel.push([]);
    datosExcel.push(['', '', '', 'TOTAL GENERAL:', granTotal]);

    const worksheet = XLSX.utils.aoa_to_sheet(datosExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, esVenta ? "Presupuesto Venta" : "Presupuesto Costos");
    
    const tipoSufijo = esVenta ? 'VENTA' : 'COSTOS';
    XLSX.writeFile(workbook, `Presupuesto_${presupuesto?.codigo || 'Detalle'}_${tipoSufijo}.xlsx`);
  } catch (error) {
    console.error("Error al exportar Excel:", error);
    alert("No se pudo generar el archivo Excel.");
  }
};

export const exportarPresupuestoPDF = async (presupuesto, cliente, rubrosItems, esVenta = false, coeficiente = 1) => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 14;

    // 1) Encabezado superior (Código de presupuesto y Título)
    doc.setFillColor(254, 243, 199);
    doc.roundedRect(14, currentY, 42, 7, 1, 1, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(180, 83, 9);
    doc.text(presupuesto?.codigo || 'CL004-OB002', 17, currentY + 5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(presupuesto?.nombre || 'Cotización Obra', 60, currentY + 5);

    // 2) Logo SICE S.A. desde la carpeta public (/logo-07.png)
    try {
      const response = await fetch('/logo-07.png');
      if (response.ok) {
        const blob = await response.blob();
        const reader = new FileReader();
        await new Promise((resolve) => {
          reader.onloadend = () => {
            doc.addImage(reader.result, 'PNG', pageWidth - 14 - 52, currentY - 1, 52, 18);
            resolve();
          };
          reader.readAsDataURL(blob);
        });
      }
    } catch (e) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(30, 41, 59);
      doc.text("SICE S.A.", pageWidth - 14, currentY + 12, { align: 'right' });
    }

    // 3) Línea de Obra y Cliente
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Obra: ${presupuesto?.obra_nombre || 'Ampliacion Sala de Cargas Baterias'}   •   Cliente: ${cliente?.razon_social || cliente?.nombre || 'LDC ARGENTINA S.A.'}`, 14, currentY + 12);

    // 4) Línea de Fecha con la etiqueta "Fecha:"
    const fechaTexto = presupuesto?.fecha || new Date().toLocaleDateString('es-AR');
    doc.text(`Fecha: ${fechaTexto}`, 14, currentY + 18);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, currentY + 23, pageWidth - 14, currentY + 23);

    currentY += 29;

    let granTotal = 0;

    // 5) Iteración rubro por rubro con diseño idéntico
    (rubrosItems || []).forEach((rubroObj, index) => {
      const tareas = rubroObj.tareas || [];
      if (tareas.length === 0) return;

      let subtotalRubro = 0;
      const tableRows = tareas.map(t => {
        const cant = Number(t.cantidad || 0);
        const cUnit = Number(t.costo_unitario || 0);
        const pUnit = esVenta ? cUnit * coeficiente : cUnit;
        const subtotal = cant * pUnit;
        subtotalRubro += subtotal;

        return [
          t.tarea || '---',
          (t.unidad || 'GL').toUpperCase(),
          cant,
          `$ ${pUnit.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          `$ ${subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        ];
      });

      granTotal += subtotalRubro;

      if (currentY > 260) {
        doc.addPage();
        currentY = 20;
      }

      // Tarjeta oscura redondeada para el título del rubro
      doc.setFillColor(30, 41, 59);
      doc.roundedRect(14, currentY, pageWidth - 28, 9, 2, 2, 'F');

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text(`N° ${index + 1}    ${rubroObj.rubro || 'RUBRO'}`, 18, currentY + 6);

      doc.setFontSize(8);
      doc.setTextColor(250, 204, 21);
      const labelTotal = esVenta ? "Venta: " : "Costo: ";
      doc.text(`${labelTotal}$ ${subtotalRubro.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - 18, currentY + 6, { align: 'right' });

      currentY += 10;

      // Tabla de ítems con encabezados en gris visible y formato unificado
      autoTable(doc, {
        startY: currentY,
        head: [["Tareas", "Unidades", "Cantidad", "Precio Unitario", "Precio Total"]],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [203, 213, 225], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { cellWidth: 22, halign: 'center' },
          2: { cellWidth: 20, halign: 'center' },
          3: { cellWidth: 35, halign: 'right' },
          4: { cellWidth: 35, halign: 'right' }
        },
        styles: { cellPadding: 3 },
        margin: { left: 14, right: 14 }
      });

      currentY = doc.lastAutoTable.finalY + 8;
    });

    if (currentY > 255) {
      doc.addPage();
      currentY = 20;
    }

    // 6) Cuadro negro para el Total General (1.5 veces más alto que los rubros: altura 14)
    doc.setFillColor(30, 41, 59);
    doc.roundedRect(14, currentY, pageWidth - 28, 14, 2, 2, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text("TOTAL GENERAL:", 20, currentY + 9);

    doc.setFontSize(11);
    doc.setTextColor(250, 204, 21);
    doc.text(
      `$ ${granTotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
      pageWidth - 20, 
      currentY + 9, 
      { align: 'right' }
    );

    const tipoSufijo = esVenta ? 'VENTY' : 'COSTOS';
    doc.save(`Presupuesto_${presupuesto?.codigo || 'Detalle'}_${tipoSufijo}.pdf`);
  } catch (error) {
    console.error("Error al exportar PDF:", error);
    alert("No se pudo generar el archivo PDF.");
  }
};