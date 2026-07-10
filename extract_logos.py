# extract_logos.py
import cv2
import numpy as np
import os
from PIL import Image

INPUT_DIR = r"d:\16. Code\32-website-prinktech\public\images\temp_logos"
OUTPUT_DIR = r"d:\16. Code\32-website-prinktech\public\images\extracted_logos"

def main():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
        print(f"📁 Đã tạo thư mục đầu ra: {OUTPUT_DIR}")

    files = [f for f in os.listdir(INPUT_DIR) if f.lower().endswith('.png')]
    print(f"📦 Tìm thấy {len(files)} file ảnh tổng hợp trong {INPUT_DIR}")

    total_extracted = 0

    for file_name in files:
        file_path = os.path.join(INPUT_DIR, file_name)
        base_name = os.path.splitext(file_name)[0]
        
        print(f"\n⚙️ Đang xử lý file: {file_name}...")
        
        # 1. Đọc ảnh bằng OpenCV (đọc cả kênh Alpha nếu có)
        img = cv2.imread(file_path, cv2.IMREAD_UNCHANGED)
        if img is None:
            print(f"❌ Không thể đọc file: {file_name}")
            continue

        h_img, w_img = img.shape[:2]
        print(f"   Kích thước ảnh gốc: {w_img}x{h_img} px, Channels: {img.shape[2] if len(img.shape) > 2 else 1}")

        # 2. Tạo mặt nạ (mask) phát hiện logo
        # Trường hợp 1: Có kênh Alpha (trong suốt)
        if img.shape[2] == 4:
            alpha_channel = img[:, :, 3]
            # Lấy các pixel không trong suốt hoàn toàn (alpha > 10)
            _, mask = cv2.threshold(alpha_channel, 10, 255, cv2.THRESH_BINARY)
        # Trường hợp 2: Ảnh RGB thông thường (giả định nền trắng)
        else:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            # Ngưỡng hóa ngược: các pixel tối hơn màu trắng (gray < 250) sẽ là logo
            _, mask = cv2.threshold(gray, 250, 255, cv2.THRESH_BINARY_INV)

        # 3. Làm mịn mặt nạ để nối các phần nhỏ của cùng 1 logo (ví dụ text và icon)
        # Dùng phép giãn nở (Dilation) và đóng (Closing)
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 15))
        mask_cleaned = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
        mask_cleaned = cv2.dilate(mask_cleaned, kernel, iterations=1)

        # 4. Tìm các contours
        contours, _ = cv2.findContours(mask_cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        print(f"   Tìm thấy {len(contours)} contours thô.")

        # Đọc lại ảnh bằng PIL để crop giữ nguyên chất lượng gốc và kênh màu trong suốt
        pil_img = Image.open(file_path)

        extracted_count = 0

        for idx, contour in enumerate(contours):
            # Tính diện tích contour
            area = cv2.contourArea(contour)
            # Bỏ qua các contour quá nhỏ (nhiễu hoặc dấu chấm nhỏ)
            if area < 1500:  # Ngưỡng diện tích tối thiểu cho logo
                continue

            x, y, w, h = cv2.boundingRect(contour)

            # Tránh lấy toàn bộ bức ảnh
            if w > w_img * 0.95 or h > h_img * 0.95:
                continue

            # Bỏ các logo có kích thước chiều ngang/dọc quá bé
            if w < 40 or h < 40:
                continue

            extracted_count += 1
            total_extracted += 1

            # Mở rộng bounding box một chút (padding 15px) để tránh mất mép
            padding = 15
            crop_x1 = max(0, x - padding)
            crop_y1 = max(0, y - padding)
            crop_x2 = min(w_img, x + w + padding)
            crop_y2 = min(h_img, y + h + padding)

            # Crop và lưu bằng PIL
            cropped_logo = pil_img.crop((crop_x1, crop_y1, crop_x2, crop_y2))
            
            output_name = f"logo_{base_name}_{extracted_count:02d}.png"
            output_path = os.path.join(OUTPUT_DIR, output_name)
            cropped_logo.save(output_path, "PNG")

        print(f"   => Tách thành công {extracted_count} logo nhỏ.")

    print(f"\n🎉 HOÀN THÀNH! Tổng số logo đã tách ra và lưu vào thư mục: {total_extracted} files.")

if __name__ == "__main__":
    main()
