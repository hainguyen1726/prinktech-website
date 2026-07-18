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
      const doc = new PDFDocument({ margin: 35, size: 'A4' });
      const writeStream = fs.createWriteStream(outputPath);
      doc.pipe(writeStream);

      // Định nghĩa font chữ tiếng Việt
      const fontPath = path.join(process.cwd(), 'public', 'fonts', 'Arial.ttf');
      const fontBoldPath = path.join(process.cwd(), 'public', 'fonts', 'Arial-Bold.ttf');
      
      const hasFonts = fs.existsSync(fontPath) && fs.existsSync(fontBoldPath);
      const fRegular = hasFonts ? fontPath : 'Helvetica';
      const fBold = hasFonts ? fontBoldPath : 'Helvetica-Bold';

      // Màu sắc chủ đạo (Hồng cánh sen đậm #db2777 và các tông màu bổ trợ)
      const cAccent = '#db2777';
      const cTextDark = '#0f172a';
      const cTextMuted = '#475569';
      const cBorder = '#cbd5e1';

      // 1. Header (Logo & Đơn vị phát hành & Khối Tiêu đề)
      const logoPath = path.join(process.cwd(), 'logo_prinktech.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 35, 30, { width: 75 });
      }

      // Đơn vị phát hành (ở giữa)
      doc.font(fBold).fontSize(8.5).fillColor(cTextMuted).text("ĐƠN VỊ PHÁT HÀNH", 125, 28);
      doc.font(fBold).fontSize(11.5).fillColor(cTextDark).text("CÔNG TY TNHH GMKT VIỆT NAM", 125, 39);
      doc.font(fRegular).fontSize(8).fillColor(cTextMuted)
        .text("MST: 2601152032", 125, 52)
        .text("📞 Hotline: 0822.968.412", 125, 63)
        .text("🌐 Website: prinktech.netslive.com", 125, 74);

      // Đường kẻ đứng phân cách
      doc.moveTo(355, 30).lineTo(355, 90).strokeColor('#e2e8f0').lineWidth(0.8).stroke();

      // Tiêu đề Báo giá (ở bên phải, căn lề phải)
      doc.font(fBold).fontSize(17).fillColor(cTextDark).text("BÁO GIÁ", 370, 36, { align: 'right', width: 190 });
      doc.font(fRegular).fontSize(8).fillColor(cTextMuted)
        .text(`Số: ${data.orderCode}`, 370, 58, { align: 'right', width: 190, lineGap: 3 })
        .text(`📅 Ngày lập: ${new Date().toLocaleDateString('vi-VN')}`, 370, 71, { align: 'right', width: 190 });

      // Đường kẻ ngang màu hồng đậm phân tách Header
      doc.moveTo(35, 102).lineTo(560, 102).strokeColor(cAccent).lineWidth(1.5).stroke();

      // 2. Khách hàng / Bên mua
      const clientTop = 115;
      doc.font(fBold).fontSize(8.5).fillColor(cTextMuted).text("KHÁCH HÀNG / BÊN MUA", 35, clientTop);
      doc.font(fBold).fontSize(12).fillColor(cTextDark).text(data.customerName, 35, clientTop + 14);
      doc.font(fRegular).fontSize(8.5).fillColor(cTextDark)
        .text(`📞 ${data.customerPhone}`, 35, clientTop + 29)
        .text(`📍 ${data.customerAddress}`, 35, clientTop + 41);

      // 3. Bảng sản phẩm (Table)
      const tableTop = 185;
      const headerHeight = 22;

      // Vẽ nền Header bảng
      // Phần bên trái (STT đến CK) màu xám nhạt
      doc.rect(35, tableTop, 445, headerHeight).fill('#f1f5f9');
      // Phần Thành tiền màu hồng đậm
      doc.rect(480, tableTop, 80, headerHeight).fill(cAccent);

      // Điền chữ Header bảng
      doc.font(fBold).fontSize(8.5);
      doc.fillColor(cTextMuted);
      doc.text("STT", 35, tableTop + 6, { width: 22, align: 'center' });
      doc.text("Mẫu tem (Mã đơn)", 62, tableTop + 6, { width: 118 });
      doc.text("Quy cách / Cỡ", 185, tableTop + 6, { width: 70 });
      doc.text("Ngày", 260, tableTop + 6, { width: 70, align: 'center' });
      doc.text("Số lượng", 335, tableTop + 6, { width: 50, align: 'center' });
      doc.text("Đơn giá", 390, tableTop + 6, { width: 60, align: 'right' });
      doc.text("CK", 455, tableTop + 6, { width: 25, align: 'center' });
      
      doc.fillColor('#ffffff');
      doc.text("Thành tiền", 480, tableTop + 6, { width: 75, align: 'right' });

      // Tính tiền và format
      const useMeters = data.meters !== undefined && data.meters !== null && data.meters > 0;
      const amountExclVat = useMeters 
        ? data.meters! * data.rateExclVat 
        : data.quantity * data.rateExclVat;
      const vRate = data.vatRate !== undefined ? data.vatRate : 0.08;
      const vatAmount = amountExclVat * vRate;
      const amountInclVat = amountExclVat + vatAmount;
      const totalAmount = amountInclVat + data.shippingFee;

      const fmt = (num: number) => Math.round(num).toLocaleString('vi-VN') + ' đ';

      // Dữ liệu dòng 1
      const rowY = tableTop + headerHeight + 5;
      doc.font(fRegular).fontSize(8.5).fillColor(cTextDark);
      
      // Vẽ đường kẻ dưới dòng 1
      doc.moveTo(35, rowY + 18).lineTo(560, rowY + 18).strokeColor('#f1f5f9').lineWidth(0.5).stroke();

      doc.text("1", 35, rowY + 4, { width: 22, align: 'center' });
      doc.text(data.productName, 62, rowY + 4, { width: 118 });
      doc.text(data.size, 185, rowY + 4, { width: 70 });
      doc.text(new Date().toLocaleDateString('vi-VN'), 260, rowY + 4, { width: 70, align: 'center' });
      
      const qtyStr = useMeters ? `${data.meters!.toFixed(1)} m` : `${data.quantity} cái`;
      doc.text(qtyStr, 335, rowY + 4, { width: 50, align: 'center' });
      doc.text(fmt(data.rateExclVat), 390, rowY + 4, { width: 60, align: 'right' });
      
      doc.font(fBold).fillColor(cAccent).text("—", 455, rowY + 4, { width: 25, align: 'center' });
      
      doc.font(fBold).fillColor(cTextDark);
      doc.text(fmt(amountExclVat), 480, rowY + 4, { width: 75, align: 'right' });

      // 4. Khung Thông tin thanh toán (bên dưới bên trái)
      const bottomY = rowY + 40;
      
      // Vẽ nền hồng nhạt bo góc cho ô Thanh toán
      doc.roundedRect(35, bottomY, 270, 95, 6).fillColor('#fff1f2').fill();
      doc.roundedRect(35, bottomY, 270, 95, 6).strokeColor('#fecdd3').lineWidth(0.5).stroke();

      doc.font(fBold).fontSize(8.5).fillColor(cTextMuted).text("💳 THÔNG TIN THANH TOÁN", 45, bottomY + 12);
      
      doc.font(fRegular).fontSize(8.5).fillColor(cTextDark);
      doc.text("Ngân hàng:", 45, bottomY + 30);
      doc.font(fBold).text("Vietinbank", 105, bottomY + 30);
      
      doc.font(fRegular).text("Số TK:", 45, bottomY + 46);
      doc.font(fBold).fontSize(12).fillColor(cAccent).text("110602191866", 105, bottomY + 44);
      
      doc.font(fRegular).fontSize(8.5).fillColor(cTextDark).text("Chủ TK:", 45, bottomY + 65);
      doc.font(fBold).text("CÔNG TY TNHH GMKT VIỆT NAM", 105, bottomY + 65);

      doc.font(fRegular).fontSize(7.5).fillColor(cTextMuted).text(`Nội dung CK: Thanh toan ${data.orderCode}`, 45, bottomY + 80);

      // 5. Khung Ghi chú đơn hàng (nằm ngay dưới ô Thanh toán)
      const notesY = bottomY + 110;
      doc.roundedRect(35, notesY, 270, 60, 6).fillColor('#f8fafc').fill();
      doc.roundedRect(35, notesY, 270, 60, 6).strokeColor('#e2e8f0').lineWidth(0.5).stroke();

      doc.font(fBold).fontSize(8).fillColor(cTextMuted).text("📝 GHI CHÚ / YÊU CẦU", 45, notesY + 10);
      
      // Xử lý Ghi chú
      const cleanNote = data.note ? data.note.split('\n')[0] : '';
      const displayNote = cleanNote || "Đơn hàng in bế sẵn theo file thiết kế đã duyệt.";
      doc.font(fRegular).fontSize(8).fillColor(cTextDark)
        .text(displayNote, 45, notesY + 22, { width: 250, lineGap: 2 });

      // 6. Khối tổng tiền (bên phải)
      const summaryX = 330;
      let sumY = bottomY + 5;
      
      const drawSumRow = (label: string, valStr: string, isBold = false) => {
        doc.font(isBold ? fBold : fRegular).fontSize(8.5).fillColor(isBold ? cAccent : cTextMuted);
        doc.text(label, summaryX, sumY, { width: 140, align: 'right' });
        doc.text(valStr, summaryX + 150, sumY, { width: 80, align: 'right' });
        sumY += 16;
      };

      const qtyDisplay = useMeters ? `${data.meters!.toFixed(1)} m` : `${data.quantity} cái`;
      drawSumRow("Tổng số lượng in:", qtyDisplay);
      drawSumRow("Tạm tính:", fmt(amountExclVat));
      drawSumRow(`VAT (${vRate * 100}%):`, fmt(vatAmount));
      
      const shipStr = data.shippingFee > 0 ? fmt(data.shippingFee) : "Miễn phí";
      drawSumRow("Phí vận chuyển:", shipStr);

      // Đường kẻ tổng
      doc.moveTo(summaryX + 50, sumY + 2).lineTo(560, sumY + 2).strokeColor(cBorder).lineWidth(0.5).stroke();
      sumY += 8;

      // Hộp tổng tiền phải trả màu hồng
      const totalBoxY = sumY;
      doc.roundedRect(summaryX + 10, totalBoxY, 220, 32, 6).fillColor('#fff1f2').fill();
      doc.font(fBold).fontSize(10).fillColor(cAccent);
      doc.text("TỔNG THANH TOÁN:", summaryX + 18, totalBoxY + 11);
      doc.fontSize(11.5).text(fmt(totalAmount), summaryX + 120, totalBoxY + 10, { width: 100, align: 'right' });

      // 7. Footer màu xám nhạt
      const footerY = 790;
      doc.rect(0, footerY, 595, 30).fill('#f1f5f9');
      doc.font(fRegular).fontSize(7.5).fillColor(cTextMuted);
      doc.text("Xưởng in UV DTF — PrinK Tech — gmkt2303@gmail.com", 35, footerY + 11);
      doc.text("Chân thành cảm ơn quý khách!", 250, footerY + 11, { align: 'center', width: 95 });
      doc.text(`Số: ${data.orderCode}`, 350, footerY + 11, { align: 'right', width: 210 });

      doc.end();

      writeStream.on('finish', () => resolve());
      writeStream.on('error', (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
}
