import json
import subprocess
import sys

# Đơn giá 15.000đ/tem đã gồm VAT 8% -> Đơn giá trước VAT = 15000 / 1.08 = 13888.8889
rate_excl_vat = 15000 / 1.08

items = [
    {"product": "Tem UV DTF 3D in mẫu lẻ (Bế định hình)", "size": "12x12cm", "qty": 2, "rate": rate_excl_vat},
    {"product": "Tem UV DTF 3D in mẫu lẻ (Bế định hình)", "size": "13x13cm", "qty": 2, "rate": rate_excl_vat},
    {"product": "Tem UV DTF 3D in mẫu lẻ (Bế định hình)", "size": "14x14cm", "qty": 1, "rate": rate_excl_vat}
]

cmd = [
    sys.executable,
    r"d:\16. Code\32-website-prinktech\.agents\skills\antigravity-prinktech-quote\examples\generate_multi_quote.py",
    "--output_dir", r"d:\16. Code\32-website-prinktech\bao_gia\5. Nguyen_Duc_Nghia_C_0334626393",
    "--name", "Nguyễn Đức Nghĩa",
    "--phone", "0334626393",
    "--address", "Nhà số 4 ngõ 19 Bát Tràng, xã Bát Tràng, TP Hà Nội",
    "--items_json", json.dumps(items),
    "--ship", "25000",
    "--order_code", "ORD-20260721-1505",
    "--spec_text", "Bộ 5 tem mẫu lẻ (Đã gồm VAT): 2c 12x12cm, 2c 13x13cm, 1c 14x14cm"
]

res = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
print("STDOUT:", res.stdout)
print("STDERR:", res.stderr)
