import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export interface QuoteData {
  orderCode: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  productName: string;
  size: string;
  quantity: number;
  meters?: number;
  rateExclVat: number;
  shippingFee: number;
  note?: string;
  vatRate?: number;
}

export async function generateExcelQuote(data: QuoteData, templatePath: string, outputPath: string) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath, {
    ignore: ['drawing', 'picture']
  } as any);
  
  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) {
    throw new Error('Không tìm thấy sheet đầu tiên trong template Excel');
  }

  // Bật hiển thị gridlines
  if (worksheet.views && worksheet.views.length > 0) {
    worksheet.views[0].showGridLines = true;
  }

  // Điền thông tin tiêu đề và khách hàng
  worksheet.getCell('D2').value = `Đơn hàng: ${data.orderCode}`;
  worksheet.getCell('A6').value = ` Khách hàng: ${data.customerName}`;
  worksheet.getCell('A7').value = ` Địa chỉ giao hàng: ${data.customerAddress}`;

  const useMeters = data.meters !== undefined && data.meters !== null && data.meters > 0;

  if (useMeters) {
    // In theo cuộn
    worksheet.getCell('D6').value = ` Quy cách: Cuộn khổ 60cm | ${data.meters!.toFixed(2)} mét dài phân bổ bế bọc màng định hình`;
    
    // Điền sản phẩm dòng 10
    worksheet.getCell('B10').value = data.productName;
    worksheet.getCell('C10').value = data.size;
    worksheet.getCell('D10').value = data.quantity;
    worksheet.getCell('E10').value = data.meters;
    worksheet.getCell('F10').value = data.rateExclVat;
    
    // Điền công thức
    worksheet.getCell('G10').value = { formula: 'E10*F10' }; // Thành tiền trước VAT
    worksheet.getCell('H10').value = { formula: 'G10/D10' }; // Đơn giá cái trước VAT
    
    // Công thức tính tổng dòng 11
    worksheet.getCell('D11').value = { formula: 'SUM(D10:D10)' };
    worksheet.getCell('E11').value = { formula: 'SUM(E10:E10)' };
    worksheet.getCell('G11').value = { formula: 'SUM(G10:G10)' };
    worksheet.getCell('H11').value = { formula: 'G11/D11' };
    
    // Khối VAT dòng 13-17
    const vRate = data.vatRate !== undefined ? data.vatRate : 0.08;
    worksheet.getCell('H13').value = { formula: 'G11' };
    worksheet.getCell('H14').value = { formula: `H13*${vRate}` };
    worksheet.getCell('H15').value = { formula: 'H13+H14' };
    worksheet.getCell('H16').value = data.shippingFee;
    worksheet.getCell('H17').value = { formula: 'H15+H16' };
  } else {
    // Bán theo cái/tờ
    // Ẩn cột E
    worksheet.getColumn(5).hidden = true;
    worksheet.getColumn(5).width = 0;
    
    worksheet.getCell('D6').value = ` Quy cách: Tem UV DTF bọc màng định hình bế sẵn`;
    
    // Điền sản phẩm dòng 10 (E10 lúc này là F10 cũ)
    worksheet.getCell('B10').value = data.productName;
    worksheet.getCell('C10').value = data.size;
    worksheet.getCell('D10').value = data.quantity;
    worksheet.getCell('E10').value = 1; // số mét dài giả định để tránh lỗi công thức
    worksheet.getCell('F10').value = data.rateExclVat; // đơn giá cái/tờ
    
    // Điền công thức
    worksheet.getCell('G10').value = { formula: 'D10*F10' }; // Thành tiền trước VAT = Qty * Rate
    worksheet.getCell('H10').value = { formula: 'G10/D10' }; // Đơn giá cái trước VAT
    
    // Công thức tính tổng dòng 11
    worksheet.getCell('D11').value = { formula: 'SUM(D10:D10)' };
    worksheet.getCell('G11').value = { formula: 'SUM(G10:G10)' };
    worksheet.getCell('H11').value = { formula: 'G11/D11' };
    
    const vRate = data.vatRate !== undefined ? data.vatRate : 0.08;
    worksheet.getCell('H13').value = { formula: 'G11' };
    worksheet.getCell('H14').value = { formula: `H13*${vRate}` };
    worksheet.getCell('H15').value = { formula: 'H13+H14' };
    worksheet.getCell('H16').value = data.shippingFee;
    worksheet.getCell('H17').value = { formula: 'H15+H16' };
  }

  // Điều khoản thanh toán
  worksheet.getCell('C24').value = `Giao COD về địa chỉ: ${data.customerAddress}. Phí ship ${data.shippingFee.toLocaleString('vi-VN')}đ.`;

  // Lưu file Excel
  await workbook.xlsx.writeFile(outputPath);
}

export function generatePdfQuote(data: QuoteData, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const writeStream = fs.createWriteStream(outputPath);
      doc.pipe(writeStream);

      // Định nghĩa font chữ tiếng Việt
      const fontPath = path.join(process.cwd(), 'public', 'fonts', 'Arial.ttf');
      const fontBoldPath = path.join(process.cwd(), 'public', 'fonts', 'Arial-Bold.ttf');
      
      const hasFonts = fs.existsSync(fontPath) && fs.existsSync(fontBoldPath);
      const fRegular = hasFonts ? fontPath : 'Helvetica';
      const fBold = hasFonts ? fontBoldPath : 'Helvetica-Bold';

      // 1. Header (Logo & Thông tin xưởng GMKT Việt Nam)
      const logoPath = path.join(process.cwd(), 'logo_prinktech.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 40, 35, { width: 65 });
      }

      doc.font(fBold).fontSize(13).fillColor('#6d28d9').text("CÔNG TY TNHH GMKT VIỆT NAM", 115, 36);
      doc.font(fBold).fontSize(9.5).fillColor('#1e293b').text("XƯỞNG IN NỔI 3D PRINK TECH", 115, 51);
      doc.font(fRegular).fontSize(8).fillColor('#475569')
        .text("Địa chỉ xưởng: 94 Phan Đình Phùng, Phú Phong, Tây Sơn, Bình Định\nHotline/Zalo hỗ trợ: 0822.968.412  ·  Email: gmkt2303@gmail.com  ·  Website: prinktech.netslive.com", 115, 64);

      // Đường kẻ trang trí màu tím nhạt
      doc.moveTo(40, 95).lineTo(555, 95).strokeColor('#ddd6fe').lineWidth(0.8).stroke();

      // 2. Tiêu đề báo giá
      doc.font(fBold).fontSize(16).fillColor('#6d28d9').text("BÁO GIÁ IN TEM UV DTF 3D NỔI", 40, 115, { align: 'center' });
      doc.font(fRegular).fontSize(9.5).fillColor('#475569')
        .text(`Đơn hàng: ${data.orderCode}`, 40, 135, { align: 'center' })
        .text(`Ngày báo giá: ${new Date().toLocaleDateString('vi-VN')}`, 40, 149, { align: 'center' });

      // 3. Thông tin khách hàng
      doc.font(fBold).fontSize(10.5).fillColor('#6d28d9').text("Thông tin khách hàng nhận báo giá:", 40, 175);
      
      // Vẽ khung viền nhạt bao quanh thông tin khách hàng
      doc.roundedRect(40, 187, 515, 54, 6).fillColor('#fbfbfe').fill();
      doc.roundedRect(40, 187, 515, 54, 6).strokeColor('#e2e8f0').lineWidth(0.5).stroke();

      doc.font(fRegular).fontSize(9.5).fillColor('#334155');
      doc.text(`Khách hàng:`, 52, 194).font(fBold).text(data.customerName, 130, 194);
      doc.font(fRegular).text(`Số điện thoại:`, 52, 209).font(fBold).text(data.customerPhone, 130, 209);
      doc.font(fRegular).text(`Địa chỉ giao hàng:`, 52, 224).text(data.customerAddress, 130, 224, { width: 410 });

      // 4. Bảng sản phẩm
      const tableTop = 265;
      doc.font(fBold).fontSize(9).fillColor('#ffffff');
      
      // Vẽ Header bảng màu tím
      doc.rect(40, tableTop, 515, 20).fill('#6d28d9');
      doc.text("STT", 45, tableTop + 6, { width: 25, align: 'center' });
      doc.text("Tên sản phẩm (Mẫu tem)", 75, tableTop + 6, { width: 175 });
      doc.text("Quy cách / Cỡ", 255, tableTop + 6, { width: 85 });
      doc.text("Số lượng", 345, tableTop + 6, { width: 50, align: 'center' });
      
      const useMeters = data.meters !== undefined && data.meters !== null && data.meters > 0;
      if (useMeters) {
        doc.text("Mét dài", 400, tableTop + 6, { width: 45, align: 'center' });
        doc.text("Đơn giá / m", 450, tableTop + 6, { width: 50, align: 'right' });
      } else {
        doc.text("Đơn giá", 420, tableTop + 6, { width: 65, align: 'right' });
      }
      doc.text("Thành tiền", 500, tableTop + 6, { width: 50, align: 'right' });

      // Tính tiền và format
      const amountExclVat = useMeters 
        ? data.meters! * data.rateExclVat 
        : data.quantity * data.rateExclVat;
      const vRate = data.vatRate !== undefined ? data.vatRate : 0.08;
      const vatAmount = amountExclVat * vRate;
      const amountInclVat = amountExclVat + vatAmount;
      const totalAmount = amountInclVat + data.shippingFee;

      const fmt = (num: number) => Math.round(num).toLocaleString('vi-VN') + ' đ';

      // Điền data dòng 1
      doc.font(fRegular).fontSize(9.5).fillColor('#0f172a');
      const rowY = tableTop + 25;
      
      // Vẽ dòng kẻ ngang dưới header
      doc.moveTo(40, rowY + 20).lineTo(555, rowY + 20).strokeColor('#ddd6fe').lineWidth(0.5).stroke();

      doc.text("1", 45, rowY + 5, { width: 25, align: 'center' });
      doc.text(data.productName, 75, rowY + 5, { width: 175 });
      doc.text(data.size, 255, rowY + 5, { width: 85 });
      doc.text(data.quantity.toString(), 345, rowY + 5, { width: 50, align: 'center' });
      
      if (useMeters) {
        doc.text(data.meters!.toFixed(2), 400, rowY + 5, { width: 45, align: 'center' });
        doc.text(fmt(data.rateExclVat), 450, rowY + 5, { width: 50, align: 'right' });
      } else {
        doc.text(fmt(data.rateExclVat), 420, rowY + 5, { width: 65, align: 'right' });
      }
      doc.text(fmt(amountExclVat), 500, rowY + 5, { width: 50, align: 'right' });

      // 5. Phần Tổng tiền (nằm lệch phải)
      const summaryTop = rowY + 50;
      
      let sumY = summaryTop;
      const drawSumRow = (label: string, valStr: string, isBold = false) => {
        doc.font(isBold ? fBold : fRegular).fillColor(isBold ? '#6d28d9' : '#334155');
        doc.text(label, 320, sumY, { width: 140, align: 'right' });
        doc.text(valStr, 470, sumY, { width: 80, align: 'right' });
        sumY += 18;
      };

      drawSumRow("Cộng tiền hàng (chưa VAT):", fmt(amountExclVat));
      drawSumRow(`Thuế GTGT (VAT ${vRate * 100}%):`, fmt(vatAmount));
      drawSumRow("Tiền hàng đã gồm VAT:", fmt(amountInclVat));
      drawSumRow("Phí vận chuyển (Ship):", fmt(data.shippingFee));
      
      // Đường kẻ ngăn cách tổng cộng màu tím
      doc.moveTo(350, sumY + 2).lineTo(555, sumY + 2).strokeColor('#c084fc').lineWidth(0.8).stroke();
      sumY += 8;
      
      drawSumRow("TỔNG THANH TOÁN:", fmt(totalAmount), true);

      // 6. Điều khoản và thông tin thanh toán (ở dưới cùng bên trái)
      const termTop = summaryTop;
      doc.font(fBold).fontSize(10).fillColor('#6d28d9').text("Thông tin thanh toán & Giao nhận:", 40, termTop);
      
      // Vẽ khung viền nhạt màu tím
      doc.roundedRect(40, termTop + 14, 270, 110, 6).fillColor('#f5f3ff').fill();
      doc.roundedRect(40, termTop + 14, 270, 110, 6).strokeColor('#ddd6fe').lineWidth(0.5).stroke();

      doc.font(fRegular).fontSize(8.2).fillColor('#475569');
      
      const termText = 
        `1. Phương thức giao hàng: Giao hàng tận nơi (COD).\n` +
        `2. Phí vận chuyển: ${data.shippingFee > 0 ? (data.shippingFee.toLocaleString('vi-VN') + ' đ') : 'Miễn phí vận chuyển'}.\n` +
        `3. Địa điểm giao nhận: ${data.customerAddress}\n` +
        `4. Thông tin tài khoản ngân hàng thanh toán:\n` +
        `   · Ngân hàng: Vietinbank (Ngân hàng Công Thương Việt Nam)\n` +
        `   · Số tài khoản: 110602191866\n` +
        `   · Chủ tài khoản: CÔNG TY TNHH GMKT VIỆT NAM\n` +
        `   · Nội dung chuyển khoản: Thanh toan ${data.orderCode}`;
      
      doc.text(termText, 46, termTop + 20, { width: 258, lineGap: 3 });

      // 7. Chữ ký 2 bên
      const signTop = sumY + 40;
      doc.font(fBold).fontSize(10).fillColor('#1e293b');
      doc.text("ĐẠI DIỆN KHÁCH HÀNG", 80, signTop, { align: 'center', width: 150 });
      doc.text("NGƯỜI LẬP BÁO GIÁ", 380, signTop, { align: 'center', width: 150 });
      
      doc.font(fRegular).fontSize(8.5).fillColor('#64748b');
      doc.text("(Ký, ghi rõ họ tên)", 80, signTop + 13, { align: 'center', width: 150 });
      doc.text("(Ký tên, đóng dấu)", 380, signTop + 13, { align: 'center', width: 150 });

      doc.font(fBold).fontSize(9.5).fillColor('#6d28d9');
      doc.text("Đại Diện GMKT Việt Nam", 380, signTop + 75, { align: 'center', width: 150 });

      doc.end();

      writeStream.on('finish', () => resolve());
      writeStream.on('error', (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
}
