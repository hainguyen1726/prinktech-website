async function run() {
  const res = await fetch('https://prinktech.netslive.com');
  const html = await res.text();
  console.log('HTML length:', html.length);
  console.log('Contains selectedProductDetail:', html.includes('selectedProductDetail'));
  console.log('Contains Bảng giá sỉ bậc thang:', html.includes('Bảng giá sỉ bậc thang'));
}

run();
