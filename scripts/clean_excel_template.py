import openpyxl
import os

template_path = r"d:\16. Code\32-website-prinktech\.agents\skills\antigravity-prinktech-quote\resources\template_bao_gia.xlsx"

if os.path.exists(template_path):
    print("Template exists. Opening...")
    wb = openpyxl.load_workbook(template_path)
    ws = wb.active
    print("Images in active sheet:", len(ws._images))
    # Xoá toàn bộ ảnh
    ws._images = []
    
    # Save đè lên chính nó
    wb.save(template_path)
    print("Saved template without images successfully.")
else:
    print("Template path does not exist.")
