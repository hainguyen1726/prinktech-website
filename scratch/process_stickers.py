import os
import cv2
import numpy as np
import torch
from super_image import EdsrModel, ImageLoader
from PIL import Image, ImageFilter, ImageChops
import io
import re

# Thiet lap cache model HuggingFace trong thu muc local de tranh loi quyen ghi tren Windows neu co
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

# Tu dien mapping chu de cho cac file PNG nguon tu 1-16
THEME_MAPPING = {
    "1": "luffy_onepiece",
    "2": "songoku_dragonball",
    "3": "zoro_onepiece",
    "5": "xe_hoat_hinh_chibi",
    "6": "naruto_ninja",
    "7": "dragonball_super",
    "8": "shin_cau_be_but_chi",
    "9": "luffy_gear_5",
    "10": "meo_beo_garfield",
    "12": "tom_jerry_chibi",
    "15": "thu_chibi_dethuong",
    "16": "sieu_anh_hung_marvel_dc"
}

def load_edsr_model():
    """Tai model EDSR tu eugenesiow de upscale bang AI"""
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"  [AI MODEL] Dang tai model EDSR-base x2. Device: {device}...")
    try:
        model = EdsrModel.from_pretrained('eugenesiow/edsr-base', scale=2)
        model = model.to(device)
        return model, device
    except Exception as e:
        print(f"  ❌ Khong the tai model EDSR: {e}. Se fallback ve dung Lanczos.")
        return None, "cpu"

def apply_ai_upscale(pil_img, model, device, temp_dir="."):
    """Ap dung AI Super Resolution cho kenh mau RGB, giu nguyen va resize kenh Alpha"""
    if model is None:
        # Fallback ve Lanczos truyen thong chat luong cao
        return pil_img.resize((pil_img.width * 2, pil_img.height * 2), Image.Resampling.LANCZOS)
        
    try:
        # Tach kenh mau
        if pil_img.mode == 'RGBA':
            r, g, b, a = pil_img.split()
            img_rgb = Image.merge("RGB", (r, g, b))
        else:
            img_rgb = pil_img.convert("RGB")
            a = None
            
        # Run model
        inputs = ImageLoader.load_image(img_rgb)
        inputs = inputs.to(device)
        
        with torch.no_grad():
            preds = model(inputs)
            
        # Luu ra file tam tren dia de OpenCV doc lai (tranh loi write vao BytesIO)
        os.makedirs(temp_dir, exist_ok=True)
        # Tao ten file tam ngau nhien de tranh xung dot khi chay song song
        import uuid
        temp_filename = f"_temp_sr_{uuid.uuid4().hex}.png"
        temp_path = os.path.join(temp_dir, temp_filename)
        
        ImageLoader.save_image(preds, temp_path)
        
        # Doc lai anh va copy du lieu de dong ket noi file ngay
        with Image.open(temp_path) as temp_img:
            upscaled_rgb = temp_img.copy()
            
        # Xoa file tam
        if os.path.exists(temp_path):
            os.remove(temp_path)
        
        # Merge lai kenh Alpha neu co
        if a is not None:
            upscaled_a = a.resize(upscaled_rgb.size, Image.Resampling.LANCZOS)
            final_img = Image.merge("RGBA", (*upscaled_rgb.split(), upscaled_a))
        else:
            final_img = upscaled_rgb.convert("RGBA")
            
        return final_img
    except Exception as e:
        print(f"    [!] Loi khi upscale bang AI: {e}. Fallback ve Lanczos.")
        # Fallback
        w, h = pil_img.size
        return pil_img.resize((w * 2, h * 2), Image.Resampling.LANCZOS)

def create_3d_effect(pil_img):
    """
    Tao hieu ung tem noi 3D (UV DTF) bao gom:
    - Vien noi bong (Emboss) de tao cam giac con tem co do day 3D.
    - Shadow (Bong do) de tao cam giac con tem noi khoi be mat.
    """
    if pil_img.mode != 'RGBA':
        pil_img = pil_img.convert("RGBA")
        
    w, h = pil_img.size
    
    # 1. Tao bong do (Drop Shadow)
    # Trich xuat alpha channel lam mat na mat duong bong do
    _, _, _, a = pil_img.split()
    
    # Tao anh bong do (mau den, co lam mo Gaussian)
    shadow_offset = (3, 3) # Lech xuong duoi va sang phai 3px
    shadow_mask = Image.new("L", (w, h), 0)
    # Paste mat na alpha lech di de lam shadow
    shadow_mask.paste(a, shadow_offset)
    # Lam mo mat na bong do de tạo bong min màng
    shadow_blur = shadow_mask.filter(ImageFilter.GaussianBlur(radius=4))
    
    # Tao anh shadow hoan toan mau den voi alpha lay tu shadow_blur
    shadow_img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    black_color = Image.new("RGBA", (w, h), (0, 0, 0, 150)) # Alpha 150 cho bong do nhe nhang
    shadow_img = Image.composite(black_color, shadow_img, shadow_blur)
    
    # 2. Tao vien noi gia Varnish (Emboss)
    # Lay mask alpha lam mo de tao vung gradient bien
    edge = a.filter(ImageFilter.Kernel((3, 3), [-1, -1, -1, -1, 8, -1, -1, -1, -1], 1, 0))
    
    # Tao highlights (sang trang phia tren-trai) va shadows (toi den phia duoi-phai)
    emboss_highlight = Image.new("RGBA", (w, h), (255, 255, 255, 120))
    emboss_shadow = Image.new("RGBA", (w, h), (0, 0, 0, 100))
    
    # Tao mat na lech huong (Dung ImageChops.offset thay vi ImageOps.offset)
    highlight_mask = ImageChops.offset(edge, -1, -1)
    shadow_mask_offset = ImageChops.offset(edge, 1, 1)
    
    # Ghep cac hieu ung noi
    emboss_img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    emboss_img = Image.composite(emboss_highlight, emboss_img, highlight_mask)
    emboss_img = Image.composite(emboss_shadow, emboss_img, shadow_mask_offset)
    
    # 3. Ghep tat ca cac lop lai voi nhau
    # Thu tu tu duoi len: Shadow -> Anh Sticker goc -> Vien noi Emboss
    final_canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    final_canvas = Image.alpha_composite(final_canvas, shadow_img)
    final_canvas = Image.alpha_composite(final_canvas, pil_img)
    final_canvas = Image.alpha_composite(final_canvas, emboss_img)
    
    return final_canvas

def process_single_image(file_path, output_dir, file_label, model, device, target_size=800, min_area=2000, min_dim=40):
    """Tách sticker, ap dung lam sach vien, AI upscale, can chinh 1:1 va tao hieu ung 3D"""
    filename = os.path.basename(file_path)
    is_png = filename.lower().endswith('.png')
    
    # 1. Doc anh va tao mat na mask chat luong tot
    if is_png:
        img = cv2.imread(file_path, cv2.IMREAD_UNCHANGED)
        if img is None:
            return 0
        if img.shape[2] == 4:
            alpha = img[:, :, 3]
            # Lam muot mask truoc khi tim contour
            alpha_blur = cv2.GaussianBlur(alpha, (3, 3), 0)
            contours, _ = cv2.findContours(alpha_blur, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            has_alpha = True
        else:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            has_alpha = False
    else:
        img = cv2.imread(file_path)
        if img is None:
            return 0
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        has_alpha = False

    if not has_alpha:
        # Doi voi anh chup thuc te (JPG co van nen):
        # Su dung GaussianBlur lon (9,9) de loc sach van go, van nhua be mat truoc khi threshold
        gray_blur = cv2.GaussianBlur(gray, (9, 9), 0)
        h_img, w_img = gray.shape[:2]
        corners = [gray[0, 0], gray[0, w_img-1], gray[h_img-1, 0], gray[h_img-1, w_img-1]]
        bg_color = np.median(corners)
        
        if bg_color > 127: # Nen sang
            _, thresh = cv2.threshold(gray_blur, 195, 255, cv2.THRESH_BINARY_INV)
        else: # Nen toi
            _, thresh = cv2.threshold(gray_blur, 40, 255, cv2.THRESH_BINARY)
            
        # Thao tac morphology lam sach các mang cham nhỏ
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
        thresh = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)
        
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    valid_contours = []
    for c in contours:
        area = cv2.contourArea(c)
        x, y, w, h = cv2.boundingRect(c)
        if area >= min_area and w >= min_dim and h >= min_dim:
            valid_contours.append((c, area, (x, y, w, h)))

    if not valid_contours:
        return 0

    os.makedirs(output_dir, exist_ok=True)
    success_count = 0
    
    for idx, (c, area, (x, y, w, h)) in enumerate(valid_contours):
        try:
            # Crop sticker tu anh goc
            crop_img = img[y:y+h, x:x+w]
            
            # Tao mat na alpha cuc bo cho contour nay de loc sach vien
            local_mask = np.zeros((h, w), dtype=np.uint8)
            c_offset = c - [x, y]
            cv2.drawContours(local_mask, [c_offset], -1, 255, -1)
            
            # Lam muot mask va khu rang cua nhe nhang bang GaussianBlur
            local_mask = cv2.GaussianBlur(local_mask, (3, 3), 0)
            
            # Tron vao kenh alpha
            if crop_img.shape[2] == 4:
                b, g, r, a = cv2.split(crop_img)
                final_alpha = cv2.bitwise_and(a, local_mask)
                rgba_crop = cv2.merge([b, g, r, final_alpha])
            else:
                b, g, r = cv2.split(crop_img)
                rgba_crop = cv2.merge([b, g, r, local_mask])

            # Chuyen he màu sang PIL RGBA
            rgba_crop_rgb = cv2.cvtColor(rgba_crop, cv2.COLOR_BGRA2RGBA)
            pil_crop = Image.fromarray(rgba_crop_rgb)
            
            # 2. Dua ve ti le vuong 1:1 truoc khi upscale
            max_dim = max(w, h)
            square_img = Image.new("RGBA", (max_dim, max_dim), (0, 0, 0, 0))
            paste_x = (max_dim - w) // 2
            paste_y = (max_dim - h) // 2
            square_img.paste(pil_crop, (paste_x, paste_y), pil_crop)
            
            # 3. NANG CAO CHAT LUONG BANG AI (EDSR)
            # Tối ưu hiệu năng: chỉ chạy AI upscaling cho các ảnh thực sự nhỏ (< 300px)
            # Với ảnh lớn hơn, dùng Lanczos chất lượng cao kết hợp Unsharp Mask đã đủ nét đẹp.
            if max_dim < 300:
                # Upscale bang AI (tang gap 2 lan kich thuoc voi do chi tiet cao)
                upscaled_img = apply_ai_upscale(square_img, model, device, temp_dir=output_dir)
                
                # Neu van chua dat kich thuoc mong muon, resize nhe lai bang Lanczos
                if upscaled_img.width < target_size:
                    upscaled_img = upscaled_img.resize((target_size, target_size), Image.Resampling.LANCZOS)
                elif upscaled_img.width > target_size:
                    # Neu da du lon thi resize dung ti le target_size cho dong deu
                    upscaled_img = upscaled_img.resize((target_size, target_size), Image.Resampling.LANCZOS)
            else:
                # Neu anh da du lon (>=300px), chi can resize nhe ve target_size bang Lanczos
                upscaled_img = square_img.resize((target_size, target_size), Image.Resampling.LANCZOS)
                
            # Lam net nhe de sticker tro nen lung linh, ro rang
            processed_img = upscaled_img.filter(ImageFilter.UnsharpMask(radius=1.2, percent=120, threshold=3))
            
            # 4. TAO HIEU UNG NOI 3D UV DTF (Bong do & Vien bong) de anh vo cung bat mat
            final_img = create_3d_effect(processed_img)
            
            # 5. Luu file voi dinh dang ten: {file_label}_sticker_{idx + 1:02d}.png
            out_filename = f"{file_label}_sticker_{idx + 1:02d}.png"
            out_path = os.path.join(output_dir, out_filename)
            
            final_img.save(out_path, "PNG")
            success_count += 1
            
        except Exception as e:
            print(f"    ❌ Loi tai sticker {idx+1}: {e}")
            
    print(f"  ✓ Da tach & lam dep {success_count}/{len(valid_contours)} sticker.")
    return success_count

def main():
    image_dir = r"D:\16. Code\32-website-prinktech\images"
    output_root = r"D:\16. Code\32-website-prinktech\images_output"
    
    if not os.path.exists(image_dir):
        print(f"❌ Thu muc nguon khong ton tai: {image_dir}")
        return
        
    os.makedirs(output_root, exist_ok=True)
    
    # 1. Khoi tao model AI upscaling (EDSR)
    model, device = load_edsr_model()
    
    files = sorted(os.listdir(image_dir))
    total_stickers = 0
    processed_files = 0
    
    print("\n" + "="*60)
    print("BAT DAU TACH VA LAM DEP STICKER BANG AI CHAT LUONG CAO (1:1 NEN TRONG SUOT)")
    print("="*60)
    
    for f in files:
        if f == "Logo PrinK Tech official.png":
            continue
            
        fpath = os.path.join(image_dir, f)
        if not os.path.isfile(fpath):
            continue
            
        base_name, ext = os.path.splitext(f)
        
        # Thiet lap folder con va dán nhãn chu de khoa hoc
        if f.lower().endswith('.png') and base_name.isdigit():
            # La file PNG tong hop thiet ke
            theme_key = base_name
            theme_name = THEME_MAPPING.get(theme_key, f"set_{int(base_name):02d}")
            folder_name = f"set_{theme_name}"
            file_label = f"design_{theme_name}"
        else:
            # La file JPG chup thuc te (anh san pham)
            # Kiem tra xem co the map no voi file PNG cung chu de nao khong
            # Truoc do ta thay 1783482198688_... la Luffy (map voi set_1), 1783482200204_... la xe (map voi set_5)
            # De don gian va de hieu cho AI Agent khac, ta se goi chung la "mockup_chup_thuc_te"
            folder_name = "mockup_chup_thuc_te"
            short_name = base_name.split('_')[-1][:8]
            file_label = f"mockup_{short_name}"
            
        target_out_dir = os.path.join(output_root, folder_name)
        
        print(f"\n[TIEN HANH] File: {f}")
        print(f"  → Chu de: {file_label} | Luu tai: {folder_name}")
        
        # Chay process (target_size = 800px cho anh cuc ky dep va net)
        count = process_single_image(fpath, target_out_dir, file_label, model, device, target_size=800)
        total_stickers += count
        if count > 0:
            processed_files += 1
            
    print("\n" + "="*60)
    print("HOAN THANH TACH ANH & AI UPSCALING LUNG LINH!")
    print(f"Tong so file da xu ly: {processed_files}")
    print(f"Tong so sticker lam dep: {total_stickers}")
    print(f"Thu muc chua san pham: {output_root}")
    print("="*60)

if __name__ == "__main__":
    main()
