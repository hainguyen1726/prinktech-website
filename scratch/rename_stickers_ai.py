import os
import requests
import base64
import time
from PIL import Image
import io
import re

def get_openrouter_key():
    key = os.getenv("OPENROUTER_API_KEY")
    if key:
        return key
    
    paths = [
        r"D:\16. Code\25. Claude kit\claudekit-engineer\.claude\.env",
        os.path.expanduser(r"~/.claude/.env"),
        r"D:\16. Code\32-website-prinktech\.claude\.env"
    ]
    for p in paths:
        if os.path.exists(p):
            try:
                with open(p, 'r') as f:
                    for line in f:
                        if line.strip().startswith("OPENROUTER_API_KEY="):
                            val = line.strip().split("=", 1)[1].strip()
                            if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
                                val = val[1:-1]
                            return val
            except Exception:
                pass
    return None

def clean_filename_label(text):
    # Lam sach chuoi nhan duoc tu AI de dam bao hop le lam ten file
    # Chi giu lai chu cai, chu so va dau gach duoi
    text = text.lower().strip()
    # Bo dau gach dau hoac cuoi dong neu co
    text = re.sub(r'[^a-z0-9_]', '', text)
    text = text.strip('_')
    # Gioi han do dai nhan de ten file khong qua dai
    if len(text) > 30:
        text = text[:30].strip('_')
    return text if text else "sticker"

def analyze_image_with_ai(image_path, api_key):
    try:
        # Mo anh, convert sang RGB va resize xuong 256x256 de tiet kiem dung luong
        img = Image.open(image_path)
        # Neu anh co alpha channel, ta paste len nen trang truoc khi convert RGB
        if img.mode == 'RGBA':
            background = Image.new("RGBA", img.size, (255, 255, 255))
            alpha_composite = Image.alpha_composite(background, img)
            img_rgb = alpha_composite.convert("RGB")
        else:
            img_rgb = img.convert("RGB")
            
        img_resized = img_rgb.resize((256, 256), Image.Resampling.LANCZOS)
        
        buffered = io.BytesIO()
        img_resized.save(buffered, format="JPEG", quality=80)
        img_str = base64.b64encode(buffered.getvalue()).decode('utf-8')
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        # Dung model google/gemini-2.5-flash rat re va nhanh
        payload = {
            "model": "google/gemini-2.5-flash",
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Mô tả ngắn gọn nội dung/chủ đề chính của sticker này trong 2-3 từ tiếng Việt (không dấu, viết thường, ví dụ: 'goku_sieu_saian', 'meo_cute', 'chibi_zoro', 'hoa_dao_tet'). Chỉ trả về duy nhất chuỗi đó, không thêm giải thích."
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{img_str}"
                            }
                        }
                    ]
                }
            ],
            "max_tokens": 30
        }
        
        # Thu lay ket qua toi da 3 lan neu bi loi mang
        for attempt in range(3):
            try:
                response = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload, timeout=15)
                if response.status_code == 200:
                    res_data = response.json()
                    raw_content = res_data['choices'][0]['message']['content'].strip()
                    cleaned = clean_filename_label(raw_content)
                    return cleaned
                elif response.status_code == 429: # Rate limit
                    time.sleep(2)
                else:
                    print(f"      [!] API tra ve loi {response.status_code}: {response.text}")
                    time.sleep(1)
            except requests.exceptions.RequestException:
                time.sleep(1)
                
    except Exception as e:
        print(f"      [!] Loi khi gui anh len AI: {e}")
        
    return "sticker"

def main():
    api_key = get_openrouter_key()
    if not api_key:
        print("❌ Khong tim thay OPENROUTER_API_KEY. Vui lau kiem tra lai cấu hình .env!")
        return
        
    output_root = r"D:\16. Code\32-website-prinktech\images_output"
    if not os.path.exists(output_root):
        print(f"❌ Thu muc chua anh output khong ton tai: {output_root}")
        return
        
    # Quet tat ca cac thu muc con
    folders = [f for f in os.listdir(output_root) if os.path.isdir(os.path.join(output_root, f))]
    
    print("\n" + "="*60)
    print("BAT DAU TIEU CHUAN HOA & DAT TEN ANH BANG AI VISION")
    print(f"Quet thu muc: {output_root}")
    print("="*60)
    
    total_renamed = 0
    
    # Dung mot bo dem ten de tranh ghi de file trung chu de trong cung folder
    for folder in sorted(folders):
        folder_path = os.path.join(output_root, folder)
        files = sorted(os.listdir(folder_path))
        
        # Loc file PNG dung dinh dang truoc do (co chua "sticker")
        target_files = [f for f in files if f.lower().endswith('.png') and 'sticker' in f.lower()]
        if not target_files:
            continue
            
        print(f"\n[FOLDER] {folder} (co {len(target_files)} file can dat ten)")
        
        # Theo doi cac ten file da dung trong folder hien tai de danh index tranh trung lap
        used_names_in_folder = {}
        
        for idx, filename in enumerate(target_files):
            file_path = os.path.join(folder_path, filename)
            
            # Trich xuat thong tin size tu ten file cu (vi du: set_02_sticker_01_512x512.png -> size la 512x512)
            size_match = re.search(r'_(\d+x\d+)\.png$', filename)
            size_str = size_match.group(1) if size_match else "512x512"
            
            # Goi AI de lay nhan chu de
            print(f"  [{idx+1}/{len(target_files)}] Dang phan tich: {filename}...")
            label = analyze_image_with_ai(file_path, api_key)
            print(f"    → Chu de AI nhan dien: {label}")
            
            # Kiem tra trung lap
            if label not in used_names_in_folder:
                used_names_in_folder[label] = 1
                unique_label = label
            else:
                used_names_in_folder[label] += 1
                unique_label = f"{label}_{used_names_in_folder[label]}"
                
            # Tao ten file moi
            new_filename = f"{folder}_{unique_label}_{size_str}.png"
            new_file_path = os.path.join(folder_path, new_filename)
            
            try:
                os.rename(file_path, new_file_path)
                print(f"    ✓ Da doi ten: {filename} -> {new_filename}")
                total_renamed += 1
            except Exception as e:
                print(f"    ❌ Loi khi doi ten file: {e}")
                
            # Delay nhẹ tránh overload rate limit cua OpenRouter
            time.sleep(0.5)
            
    print("\n" + "="*60)
    print("HOAN THANH DAT TEN ANH BANG AI VISION")
    print(f"Tong so anh da duoc doi ten co nghia: {total_renamed}")
    print("="*60)

if __name__ == "__main__":
    main()
