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
}

export async function generateExcelQuote(data: QuoteData, templatePath: string, outputPath: string) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);
  
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
    worksheet.getCell('H13').value = { formula: 'G11' };
    worksheet.getCell('H14').value = { formula: 'H13*0.08' };
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
    
    worksheet.getCell('H13').value = { formula: 'G11' };
    worksheet.getCell('H14').value = { formula: 'H13*0.08' };
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

      // 1. Header (Logo & Thông tin xưởng)
      const logoPath = path.join(process.cwd(), 'logo_prinktech.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 40, 35, { width: 65 });
      }

      doc.font(fBold).fontSize(14).fillColor('#0f172a').text("XƯỞNG IN PRINK TECH", 115, 38);
      doc.font(fRegular).fontSize(8.5).fillColor('#475569')
        .text("Địa chỉ: 94 Phan Đình Phùng, Phú Phong, Tây Sơn, Bình Định\nHotline/Zalo: 0768 598 540\nEmail: contact@prinktech.vn  ·  Website: prinktech.netslive.com", 115, 54);

      // Đường kẻ trang trí
      doc.moveTo(40, 95).lineTo(555, 95).strokeColor('#e2e8f0').lineWidth(0.8).stroke();

      // 2. Tiêu đề báo giá
      doc.font(fBold).fontSize(16).fillColor('#b45309').text("BÁO GIÁ IN TEM UV DTF 3D NỔI", 40, 115, { align: 'center' });
      doc.font(fRegular).fontSize(9.5).fillColor('#475569')
        .text(`Đơn hàng: ${data.orderCode}`, 40, 135, { align: 'center' })
        .text(`Ngày báo giá: ${new Date().toLocaleDateString('vi-VN')}`, 40, 149, { align: 'center' });

      // 3. Thông tin khách hàng
      doc.font(fBold).fontSize(10.5).fillColor('#0f172a').text("Thông tin khách hàng:", 40, 175);
      doc.font(fRegular).fontSize(9.5).fillColor('#334155');
      doc.text(`Khách hàng:`, 50, 195).font(fBold).text(data.customerName, 125, 195);
      doc.font(fRegular).text(`Số điện thoại:`, 50, 210).font(fBold).text(data.customerPhone, 125, 210);
      doc.font(fRegular).text(`Địa chỉ giao hàng:`, 50, 225).text(data.customerAddress, 125, 225, { width: 420 });

      // 4. Bảng sản phẩm
      const tableTop = 265;
      doc.font(fBold).fontSize(9).fillColor('#ffffff');
      
      // Vẽ Header bảng
      doc.rect(40, tableTop, 515, 20).fill('#1e293b');
      doc.text("STT", 45, tableTop + 6, { width: 25, align: 'center' });
      doc.text("Tên sản phẩm", 75, tableTop + 6, { width: 175 });
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
      const vatAmount = amountExclVat * 0.08;
      const amountInclVat = amountExclVat + vatAmount;
      const totalAmount = amountInclVat + data.shippingFee;

      const fmt = (num: number) => Math.round(num).toLocaleString('vi-VN') + ' đ';

      // Điền data dòng 1
      doc.font(fRegular).fontSize(9.5).fillColor('#0f172a');
      const rowY = tableTop + 25;
      
      // Vẽ dòng kẻ ngang dưới header
      doc.moveTo(40, rowY + 20).lineTo(555, rowY + 20).strokeColor('#e2e8f0').lineWidth(0.5).stroke();

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
      doc.font(fRegular).fontSize(9.5).fillColor('#334155');
      
      let sumY = summaryTop;
      const drawSumRow = (label: string, valStr: string, isBold = false) => {
        doc.font(isBold ? fBold : fRegular).fillColor(isBold ? '#b45309' : '#334155');
        doc.text(label, 320, sumY, { width: 140, align: 'right' });
        doc.text(valStr, 470, sumY, { width: 80, align: 'right' });
        sumY += 18;
      };

      drawSumRow("Cộng tiền hàng (chưa VAT):", fmt(amountExclVat));
      drawSumRow("Thuế GTGT (VAT 8%):", fmt(vatAmount));
      drawSumRow("Tiền hàng đã gồm VAT:", fmt(amountInclVat));
      drawSumRow("Phí vận chuyển (Ship):", fmt(data.shippingFee));
      
      // Đường kẻ ngăn cách tổng cộng
      doc.moveTo(350, sumY + 2).lineTo(555, sumY + 2).strokeColor('#cbd5e1').lineWidth(0.8).stroke();
      sumY += 8;
      
      drawSumRow("TỔNG THANH TOÁN:", fmt(totalAmount), true);

      // 6. Điều khoản và thông tin thanh toán (ở dưới cùng bên trái)
      const termTop = summaryTop;
      doc.font(fBold).fontSize(10).fillColor('#0f172a').text("Thông tin thanh toán & Giao nhận:", 40, termTop);
      doc.font(fRegular).fontSize(8.5).fillColor('#475569');
      
      const termText = 
        `1. Phương thức giao hàng: Giao COD tận nơi.\n` +
        `2. Phí vận chuyển: ${data.shippingFee.toLocaleString('vi-VN')} đ (đã tính vào tổng cộng).\n` +
        `3. Địa điểm nhận hàng: ${data.customerAddress}\n` +
        `4. Thông tin tài khoản ngân hàng của xưởng:\n` +
        `   · Ngân hàng: Techcombank (TCB)\n` +
        `   · Số tài khoản: 19036574384013\n` +
        `   · Chủ tài khoản: Nguyễn Hoàng Hải\n` +
        `   · Cú pháp chuyển khoản: ${data.orderCode}`;
      
      doc.text(termText, 40, termTop + 18, { width: 270, lineGap: 3 });

      // 7. Chữ ký 2 bên
      const signTop = sumY + 40;
      doc.font(fBold).fontSize(10).fillColor('#0f172a');
      doc.text("ĐẠI DIỆN KHÁCH HÀNG", 80, signTop, { align: 'center', width: 150 });
      doc.text("NGƯỜI BÁO GIÁ", 380, signTop, { align: 'center', width: 150 });
      
      doc.font(fRegular).fontSize(8.5).fillColor('#64748b');
      doc.text("(Ký, ghi rõ họ tên)", 80, signTop + 13, { align: 'center', width: 150 });
      doc.text("(Ký, đóng dấu nếu có)", 380, signTop + 13, { align: 'center', width: 150 });

      doc.font(fBold).fontSize(9.5).fillColor('#475569');
      doc.text("Nguyễn Hoàng Hải", 380, signTop + 75, { align: 'center', width: 150 });

      doc.end();

      writeStream.on('finish', () => resolve());
      writeStream.on('error', (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
}
