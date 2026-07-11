import os
import cv2
import numpy as np
from PIL import Image, ImageFilter, ImageChops, ImageEnhance
import math
import random

# Dinh nghia cac duong dan
BRAND_RAW_DIR = r"D:\16. Code\32-website-prinktech\images_brand_raw"
BG_RAW_DIR = r"D:\16. Code\32-website-prinktech\images_backgrounds_raw"
OUTPUT_DIR = r"D:\16. Code\32-website-prinktech\images_mockups_finished"

# Vị trí dán tối ưu (x, y, scale) cho từng loại bối cảnh để sticker nằm khớp tự nhiên
MOCKUP_PLACEMENT = {
    # Ly coc (Cylinder) - Dan o giua than ly
    "bg_cup_cafe": {"x_ratio": 0.5, "y_ratio": 0.45, "scale_ratio": 0.28, "type": "cylinder"},
    "bg_cup_studio": {"x_ratio": 0.5, "y_ratio": 0.5, "scale_ratio": 0.25, "type": "cylinder"},
    
    # Binh nuoc (Cylinder) - Dan o giua than binh
    "bg_bottle_vanphong": {"x_ratio": 0.49, "y_ratio": 0.48, "scale_ratio": 0.16, "type": "cylinder"},
    "bg_bottle_camtrai": {"x_ratio": 0.5, "y_ratio": 0.52, "scale_ratio": 0.18, "type": "cylinder"},
    
    # Laptop (Flat surface) - Dan lech goc phai hoac o giua nap
    "bg_laptop_lamviec": {"x_ratio": 0.5, "y_ratio": 0.45, "scale_ratio": 0.25, "type": "flat"},
    "bg_laptop_cafe": {"x_ratio": 0.5, "y_ratio": 0.46, "scale_ratio": 0.22, "type": "flat"},
    
    # Ba lo (Fabric texture) - Dan o ngan truoc/than balo
    "bg_backpack_congvien": {"x_ratio": 0.52, "y_ratio": 0.62, "scale_ratio": 0.22, "type": "fabric"},
    "bg_backpack_studio": {"x_ratio": 0.5, "y_ratio": 0.52, "scale_ratio": 0.22, "type": "fabric"},
    
    # Cua o to (Metal gloss) - Dan o than xe phia sau
    "bg_car_cua": {"x_ratio": 0.48, "y_ratio": 0.45, "scale_ratio": 0.26, "type": "metal"},
    
    # Suon xe dap (Thin cylinder) - Dan o suon xe doc/ngang
    "bg_bike_suon": {"x_ratio": 0.51, "y_ratio": 0.46, "scale_ratio": 0.08, "type": "cylinder"},
    
    # Than but (Very thin cylinder)
    "bg_pen_so": {"x_ratio": 0.42, "y_ratio": 0.42, "scale_ratio": 0.04, "type": "cylinder"},
    
    # Trophy pha le (Reflection / Translucent) - Dan o giua pha le
    "bg_crystal_trophy": {"x_ratio": 0.5, "y_ratio": 0.44, "scale_ratio": 0.18, "type": "glass"}
}

def clean_sticker_background(img_path, min_area=3000):
    """
    Doc sticker tu Google Flow (nen trang), tu dong tach nen trang sang trong suot
    bang contour masking de giu lai cac vung màu trang phia trong sticker.
    """
    img = cv2.imread(img_path)
    if img is None:
        return None
        
    h_img, w_img = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Tao mat na nhiphan nguoc vi nen trang tinh (255)
    # Su dung threshold thich hop (cat cac pixel co gia tri mau < 245 de giu lai sticker)
    _, thresh = cv2.threshold(gray, 245, 255, cv2.THRESH_BINARY_INV)
    
    # Morphology de lam sach bien va lap day lo nho
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
    
    # Tim contours lon de xac dinh vi tri sticker
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None
        
    # Lay contour co dien tich lon nhat ( sticker chinh)
    main_contour = max(contours, key=cv2.contourArea)
    if cv2.contourArea(main_contour) < min_area:
        return None
        
    x, y, w, h = cv2.boundingRect(main_contour)
    
    # Crop sticker tu anh goc
    crop_img = img[y:y+h, x:x+w]
    
    # Tao mat na alpha cuc bo de xoa nen bien ngoai
    local_mask = np.zeros((h, w), dtype=np.uint8)
    c_offset = main_contour - [x, y]
    cv2.drawContours(local_mask, [c_offset], -1, 255, -1)
    
    # Lam muot mask bang GaussianBlur nhe de tranh rang cua vien
    local_mask = cv2.GaussianBlur(local_mask, (3, 3), 0)
    
    # Tron lai kenh màu thanh RGBA
    b, g, r = cv2.split(crop_img)
    rgba = cv2.merge([b, g, r, local_mask])
    
    # Chuyen doi sang PIL Image
    rgba_rgb = cv2.cvtColor(rgba, cv2.COLOR_BGRA2RGBA)
    pil_img = Image.fromarray(rgba_rgb)
    
    # Trim vien thua trong suot xung quanh sticker
    bbox = pil_img.getbbox()
    if bbox:
        pil_img = pil_img.crop(bbox)
        
    return pil_img

def apply_cylindrical_warp(pil_img, r_ratio=0.85):
    """
    Uon cong sticker 3D theo be mat hinh tru (thermos, mug, pen).
    Dung thuat toan remapping cua OpenCV.
    """
    open_cv_image = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGBA2BGRA)
    h, w = open_cv_image.shape[:2]
    
    # Tinh toan ban kinh cong R dua tren w
    r = w * r_ratio
    
    # Tao ma tran anh xa map
    map_x = np.zeros((h, w), dtype=np.float32)
    map_y = np.zeros((h, w), dtype=np.float32)
    
    center_x = w / 2.0
    
    for y in range(h):
        for x in range(w):
            # Toa do x bat dau tu tam
            dx = x - center_x
            # Tinh toan toa do x moi tren be mat cong hinh tru
            # dx = R * sin(theta) -> theta = arcsin(dx / R) -> x_src = R * theta
            if abs(dx) < r:
                theta = math.asin(dx / r)
                map_x[y, x] = center_x + r * theta
            else:
                map_x[y, x] = -1 # Out of bounds
            map_y[y, x] = y
            
    # Remap anh voi song noi suy lap day cac diem lech
    warped_cv = cv2.remap(open_cv_image, map_x, map_y, cv2.INTER_CUBIC, borderMode=cv2.BORDER_CONSTANT, borderValue=(0,0,0,0))
    
    # Chuyen lai PIL Image
    warped_rgb = cv2.cvtColor(warped_cv, cv2.COLOR_BGRA2RGBA)
    return Image.fromarray(warped_rgb)

def create_3d_sticker_effects(pil_img, surface_type="flat"):
    """
    Tao hieu ung noi 3D (Drop Shadow va Emboss Varnish) cho sticker.
    Linh hoat theo tung loai be mat.
    """
    w, h = pil_img.size
    _, _, _, a = pil_img.split()
    
    # 1. Drop Shadow (Giam do mo va ban kinh cho phu hop be mat)
    shadow_offset = (3, 3)
    if surface_type == "fabric":
        shadow_offset = (1, 1) # Balo vai thi sat hon, it lech bong
    elif surface_type == "cylinder":
        shadow_offset = (2, 2)
        
    shadow_mask = Image.new("L", (w, h), 0)
    shadow_mask.paste(a, shadow_offset)
    
    blur_radius = 4 if surface_type != "fabric" else 2
    shadow_blur = shadow_mask.filter(ImageFilter.GaussianBlur(radius=blur_radius))
    
    # Tao canvas bóng
    shadow_img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    opacity = 140 if surface_type != "glass" else 80
    black_color = Image.new("RGBA", (w, h), (0, 0, 0, opacity))
    shadow_img = Image.composite(black_color, shadow_img, shadow_blur)
    
    # 2. Emboss Varnish Highlights (Vien noi bong)
    edge = a.filter(ImageFilter.Kernel((3, 3), [-1, -1, -1, -1, 8, -1, -1, -1, -1], 1, 0))
    emboss_highlight = Image.new("RGBA", (w, h), (255, 255, 255, 130))
    emboss_shadow = Image.new("RGBA", (w, h), (0, 0, 0, 100))
    
    highlight_mask = ImageChops.offset(edge, -1, -1)
    shadow_mask_offset = ImageChops.offset(edge, 1, 1)
    
    emboss_img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    emboss_img = Image.composite(emboss_highlight, emboss_img, highlight_mask)
    emboss_img = Image.composite(emboss_shadow, emboss_img, shadow_mask_offset)
    
    # Ghep lai
    final_sticker = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    final_sticker = Image.alpha_composite(final_sticker, shadow_img)
    final_sticker = Image.alpha_composite(final_sticker, pil_img)
    final_sticker = Image.alpha_composite(final_sticker, emboss_img)
    
    return final_sticker

def apply_fabric_blend(sticker_img, bg_crop):
    """
    Ap dung Displacement map nhe nhang va che do blend Multiply/Overlay 
    de sticker chim vao cac nếp gập cua ba lo vai.
    """
    w, h = sticker_img.size
    
    # Chuyen vung nen crop sang grayscale de lay displacement map (do sang tối)
    bg_gray = bg_crop.convert("L")
    
    # Chuyen ve numpy arrays
    sticker_arr = np.array(sticker_img).astype(np.float32)
    bg_gray_arr = np.array(bg_gray).astype(np.float32) / 255.0
    
    # Nhieu sac do anh sang nen (Multiply blend)
    # Tinh toan factor bien thien: am nhe tu 0.85 den 1.05 cho chan thuc
    light_factor = 0.85 + (bg_gray_arr * 0.20) # Map 0..1 vao 0.85..1.05
    
    # Nhan vao cac kenh mau RGB cua sticker
    for c in range(3):
        sticker_arr[:, :, c] = sticker_arr[:, :, c] * light_factor
        
    # Clamp va chuyen nguoc ve uint8
    sticker_arr = np.clip(sticker_arr, 0, 255).astype(np.uint8)
    return Image.fromarray(sticker_arr)

def apply_glass_reflection(sticker_img, bg_crop):
    """
    Giam opacity va blend lop phan chieu cua pha le len sticker 
    giup sticker trong nhu nam tren mat kinh / pha le.
    """
    # 1. Giam nhe opacity của sticker xuong ~90% de tao do trong suot nhe cua nhan dan pha le
    w, h = sticker_img.size
    r, g, b, a = sticker_img.split()
    a_reduced = a.point(lambda p: int(p * 0.92))
    sticker_semi = Image.merge("RGBA", (r, g, b, a_reduced))
    
    # 2. Lay highlights tu background (anh sang phan chieu tren pha le) de phu len sticker
    bg_gray = bg_crop.convert("L")
    # Lay cac vung sang hon 180 (highlights phan chieu)
    high_mask = bg_gray.point(lambda p: p if p > 180 else 0)
    high_mask_blur = high_mask.filter(ImageFilter.GaussianBlur(radius=2))
    
    # Tao lop phan chieu mau trang
    reflection_overlay = Image.new("RGBA", (w, h), (255, 255, 255, 100))
    # Chi phu highlight lech vao phan sticker (dung multiply de nhan hai mask grayscale L)
    final_mask = ImageChops.multiply(a_reduced, high_mask_blur)
    
    # Composite highlight len sticker
    final_sticker = Image.composite(reflection_overlay, sticker_semi, final_mask)
    return final_sticker

def apply_metal_reflection(sticker_img, bg_crop):
    """Tạo anh phan chieu nhe tren lop son xe o to kim loai bong"""
    w, h = sticker_img.size
    # Lay highlight tu lop son xe
    bg_gray = bg_crop.convert("L")
    high_mask = bg_gray.point(lambda p: p if p > 200 else 0)
    high_mask_blur = high_mask.filter(ImageFilter.GaussianBlur(radius=3))
    
    r, g, b, a = sticker_img.split()
    # Dung multiply cho hai mat na grayscale L
    final_mask = ImageChops.multiply(a, high_mask_blur)
    
    reflection_overlay = Image.new("RGBA", (w, h), (255, 255, 255, 80))
    final_sticker = Image.composite(reflection_overlay, sticker_img, final_mask)
    return final_sticker

def main():
    if not os.path.exists(BRAND_RAW_DIR) or not os.path.exists(BG_RAW_DIR):
        print(f"❌ [MOCKUP] Thu muc nguon khong ton tai. Vui long chay bot Playwright sinh anh truoc!")
        return
        
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Doc toan bo sticker brand sach nen
    stickers = {}
    print("\n[MOCKUP] 1. TIEN HANH DOC VA TACH NEN STICKER BRAND...")
    for f in sorted(os.listdir(BRAND_RAW_DIR)):
        if f.lower().endswith('.png'):
            fpath = os.path.join(BRAND_RAW_DIR, f)
            print(f"  → Doc va tach nen sticker: {f}...")
            pil_sticker = clean_sticker_background(fpath)
            if pil_sticker:
                label = os.path.splitext(f)[0]
                stickers[label] = pil_sticker
                
    if not stickers:
        print("❌ [MOCKUP] Khong co sticker nao duoc tach nen. Dung quy trinh.")
        return
        
    print(f"✓ [MOCKUP] Da chuan bi xong {len(stickers)} sticker brand sạch nền trong suốt.")
    
    # Doc toan bo boi canh mockup
    backgrounds = []
    for f in sorted(os.listdir(BG_RAW_DIR)):
        if f.lower().endswith('.png'):
            backgrounds.append(f)
            
    if not backgrounds:
        print("❌ [MOCKUP] Khong co anh boi canh mockup nao. Dung quy trinh.")
        return
        
    print(f"✓ [MOCKUP] Da tim thay {len(backgrounds)} anh boi canh mockup.")
    
    total_mockups_composed = 0
    
    # 2. Tien hanh ghep mockup combinatorial (ghep sticker voi boi canh)
    print("\n[MOCKUP] 2. TIEN HANH GHEP MOCKUP KHO ANH MARKETING...")
    for bg_filename in backgrounds:
        bg_label = os.path.splitext(bg_filename)[0]
        bg_path = os.path.join(BG_RAW_DIR, bg_filename)
        
        # Lay cau hinh vi tri va kieu be mat
        placement = MOCKUP_PLACEMENT.get(bg_label)
        if not placement:
            # Fallback mặc định nếu không khai báo bối cảnh đặc thù
            placement = {"x_ratio": 0.5, "y_ratio": 0.5, "scale_ratio": 0.22, "type": "flat"}
            
        surface_type = placement["type"]
        
        # Doc anh nen
        bg_img = Image.open(bg_path).convert("RGBA")
        bg_w, bg_h = bg_img.size
        
        # Voi moi boi canh, ta se dán lần lượt ALL sticker brand de tao su da dang toi da
        for sticker_label, sticker_img in stickers.items():
            try:
                # Tinh toan scale cho sticker cho hop ly voi boi canh
                target_w = int(bg_w * placement["scale_ratio"])
                aspect_ratio = sticker_img.height / sticker_img.width
                target_h = int(target_w * aspect_ratio)
                
                # Resize sticker goc
                resized_sticker = sticker_img.resize((target_w, target_h), Image.Resampling.LANCZOS)
                
                # 1. Ap dung Cylindrical Warp neu la be mat cong
                if surface_type == "cylinder":
                    # Suon xe dap va pen thi be mat cong rat hep (ban kinh nho hon)
                    r_factor = 0.90 if "bike" in bg_label or "pen" in bg_label else 0.85
                    resized_sticker = apply_cylindrical_warp(resized_sticker, r_ratio=r_factor)
                
                # Lay phan anh nen phu hop voi vi tri se dan sticker de phuc vu blend chat lieu
                x_pos = int(bg_w * placement["x_ratio"]) - (target_w // 2)
                y_pos = int(bg_h * placement["y_ratio"]) - (target_h // 2)
                
                bg_crop = bg_img.crop((x_pos, y_pos, x_pos + target_w, y_pos + target_h))
                
                # 2. Ap dung các hieu ung blend rieng cho tung chat lieu
                blended_sticker = resized_sticker
                if surface_type == "fabric":
                    blended_sticker = apply_fabric_blend(resized_sticker, bg_crop)
                elif surface_type == "glass":
                    blended_sticker = apply_glass_reflection(resized_sticker, bg_crop)
                elif surface_type == "metal":
                    blended_sticker = apply_metal_reflection(resized_sticker, bg_crop)
                    
                # 3. Tao hieu ung tem noi 3D (Drop Shadow + Emboss Varnish)
                final_sticker = create_3d_sticker_effects(blended_sticker, surface_type=surface_type)
                
                # 4. Ghep sticker noi len anh nen mockup
                mockup_canvas = bg_img.copy()
                mockup_canvas.alpha_composite(final_sticker, (x_pos, y_pos))
                
                # Chuyen ve RGB de luu dang JPEG chat luong cao (giam dung luong file dung cho web)
                final_mockup = mockup_canvas.convert("RGB")
                
                # Luu mockup thanh pham
                # Dat ten file khoa hoc: mockup_{loai_san_pham}_{brand}_{sticker}.jpg
                # Ví dụ: mockup_cup_bank_heo_dat.jpg
                prod_name = bg_label.replace("bg_", "")
                out_filename = f"mockup_{prod_name}_{sticker_label}.jpg"
                out_path = os.path.join(OUTPUT_DIR, out_filename)
                
                final_mockup.save(out_path, "JPEG", quality=90)
                total_mockups_composed += 1
                
            except Exception as e:
                print(f"    ❌ [MOCKUP] Loi khi ghep {sticker_label} vao {bg_label}: {e}")
                
    print("\n" + "="*60)
    print("HOAN THANH KHO ANH MOCKUP MARKETING THUONG HIEU!")
    print(f"Tong so anh mockup da tao thanh cong: {total_mockups_composed}")
    print(f"Thu muc mockup luu tai: {OUTPUT_DIR}")
    print("="*60)

if __name__ == "__main__":
    main()
