import { chromium, type BrowserContext, type Page } from 'playwright'
import { promises as fs } from 'fs'
import path from 'path'

// ============================================================
// ⚙️ CẤU HÌNH HỆ THỐNG & ĐƯỜNG DẪN
// ============================================================
const OUTPUT_DIR = 'D:/16. Code/32-website-prinktech/images/mockups'
const PROFILE_DIR = 'C:\\Users\\Admin\\.gemini\\antigravity\\vbee-chrome-profile'
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
// Project cố định của người dùng để sinh ảnh không giới hạn, không cần tạo project mới
const FLOW_URL = 'https://labs.google/fx/tools/flow/project/406375de-f8bf-41a0-8b0a-f17e87763db4'

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

/** Tạo tên file chuẩn: mockup_{vật_phẩm}_{chất_liệu}_{màu}_{bối_cảnh}_{tỉ_lệ}_{index}.png */
function makeFileName(item: string, material: string, color: string, bg: string, ratio: string, index: number): string {
  const sanitize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const idx = String(index).padStart(3, '0')
  return `mockup_${sanitize(item)}_${sanitize(material)}_${sanitize(color)}_${sanitize(bg)}_${sanitize(ratio.toLowerCase())}_${idx}.png`
}

// ============================================================
// 📝 DANH SÁCH 100 PROMPT MOCKUP ĐÃ TỐI ƯU HÓA (NỔI BẬT SẢN PHẨM & GÓC DIỆN TÍCH LỚN)
// ============================================================
interface MockupPrompt {
  item: string;
  material: string;
  color: string;
  background: string;
  ratio: 'SQUARE' | 'PORTRAIT' | 'LANDSCAPE';
  prompt: string;
}

const PROMPTS: MockupPrompt[] = [
  // BATCH 0: 5 PROMPT CHẠY THỬ NGHIỆM ĐỂ AI AGENT KIỂM ĐỊNH CHẤT LƯỢNG TRỰC QUAN
  {
    item: 'dropper-bottle',
    material: 'glass',
    color: 'matte-white',
    background: 'beige-concrete-podium',
    ratio: 'SQUARE',
    prompt: 'A close-up, centered product mockup of a blank, matte white cosmetic glass dropper bottle with a light wood lid. The bottle stands prominently on a beige concrete pedestal, occupying 65% of the frame. Studio lighting, minimal aesthetic, strongly blurred warm beige background, plain solid color bottle body with absolutely no prints, designs, stickers or labels, clean sleek surface.'
  },
  {
    item: 'thermos',
    material: 'stainless-steel',
    color: 'matte-black',
    background: 'wooden-desk',
    ratio: 'SQUARE',
    prompt: 'A close-up, centered product mockup of a blank, solid matte black stainless steel thermos travel mug. The thermos stands vertically on a wooden desk, occupying 65% of the frame. Soft office window lighting, strongly blurred modern office interior in the background, completely plain bottle surface with absolutely no prints, designs, stickers or labels, smooth unadorned black texture.'
  },
  {
    item: 'motorcycle-helmet',
    material: 'glossy-plastic',
    color: 'pure-white',
    background: 'outdoor-cafe',
    ratio: 'SQUARE',
    prompt: 'A close-up, centered product mockup showing the smooth side panel of a blank glossy white full-face motorcycle helmet. The camera faces the large, flat, curved side shell directly — NOT the visor or face area. The helmet sits on a wooden bench, the smooth white shell side occupying 70% of the frame. Soft golden light, strongly blurred outdoor cafe background. The side shell is completely clean with absolutely no prints, decals, logos, stickers or graphics.'
  },
  {
    item: 'laptop',
    material: 'aluminum',
    color: 'space-gray',
    background: 'coffee-shop-desk',
    ratio: 'LANDSCAPE',
    prompt: 'A close-up, front-facing product mockup showing the plain back of an open laptop screen lid. The laptop lid is solid space gray color, standing vertically on a wooden table, occupying 70% of the frame and providing a large, flat, centered rectangular display area. Bright coffee shop background is strongly blurred, completely clean and bare metal lid surface with absolutely no prints, logos, designs, stickers or marks.'
  },
  {
    item: 'ceramic-mug',
    material: 'ceramic',
    color: 'mint-green',
    background: 'marble-kitchen-counter',
    ratio: 'PORTRAIT',
    prompt: 'A close-up, centered product mockup of a blank ceramic mug. The mug is a solid glossy mint green color, standing on a marble kitchen countertop, occupying 65% of the frame. Warm morning light, strongly blurred kitchen background, completely smooth cup surface with absolutely no designs, prints, text, stickers or labels.'
  },

  // === NHÓM 1: ĐỒ DÙNG CÁ NHÂN & VĂN PHÒNG ===
  {
    item: 'backpack',
    material: 'polyester',
    color: 'pastel-pink',
    background: 'minimalist-concrete-step',
    ratio: 'PORTRAIT',
    prompt: 'A close-up, centered product mockup of a blank plain polyester backpack. The backpack is solid pastel pink color, standing vertically on a concrete step, occupying 65% of the frame. Clean studio lighting, strongly blurred minimalist background, smooth clean fabric surface with absolutely no prints, labels, logos, stickers or patterns.'
  },
  {
    item: 'notebook',
    material: 'leather',
    color: 'dark-brown',
    background: 'rustic-wooden-table',
    ratio: 'SQUARE',
    prompt: 'A close-up, front-facing product mockup showing the cover of a closed leather notebook. The notebook is solid dark brown color, lying centered on a wooden table, occupying 70% of the frame. Soft natural side lighting, strongly blurred rustic background, completely clean unadorned leather cover with absolutely no prints, designs, stickers or text.'
  },
  {
    item: 'gel-pen',
    material: 'matte-plastic',
    color: 'pure-white',
    background: 'white-office-desk',
    ratio: 'SQUARE',
    prompt: 'A close-up macro product mockup of a blank plastic ballpoint pen lying horizontally. The camera is positioned at the side to show the full cylindrical barrel of the pen clearly. The pen body is solid matte white, lying on a clean white surface, the long smooth barrel occupying 65% of the frame diagonally. Soft natural side lighting, strongly blurred background. The barrel surface is completely plain with absolutely no text, clip prints, brand logos, or stickers.'
  },
  {
    item: 'water-bottle',
    material: 'tritan-plastic',
    color: 'clear-frosted',
    background: 'gym-bench',
    ratio: 'PORTRAIT',
    prompt: 'A close-up, centered product mockup of a blank transparent frosted plastic sports water bottle. The bottle stands vertically on a gym bench, occupying 65% of the frame. Strongly blurred active gym background, completely plain bottle surface with absolutely no prints, designs, logos, stickers or labels.'
  },
  {
    item: 'glass-tumbler',
    material: 'glass',
    color: 'amber-transparent',
    background: 'wooden-bedside-table',
    ratio: 'SQUARE',
    prompt: 'A close-up, centered mockup of a blank amber transparent glass tumbler with a bamboo lid. The tumbler stands vertically on a bedside table, occupying 65% of the frame. Warm morning sunlight, strongly blurred cozy bedroom background, completely smooth glass surface with absolutely no prints, designs, stickers or labels.'
  },
  {
    item: 'phone-case',
    material: 'silicone',
    color: 'lavender-purple',
    background: 'beige-linen-fabric',
    ratio: 'SQUARE',
    prompt: 'A close-up, front-facing flatlay mockup showing the back of a silicone phone case. The case is solid lavender purple, lying centered on a beige linen fabric, occupying 70% of the frame. Soft aesthetic lighting, strongly blurred fabric folds, completely clean surface with absolutely no prints, designs, logos, stickers or labels.'
  },
  {
    item: 'mug-with-cork',
    material: 'ceramic-cork',
    color: 'matte-white',
    background: 'workspace-desk',
    ratio: 'SQUARE',
    prompt: 'A close-up, centered mockup of a blank ceramic mug with a cork base. The mug body is a solid matte white ceramic, sitting on a workspace desk, occupying 65% of the frame. Modern office background strongly blurred, completely smooth ceramic surface with absolutely no prints, designs, stickers or labels.'
  },
  {
    item: 'stainless-tumbler',
    material: 'stainless-steel',
    color: 'olive-green',
    background: 'car-cup-holder',
    ratio: 'PORTRAIT',
    prompt: 'A close-up, centered mockup of a blank stainless steel travel tumbler. The tumbler is solid olive green color, sitting vertically in a cup holder, occupying 65% of the frame. Strongly blurred car interior background, completely plain cup surface with absolutely no prints, designs, logos, stickers or labels.'
  },
  {
    item: 'keyboard',
    material: 'plastic',
    color: 'retro-beige',
    background: 'desk-mat',
    ratio: 'LANDSCAPE',
    prompt: 'A close-up product mockup showing the flat, smooth palm rest / wrist rest area at the bottom front of a mechanical keyboard. The keyboard is solid retro beige color, resting on a dark desk mat. Camera shoots from a slightly elevated front angle so the wide, flat, smooth palm rest surface is the dominant visual element occupying 65% of the frame. Strongly blurred background. The palm rest surface is completely blank with absolutely no logos, prints, brand names, stickers or markings.'
  },
  {
    item: 'headphones',
    material: 'matte-plastic',
    color: 'sand-beige',
    background: 'wooden-stand',
    ratio: 'SQUARE',
    prompt: 'A close-up, centered product mockup showing the flat outer disc surface of one wireless over-ear headphone earcup. The camera faces directly at the large, smooth, circular outer earcup plate — this flat disc is the sticker placement area. The earcup is solid sand beige matte plastic, occupying 70% of the frame. Minimalist background strongly blurred. The outer earcup disc surface is completely plain with absolutely no logos, prints, brand markings, stickers or designs.'
  },

  // === NHÓM 2: CHAI LỌ & HỘP ĐỰNG ===
  {
    item: 'cosmetic-jar',
    material: 'frosted-glass',
    color: 'semi-clear',
    background: 'white-marble-slab',
    ratio: 'SQUARE',
    prompt: 'A close-up, centered product mockup of a blank cosmetic cream jar. The jar is made of frosted glass with a gold metallic lid, standing on a marble slab, occupying 65% of the frame. Studio lighting with water reflections, strongly blurred clean background, completely plain glass surface with absolutely no prints, designs, stickers or labels.'
  },
  {
    item: 'shampoo-bottle',
    material: 'matte-plastic',
    color: 'terracotta-orange',
    background: 'bathroom-shelf',
    ratio: 'PORTRAIT',
    prompt: 'A close-up, centered product mockup of a blank shampoo bottle with a pump. The bottle is solid terracotta orange, standing vertically on a wooden shelf, occupying 65% of the frame. Strongly blurred bathroom background, completely plain bottle body with absolutely no prints, designs, stickers or labels.'
  },
  {
    item: 'perfume-bottle',
    material: 'crystal-glass',
    color: 'transparent-pink',
    background: 'vanity-table',
    ratio: 'SQUARE',
    prompt: 'A close-up, centered mockup of a blank crystal perfume bottle with a transparent cap. The bottle is filled with pink liquid, sitting on a vanity table, occupying 65% of the frame. Backlit studio lighting, strongly blurred vanity background, completely plain glass surface with absolutely no prints, designs, stickers or labels.'
  },
  {
    item: 'cardboard-box',
    material: 'kraft-paper',
    color: 'natural-brown',
    background: 'studio-backdrop',
    ratio: 'SQUARE',
    prompt: 'A close-up, centered mockup of a blank cardboard shipping box. The box is natural brown kraft paper, standing vertically on a grey background, occupying 65% of the frame. Minimalist studio lighting, strongly blurred studio backdrop, completely plain box surface with absolutely no prints, designs, tape, text, stickers or labels.'
  },
  {
    item: 'mailing-tube',
    material: 'cardboard',
    color: 'matte-black',
    background: 'concrete-floor',
    ratio: 'LANDSCAPE',
    prompt: 'A close-up mockup of a blank cardboard mailing tube with white caps. The tube is solid matte black, lying centered on a concrete floor, occupying 60% of the frame. Dramatic shadows, strongly blurred concrete background, completely plain tube surface with absolutely no prints, designs, stickers or labels.'
  },
  {
    item: 'spray-bottle',
    material: 'amber-glass',
    color: 'amber-brown',
    background: 'wooden-bench',
    ratio: 'PORTRAIT',
    prompt: 'A close-up, centered product mockup of a blank amber glass spray bottle with a black trigger. The bottle stands vertically on a wooden bench, occupying 65% of the frame. Strongly blurred green garden background, completely plain glass surface with absolutely no prints, designs, stickers or labels.'
  },
  {
    item: 'wine-bottle',
    material: 'glass',
    color: 'dark-green',
    background: 'wine-cellar',
    ratio: 'PORTRAIT',
    prompt: 'A close-up, centered mockup of a blank wine bottle. The bottle is dark green glass, standing vertically on a rustic table, occupying 65% of the frame. Dimly lit wine cellar background strongly blurred, completely plain glass surface with absolutely no paper labels, prints, designs, or stickers.'
  },
  {
    item: 'beer-can',
    material: 'aluminum',
    color: 'silver-metallic',
    background: 'ice-bucket',
    ratio: 'PORTRAIT',
    prompt: 'A close-up, centered mockup of a blank aluminum beer can. The can is raw silver metallic, covered with water droplets, sitting in an ice bucket, occupying 65% of the frame. Strongly blurred summer background, completely plain metallic can surface with absolutely no prints, designs, stickers or labels.'
  },
  {
    item: 'mason-jar',
    material: 'glass',
    color: 'clear-transparent',
    background: 'wooden-dining-table',
    ratio: 'SQUARE',
    prompt: 'A close-up, centered mockup of a blank clear glass mason jar. The jar is empty with a silver screw lid, standing vertically on a wooden table, occupying 65% of the frame. Strongly blurred warm kitchen background, completely smooth glass surface with absolutely no prints, designs, stickers or labels.'
  },
  {
    item: 'honey-jar',
    material: 'glass',
    color: 'clear-golden',
    background: 'wooden-pantry',
    ratio: 'SQUARE',
    prompt: 'A close-up, centered mockup of a blank glass honey jar. The jar is filled with golden honey with a gold lid, standing vertically on a pantry shelf, occupying 65% of the frame. Strongly blurred pantry background, completely plain glass surface with absolutely no paper labels, prints, designs, or stickers.'
  },
  {
    item: 'plastic-tub',
    material: 'glossy-plastic',
    color: 'pure-white',
    background: 'studio-backdrop',
    ratio: 'SQUARE',
    prompt: 'A close-up, centered product mockup of a blank white plastic tub container. The tub is solid white color, standing vertically on a blue background, occupying 65% of the frame. Clean studio lighting, strongly blurred studio backdrop, completely plain surface with absolutely no prints, designs, stickers or labels.'
  },
  {
    item: 'pill-bottle',
    material: 'amber-plastic',
    color: 'amber-orange',
    background: 'white-countertop',
    ratio: 'PORTRAIT',
    prompt: 'A close-up, centered mockup of a blank amber plastic pill bottle. The bottle has a white cap, standing vertically on a white countertop, occupying 65% of the frame. Strongly blurred clinical background, completely plain plastic surface with absolutely no paper labels, prints, designs, or stickers.'
  },
  {
    item: 'soda-bottle',
    material: 'pet-plastic',
    color: 'clear-transparent',
    background: 'picnic-blanket',
    ratio: 'PORTRAIT',
    prompt: 'A close-up, centered mockup of a blank transparent plastic soda bottle. The bottle is filled with carbonated water, standing vertically on a picnic blanket, occupying 65% of the frame. Strongly blurred park background, completely plain plastic surface with absolutely no plastic wrap labels, prints, designs, or stickers.'
  },
  {
    item: 'lotion-tube',
    material: 'matte-plastic',
    color: 'sage-green',
    background: 'stone-slab',
    ratio: 'SQUARE',
    prompt: 'A close-up, centered product mockup of a blank cosmetic lotion tube. The tube is solid sage green, lying flat on a stone slab, occupying 65% of the frame. Soft shadows, strongly blurred skincare studio background, completely plain tube body with absolutely no prints, designs, stickers or labels.'
  },
  {
    item: 'tin-can',
    material: 'tinplate',
    color: 'matte-white',
    background: 'minimalist-shelf',
    ratio: 'SQUARE',
    prompt: 'A close-up, centered mockup of a blank cylindrical tin can. The tin is solid matte white painted metal, standing vertically on a shelf, occupying 65% of the frame. Strongly blurred kitchen storage background, completely plain metal surface with absolutely no prints, designs, stickers or paper labels.'
  },
  {
    item: 'sauce-bottle',
    material: 'glass',
    color: 'clear-transparent',
    background: 'kitchen-island',
    ratio: 'PORTRAIT',
    prompt: 'A close-up, centered mockup of a blank glass sauce bottle. The bottle is filled with red ketchup with a black cap, standing vertically on a kitchen island, occupying 65% of the frame. Strongly blurred kitchen background, completely plain glass surface with absolutely no paper labels, prints, designs, or stickers.'
  },
  {
    item: 'juice-carton',
    material: 'paperboard',
    color: 'pure-white',
    background: 'wooden-table',
    ratio: 'PORTRAIT',
    prompt: 'A close-up, centered mockup of a blank paperboard juice carton. The carton is solid white with a plastic cap, standing vertically on a table, occupying 65% of the frame. Strongly blurred kitchen background, completely plain carton surface with absolutely no prints, designs, illustrations, stickers or labels.'
  },
  {
    item: 'supplement-bottle',
    material: 'matte-plastic',
    color: 'matte-black',
    background: 'gym-locker',
    ratio: 'PORTRAIT',
    prompt: 'A close-up, centered mockup of a blank supplement bottle. The bottle is solid matte black, standing vertically on a gym locker shelf, occupying 65% of the frame. Strongly blurred gym background, completely plain container body with absolutely no prints, designs, logos, stickers or labels.'
  },
  {
    item: 'essential-oil-bottle',
    material: 'amber-glass',
    color: 'amber-brown',
    background: 'wooden-tray',
    ratio: 'SQUARE',
    prompt: 'A close-up, centered mockup of a small amber glass essential oil bottle. The bottle stands vertically on a wooden tray, occupying 65% of the frame. Soft warm lighting, strongly blurred aromatherapy spa background, completely plain glass surface with absolutely no prints, designs, stickers or labels.'
  },
  {
    item: 'gift-box',
    material: 'cardboard',
    color: 'matte-black',
    background: 'velvet-cloth',
    ratio: 'SQUARE',
    prompt: 'A close-up, centered mockup of a blank luxury cardboard gift box. The box is solid matte black, sitting centered on a velvet cloth, occupying 65% of the frame. Strongly blurred dark background, completely plain box surface with absolutely no logos, prints, ribbons, stickers or labels.'
  },

  // === NHÓM 3: PHƯƠNG TIỆN & THIẾT BỊ BẢO HỘ ===
  {
    item: 'car-hood',
    material: 'glossy-metal',
    color: 'metallic-silver',
    background: 'modern-showroom',
    ratio: 'LANDSCAPE',
    prompt: 'A close-up, centered product mockup showing a clean metal panel on a car hood. The hood is glossy metallic silver paint, occupying 70% of the frame. Soft showroom light reflections, strongly blurred car showroom background, completely clean painted surface with absolutely no logos, emblems, prints, or stickers.'
  },
  {
    item: 'car-door',
    material: 'glossy-metal',
    color: 'glossy-black',
    background: 'city-street',
    ratio: 'LANDSCAPE',
    prompt: 'A close-up, front-facing product mockup showing the flat outer door panel of a car door. The panel is glossy black paint, occupying 70% of the frame. Soft dusk light reflections, strongly blurred city street in the background, completely plain metal panel with absolutely no logos, handles, prints, or stickers.'
  },
  {
    item: 'motorcycle-gas-tank',
    material: 'glossy-metal',
    color: 'glossy-red',
    background: 'garage-workshop',
    ratio: 'SQUARE',
    prompt: 'A close-up, centered product mockup showing the side panel of a motorcycle gas tank. The tank is glossy red paint, occupying 65% of the frame. Soft workshop lighting, strongly blurred garage workshop background, completely clean painted metal surface with absolutely no logos, graphics, text, or stickers.'
  },
  {
    item: 'motorcycle-fairing',
    material: 'plastic-paint',
    color: 'glossy-white',
    background: 'outdoor-parking',
    ratio: 'LANDSCAPE',
    prompt: 'A close-up product mockup showing the flat side fairing panel of a motorcycle. The panel is glossy white paint, occupying 70% of the frame. Soft outdoor daylight, strongly blurred parking lot background, completely clean plastic panel with absolutely no decals, graphics, sponsor logos, or stickers.'
  },
  {
    item: 'bicycle-frame',
    material: 'aluminum',
    color: 'matte-gray',
    background: 'brick-wall',
    ratio: 'LANDSCAPE',
    prompt: 'A close-up product mockup showing the main diagonal frame tube of a bicycle. The frame tube is solid matte gray, occupying 65% of the frame. Soft morning light, strongly blurred red brick wall background, completely plain metal tube surface with absolutely no brand logos, text, prints, or stickers.'
  },
  {
    item: 'bicycle-helmet',
    material: 'eps-foam-plastic',
    color: 'matte-black',
    background: 'wooden-bench',
    ratio: 'SQUARE',
    prompt: 'A close-up, centered product mockup showing the smooth side dome of a blank bicycle helmet. Camera faces the large, smooth curved side surface of the helmet — NOT the front or visor area. The helmet is solid matte black, sitting on a wooden bench, the broad smooth side dome occupying 70% of the frame. Strongly blurred outdoor park background. The side dome surface is completely clean with absolutely no logos, graphics, air vent prints, or stickers.'
  },
  {
    item: 'skateboard-deck',
    material: 'maple-wood',
    color: 'natural-wood',
    background: 'concrete-skatepark',
    ratio: 'PORTRAIT',
    prompt: 'A close-up, front-facing product mockup showing the plain wooden underside of a skateboard deck. The underside is natural maple wood grain, standing vertically, occupying 70% of the frame. Strongly blurred concrete skatepark background, completely plain wooden surface with absolutely no graphics, drawings, logos, or stickers.'
  },
  {
    item: 'car-window',
    material: 'glass',
    color: 'tinted-black',
    background: 'suburban-driveway',
    ratio: 'LANDSCAPE',
    prompt: 'A close-up, front-facing mockup of a car side window. The window is clean tinted black glass, occupying 70% of the frame. Soft outdoor light reflections, strongly blurred suburban background, completely clean glass surface with absolutely no decals, stickers, or text.'
  },
  {
    item: 'scooter-body',
    material: 'glossy-plastic',
    color: 'pastel-mint',
    background: 'urban-sidewalk',
    ratio: 'PORTRAIT',
    prompt: 'A close-up, front-facing product mockup showing the flat front body panel of an electric scooter. The panel is glossy pastel mint green, occupying 65% of the frame. Soft daylight, strongly blurred sidewalk background, completely plain plastic surface with absolutely no brand emblems, decals, or stickers.'
  },
  {
    item: 'car-bumper',
    material: 'glossy-metal',
    color: 'metallic-blue',
    background: 'garage',
    ratio: 'LANDSCAPE',
    prompt: 'A close-up, front-facing mockup showing the flat rear bumper panel of a car. The panel is glossy metallic blue paint, occupying 70% of the frame. Soft garage lighting, strongly blurred clean garage background, completely clean bumper surface with absolutely no decals, license plates, badges, or stickers.'
  },

  // === NHÓM 4: BỐI CẢNH & VẬT PHẨM DECOR KHÁC ===
  {
    item: 'suitcase',
    material: 'polycarbonate',
    color: 'matte-navy-blue',
    background: 'airport-terminal',
    ratio: 'PORTRAIT',
    prompt: 'A close-up, front-facing product mockup of the flat front side of a travel suitcase. The suitcase is solid matte navy blue polycarbonate, standing vertically, occupying 70% of the frame. Strongly blurred airport terminal background, completely plain surface with absolutely no logos, luggage tags, prints, or stickers.'
  },
  {
    item: 'guitar-body',
    material: 'polished-wood',
    color: 'sunburst-brown',
    background: 'music-studio',
    ratio: 'PORTRAIT',
    prompt: 'A close-up, front-facing product mockup showing the flat wooden back of an acoustic guitar body. The guitar is polished sunburst brown wood grain, standing vertically on a stand, occupying 70% of the frame. Strongly blurred cozy music studio background, completely clean wooden surface with absolutely no logos, pickguards, prints, or stickers.'
  },
  {
    item: 'coffee-tumbler',
    material: 'matte-ceramic',
    color: 'cream-white',
    background: 'cafe-table',
    ratio: 'SQUARE',
    prompt: 'A close-up, centered mockup of a blank coffee tumbler. The tumbler is solid matte cream white, standing vertically on a table, occupying 65% of the frame. Strongly blurred cafe background, completely plain tumbler surface with absolutely no logos, prints, text, or stickers.'
  },
  {
    item: 'delivery-box',
    material: 'cardboard',
    color: 'kraft-brown',
    background: 'front-porch',
    ratio: 'LANDSCAPE',
    prompt: 'A close-up, centered mockup of a blank cardboard box. The box is natural kraft brown, sitting centered on a porch, occupying 65% of the frame. Soft daylight, strongly blurred house porch background, completely plain box surface with absolutely no shipping labels, tape markings, prints, or stickers.'
  },
  {
    item: 'mug-on-coaster',
    material: 'ceramic',
    color: 'pastel-yellow',
    background: 'marble-coaster-table',
    ratio: 'SQUARE',
    prompt: 'A close-up, centered product mockup of a blank ceramic mug. The mug is solid pastel yellow, sitting on a marble coaster, occupying 65% of the frame. Strongly blurred cozy living room background, completely smooth cup surface with absolutely no prints, designs, stickers or labels.'
  }
];

// 50 PROMPT MỚI HOÀN TOÀN — ĐA DẠNG SẢN PHẨM, MẶT DÁN STICKER RÕ RÀNG
PROMPTS.push(
  // === NHÓM 5: ĐỒ THỂ THAO & OUTDOOR ===
  { item: 'yoga-mat', material: 'rubber', color: 'sage-green', background: 'wooden-floor', ratio: 'SQUARE',
    prompt: 'A close-up product mockup showing the flat top surface of a blank yoga mat. The mat is solid sage green rubber, rolled out flat on a wooden floor, the wide flat surface occupying 70% of the frame. Strongly blurred minimalist studio background. The mat surface is completely clean with absolutely no prints, logos, or designs.' },
  { item: 'football', material: 'synthetic-leather', color: 'pure-white', background: 'grass-field', ratio: 'SQUARE',
    prompt: 'A close-up, centered product mockup of a blank football. The ball is solid white synthetic leather, resting on green grass, occupying 65% of the frame. Strongly blurred grass field background. The ball surface panels are completely plain white with absolutely no prints, logos, sponsor marks or stickers.' },
  { item: 'bicycle-water-bottle', material: 'bpa-free-plastic', color: 'electric-blue', background: 'bicycle-cage', ratio: 'PORTRAIT',
    prompt: 'A close-up, centered product mockup of a blank plastic cycling water bottle. The bottle is solid electric blue, sitting vertically in a bicycle cage, occupying 65% of the frame. Strongly blurred outdoor road background. The bottle body is completely plain with absolutely no prints, logos, stickers or labels.' },
  { item: 'tennis-racket', material: 'carbon-fiber', color: 'matte-black', background: 'clay-court', ratio: 'PORTRAIT',
    prompt: 'A close-up product mockup showing the smooth flat throat/neck area of a blank tennis racket frame. The frame is solid matte black carbon fiber, held vertically, the flat elongated throat plate area occupying 65% of the frame. Strongly blurred clay court background. The frame surface is completely blank with absolutely no logos, brand text, or stickers.' },
  { item: 'protein-shaker', material: 'tritan-plastic', color: 'electric-red', background: 'gym-counter', ratio: 'PORTRAIT',
    prompt: 'A close-up, centered product mockup of a blank protein shaker bottle. The shaker is solid electric red plastic, standing on a gym counter, occupying 65% of the frame. Strongly blurred gym background. The bottle body is completely plain with absolutely no prints, logos, measurements text, stickers or labels.' },

  // === NHÓM 6: ĐỒ ĐIỆN TỬ & CÔNG NGHỆ ===
  { item: 'power-bank', material: 'aluminum', color: 'matte-silver', background: 'desk-mat', ratio: 'SQUARE',
    prompt: 'A close-up, front-facing product mockup showing the flat top face of a blank aluminum power bank. The power bank is solid matte silver, lying flat on a desk mat, the large flat rectangular top surface occupying 70% of the frame. Strongly blurred background. The top surface is completely clean with absolutely no prints, logos, port labels, or stickers.' },
  { item: 'wireless-charger-pad', material: 'matte-plastic', color: 'matte-white', background: 'desk-mat', ratio: 'SQUARE',
    prompt: 'A close-up, top-down product mockup showing the flat circular surface of a blank wireless charger pad. The pad is solid matte white, lying flat on a dark desk mat, the flat disc surface occupying 70% of the frame. Strongly blurred background. The pad surface is completely clean with absolutely no prints, logos, indicators, or stickers.' },
  { item: 'usb-drive', material: 'metal', color: 'brushed-gold', background: 'laptop-keyboard', ratio: 'SQUARE',
    prompt: 'A close-up macro mockup showing the flat body of a blank USB flash drive. The drive is brushed gold metal, lying on a keyboard, the flat rectangular metal body occupying 65% of the frame. Strongly blurred background. The metal surface is completely plain with absolutely no prints, logos, capacity text, or stickers.' },
  { item: 'tablet-case', material: 'leather', color: 'dark-navy', background: 'wooden-desk', ratio: 'LANDSCAPE',
    prompt: 'A close-up, front-facing product mockup showing the flat cover of a blank leather tablet case. The case is dark navy blue, closed and lying flat on a wooden desk, the large flat cover surface occupying 70% of the frame. Strongly blurred background. The leather cover is completely clean with absolutely no prints, logos, embossing, or stickers.' },
  { item: 'smartwatch-band', material: 'silicone', color: 'coral-orange', background: 'white-surface', ratio: 'SQUARE',
    prompt: 'A close-up product mockup showing the flat outer surface of a blank silicone smartwatch band. The band is solid coral orange, lying flat on a white surface, the smooth flat band face occupying 65% of the frame. Strongly blurred background. The band surface is completely plain with absolutely no prints, patterns, logos, or stickers.' },

  // === NHÓM 7: ĐỒ GIA DỤNG & NHÀ BẾP ===
  { item: 'ceramic-bowl', material: 'ceramic', color: 'matte-terracotta', background: 'marble-counter', ratio: 'SQUARE',
    prompt: 'A close-up, centered product mockup showing the outer curved wall of a blank ceramic bowl. The bowl is solid matte terracotta color, sitting on a marble counter, with the camera angled to show the smooth outer wall occupying 65% of the frame. Strongly blurred background. The outer surface is completely plain with absolutely no prints, designs, or stickers.' },
  { item: 'thermos-flask-tall', material: 'stainless-steel', color: 'forest-green', background: 'kitchen-counter', ratio: 'PORTRAIT',
    prompt: 'A close-up, centered product mockup of a blank tall thermos flask. The flask is solid forest green stainless steel, standing vertically on a kitchen counter, occupying 65% of the frame. Strongly blurred modern kitchen background. The flask body is completely plain with absolutely no prints, text, logos, stickers or labels.' },
  { item: 'cutting-board', material: 'bamboo', color: 'natural-wood', background: 'kitchen-counter', ratio: 'LANDSCAPE',
    prompt: 'A close-up, top-down product mockup showing the flat top surface of a blank bamboo cutting board. The board has natural wood grain, lying flat on a kitchen counter, the smooth flat surface occupying 70% of the frame. Strongly blurred background. The wood surface is completely clean with absolutely no burns, logos, prints, or stickers.' },
  { item: 'glass-jar-wide', material: 'glass', color: 'clear-frosted', background: 'pantry-shelf', ratio: 'SQUARE',
    prompt: 'A close-up, centered product mockup of a blank wide-mouth frosted glass storage jar. The jar is clear frosted glass with a bamboo lid, standing on a pantry shelf, occupying 65% of the frame. Strongly blurred background. The glass surface is completely smooth with absolutely no paper labels, prints, designs, or stickers.' },
  { item: 'candle-tin', material: 'metal-tin', color: 'matte-black', background: 'marble-tray', ratio: 'SQUARE',
    prompt: 'A close-up, front-facing product mockup showing the side of a blank candle tin. The tin is solid matte black with a lid, sitting on a marble tray, the smooth cylindrical side surface occupying 65% of the frame. Strongly blurred background. The tin surface is completely plain with absolutely no prints, logos, stickers or labels.' },

  // === NHÓM 8: THỜI TRANG & PHỤ KIỆN ===
  { item: 'snapback-cap', material: 'cotton-twill', color: 'black', background: 'wooden-stand', ratio: 'SQUARE',
    prompt: 'A close-up, centered product mockup showing the flat front panel of a blank snapback cap. The cap is solid black cotton twill, displayed on a wooden hat stand, with the camera facing the smooth flat front panel occupying 70% of the frame. Strongly blurred background. The front panel is completely blank with absolutely no embroidery, prints, logos, or stickers.' },
  { item: 'leather-wallet', material: 'genuine-leather', color: 'tan-brown', background: 'linen-fabric', ratio: 'LANDSCAPE',
    prompt: 'A close-up product mockup showing the flat front face of a blank leather bifold wallet. The wallet is tan brown genuine leather, lying flat closed on a linen fabric surface, the flat front face occupying 70% of the frame. Strongly blurred background. The leather surface is completely clean with absolutely no prints, logo embossing, stitching text, or stickers.' },
  { item: 'sunglasses-case', material: 'faux-leather', color: 'burgundy-red', background: 'white-marble', ratio: 'LANDSCAPE',
    prompt: 'A close-up, front-facing mockup showing the flat lid of a blank sunglasses hard case. The case is solid burgundy red faux leather, closed and lying flat on white marble, the smooth flat lid surface occupying 65% of the frame. Strongly blurred background. The surface is completely clean with absolutely no prints, logos, or stickers.' },
  { item: 'keychain-tag', material: 'leather', color: 'cognac-brown', background: 'keys-surface', ratio: 'SQUARE',
    prompt: 'A close-up macro mockup showing the flat front face of a blank leather luggage tag / keychain tag. The tag is cognac brown leather, lying flat, the smooth rectangular face occupying 70% of the frame. Strongly blurred background. The leather face is completely plain with absolutely no text, prints, logos, or stickers.' },
  { item: 'bucket-hat', material: 'cotton', color: 'khaki-beige', background: 'outdoor-table', ratio: 'SQUARE',
    prompt: 'A close-up, centered product mockup showing the front and top dome of a blank bucket hat. The hat is solid khaki beige cotton, lying flat or displayed on a table, the smooth fabric front panel occupying 65% of the frame. Strongly blurred background. The fabric surface is completely plain with absolutely no prints, logos, embroidery, or stickers.' },

  // === NHÓM 9: VĂN PHÒNG PHẨM & HỌC TẬP ===
  { item: 'hardcover-book', material: 'cloth-cover', color: 'navy-blue', background: 'wooden-desk', ratio: 'PORTRAIT',
    prompt: 'A close-up, front-facing product mockup showing the smooth cover spine area of a blank hardcover book. The book is solid navy blue cloth-bound cover, standing vertically on a desk, the flat cover face occupying 70% of the frame. Strongly blurred background. The cover is completely blank with absolutely no title, graphics, spine text, or stickers.' },
  { item: 'stapler', material: 'metal-plastic', color: 'matte-black', background: 'desk-surface', ratio: 'SQUARE',
    prompt: 'A close-up, centered product mockup of a blank desktop stapler. The stapler is solid matte black, sitting on a desk, occupying 65% of the frame. Strongly blurred background. The top surface of the stapler is completely clean with absolutely no logos, prints, brand text, or stickers.' },
  { item: 'pencil-case', material: 'canvas', color: 'dusty-blue', background: 'school-desk', ratio: 'LANDSCAPE',
    prompt: 'A close-up, front-facing product mockup showing the flat front face of a blank canvas pencil case. The case is solid dusty blue canvas, lying flat closed on a school desk, the flat fabric face occupying 70% of the frame. Strongly blurred background. The canvas surface is completely plain with absolutely no prints, logos, patches, or stickers.' },
  { item: 'whiteboard-eraser', material: 'foam-felt', color: 'pure-white', background: 'whiteboard', ratio: 'SQUARE',
    prompt: 'A close-up, front-facing product mockup of a blank rectangular whiteboard eraser. The eraser is solid white foam, standing against a clean whiteboard, the smooth flat face occupying 65% of the frame. Strongly blurred background. The surface is completely clean with absolutely no logos, prints, or stickers.' },
  { item: 'sticky-note-pad', material: 'paper', color: 'pastel-yellow', background: 'desk', ratio: 'SQUARE',
    prompt: 'A close-up, top-down product mockup showing the blank top face of a sticky note pad. The pad is solid pastel yellow paper, lying flat on a clean desk, the blank paper surface occupying 70% of the frame. Strongly blurred background. The paper surface is completely blank with absolutely no text, prints, doodles, or stickers.' },

  // === NHÓM 10: ĐỒ DÙNG OUTDOOR & DU LỊCH ===
  { item: 'camping-mug', material: 'enamel-metal', color: 'navy-enamel', background: 'campfire-rocks', ratio: 'SQUARE',
    prompt: 'A close-up, centered product mockup of a blank enamel camping mug. The mug is solid navy blue enamel metal, sitting on a rock near a campfire, occupying 65% of the frame. Strongly blurred campfire outdoor background. The enamel surface is completely plain with absolutely no prints, designs, rim colors, stickers or labels.' },
  { item: 'carabiner-clip', material: 'aluminum', color: 'anodized-orange', background: 'climbing-wall', ratio: 'SQUARE',
    prompt: 'A close-up, centered product mockup of a blank aluminum carabiner clip. The carabiner is solid anodized orange, hanging on a climbing wall, occupying 65% of the frame. Strongly blurred wall background. The metal surface is completely plain with absolutely no prints, load rating text, logos, or stickers.' },
  { item: 'passport-holder', material: 'leather', color: 'midnight-black', background: 'airport-lounge', ratio: 'PORTRAIT',
    prompt: 'A close-up, front-facing product mockup showing the flat front cover of a blank leather passport holder. The holder is midnight black leather, held vertically or placed flat, the smooth flat cover occupying 70% of the frame. Strongly blurred airport lounge background. The leather surface is completely clean with absolutely no embossing, prints, logos, or stickers.' },
  { item: 'travel-pillow', material: 'memory-foam', color: 'light-gray', background: 'airplane-seat', ratio: 'SQUARE',
    prompt: 'A close-up, centered mockup of a blank U-shaped travel neck pillow. The pillow is solid light gray memory foam with a removable cover, resting on an airplane seat, occupying 60% of the frame. Strongly blurred cabin background. The fabric cover is completely plain with absolutely no prints, logos, brand text, or stickers.' },
  { item: 'luggage-tag', material: 'silicone', color: 'bright-yellow', background: 'suitcase-handle', ratio: 'SQUARE',
    prompt: 'A close-up, front-facing macro mockup showing the flat face of a blank silicone luggage tag. The tag is solid bright yellow, attached to a suitcase handle, the smooth flat face occupying 70% of the frame. Strongly blurred background. The surface is completely clean with absolutely no text, prints, owner info window, logos, or stickers.' },

  // === NHÓM 11: ĐỒ DÙNG TRẺ EM & QUÀ TẶNG ===
  { item: 'piggy-bank', material: 'ceramic', color: 'glossy-pink', background: 'kids-shelf', ratio: 'SQUARE',
    prompt: 'A close-up, centered product mockup of a blank ceramic piggy bank. The piggy bank is solid glossy pink ceramic, sitting on a wooden shelf, occupying 65% of the frame. Strongly blurred bedroom background. The surface is completely plain with absolutely no prints, designs, coin slot markings, or stickers.' },
  { item: 'lunchbox', material: 'stainless-steel', color: 'matte-teal', background: 'kitchen-counter', ratio: 'LANDSCAPE',
    prompt: 'A close-up, front-facing product mockup showing the flat lid top of a blank stainless steel bento lunchbox. The box is solid matte teal, sitting closed on a counter, the flat rectangular lid surface occupying 70% of the frame. Strongly blurred background. The lid surface is completely clean with absolutely no prints, clips designs, logos, or stickers.' },
  { item: 'gift-bag', material: 'kraft-paper', color: 'natural-brown', background: 'wooden-floor', ratio: 'PORTRAIT',
    prompt: 'A close-up, front-facing product mockup showing the flat front panel of a blank kraft paper gift bag. The bag is natural brown, standing upright on a wooden floor, the front flat panel occupying 70% of the frame. Strongly blurred background. The paper surface is completely blank with absolutely no prints, designs, rope handle branding, or stickers.' },
  { item: 'ceramic-figurine-base', material: 'ceramic', color: 'matte-white', background: 'display-shelf', ratio: 'SQUARE',
    prompt: 'A close-up, centered product mockup showing the smooth flat body of a blank ceramic decorative vase. The vase is solid matte white ceramic, standing on a display shelf, the smooth cylindrical body occupying 65% of the frame. Strongly blurred background. The surface is completely plain with absolutely no prints, designs, texture patterns, or stickers.' },
  { item: 'photo-frame', material: 'wood', color: 'natural-pine', background: 'white-wall', ratio: 'SQUARE',
    prompt: 'A close-up, front-facing product mockup showing the flat frame front of a blank wooden picture frame. The frame is natural pine wood, leaning against a white wall, the smooth flat frame border occupying the outer 65% of the frame. Strongly blurred background. The wood surface is completely plain with absolutely no prints, stickers, finish patterns, or logos.' },

  // === NHÓM 12: PHƯƠNG TIỆN & DỤNG CỤ ===
  { item: 'toolbox-lid', material: 'metal', color: 'signal-red', background: 'workshop-bench', ratio: 'LANDSCAPE',
    prompt: 'A close-up, top-down product mockup showing the flat lid surface of a blank metal toolbox. The toolbox is signal red metal, sitting on a workbench, the flat rectangular lid surface occupying 70% of the frame. Strongly blurred workshop background. The lid surface is completely clean with absolutely no text, logos, prints, or stickers.' },
  { item: 'motorcycle-side-box', material: 'abs-plastic', color: 'glossy-black', background: 'motorcycle-side', ratio: 'SQUARE',
    prompt: 'A close-up, front-facing product mockup showing the flat panel of a blank motorcycle side storage box. The box is solid glossy black ABS plastic, mounted on a motorcycle, the flat side panel occupying 70% of the frame. Strongly blurred background. The panel is completely clean with absolutely no logos, prints, decals, or stickers.' },
  { item: 'car-sun-visor', material: 'fabric', color: 'beige-fabric', background: 'car-interior', ratio: 'LANDSCAPE',
    prompt: 'A close-up, centered mockup showing the flat underside panel of a blank car sun visor. The visor is beige fabric, flipped down inside a car, the smooth flat fabric face occupying 70% of the frame. Strongly blurred car interior background. The fabric surface is completely clean with absolutely no prints, pockets, mirror markings, logos, or stickers.' },
  { item: 'steering-wheel-center', material: 'leather', color: 'black-leather', background: 'car-interior', ratio: 'SQUARE',
    prompt: 'A close-up, front-facing product mockup showing the flat center hub of a blank steering wheel. The center hub pad is solid black leather, centered in frame, occupying 65% of the frame. Strongly blurred car interior background. The center pad is completely blank with absolutely no logo embossing, horn symbol, prints, or stickers.' },
  { item: 'bicycle-frame-top-tube', material: 'aluminum', color: 'glossy-white', background: 'bike-shop', ratio: 'LANDSCAPE',
    prompt: 'A close-up product mockup showing the long flat top tube of a bicycle frame. The tube is solid glossy white aluminum, the smooth cylindrical top tube spanning horizontally and occupying 65% of the frame. Strongly blurred bike shop background. The tube surface is completely plain with absolutely no decals, brand logos, graphics, or stickers.' },

  // === NHÓM 13: LY UỐNG & DỤNG CỤ BÀN ĂN ===
  { item: 'wine-glass', material: 'crystal-glass', color: 'clear-transparent', background: 'restaurant-table', ratio: 'PORTRAIT',
    prompt: 'A close-up, centered product mockup of a blank crystal wine glass. The glass is clear transparent crystal, standing on a restaurant table, occupying 65% of the frame. Strongly blurred elegant restaurant background. The glass bowl and stem are completely smooth with absolutely no prints, etchings, logos, or stickers.' },
  { item: 'beer-mug', material: 'thick-glass', color: 'clear-transparent', background: 'bar-counter', ratio: 'PORTRAIT',
    prompt: 'A close-up, centered product mockup of a blank thick glass beer mug with a handle. The mug is clear glass, standing on a bar counter, occupying 65% of the frame. Strongly blurred bar background. The glass surface is completely plain with absolutely no prints, logos, brewery text, or stickers.' },
  { item: 'tea-pot', material: 'ceramic', color: 'cream-white', background: 'wooden-tray', ratio: 'SQUARE',
    prompt: 'A close-up, centered product mockup of a blank ceramic teapot. The teapot is solid cream white ceramic, sitting on a wooden tray, occupying 65% of the frame. Strongly blurred tea ceremony background. The ceramic body surface is completely smooth with absolutely no prints, floral patterns, logos, or stickers.' },
  { item: 'coffee-dripper', material: 'ceramic', color: 'matte-gray', background: 'coffee-bar', ratio: 'PORTRAIT',
    prompt: 'A close-up, centered product mockup of a blank ceramic pour-over coffee dripper. The dripper is solid matte gray ceramic, sitting on a glass carafe on a coffee bar, occupying 65% of the frame. Strongly blurred background. The ceramic surface is completely plain with absolutely no prints, logos, flow-rate lines, or stickers.' },
  { item: 'thermal-food-jar', material: 'stainless-steel', color: 'rose-gold', background: 'office-desk', ratio: 'PORTRAIT',
    prompt: 'A close-up, centered product mockup of a blank thermal food jar. The jar is solid rose gold stainless steel, standing on an office desk, occupying 65% of the frame. Strongly blurred background. The metal body is completely plain with absolutely no prints, volume markings, logos, stickers or labels.' },

  // === NHÓM 14: CÁC VẬT PHẨM KHÁC ===
  { item: 'matchbox', material: 'cardboard', color: 'matte-black', background: 'dark-marble', ratio: 'SQUARE',
    prompt: 'A close-up, centered product mockup of a blank rectangular matchbox. The box is solid matte black cardboard, sitting on dark marble, occupying 65% of the frame. Strongly blurred background. The flat side panel of the box is completely clean with absolutely no prints, safety text, logos, or stickers.' },
  { item: 'plant-pot', material: 'ceramic', color: 'terracotta', background: 'windowsill', ratio: 'SQUARE',
    prompt: 'A close-up, centered product mockup of a blank terracotta ceramic plant pot (without plant). The pot is solid terracotta color, sitting on a sunny windowsill, occupying 65% of the frame. Strongly blurred background. The curved side surface is completely plain with absolutely no prints, designs, or stickers.' },
  { item: 'soap-bar', material: 'solid-soap', color: 'cream-white', background: 'bathroom-shelf', ratio: 'SQUARE',
    prompt: 'A close-up, centered product mockup of a blank rectangular soap bar. The soap is solid cream white, sitting on a bathroom shelf, occupying 65% of the frame. Strongly blurred background. The flat top surface of the soap is completely smooth with absolutely no embossed text, logos, prints, or stickers.' },
  { item: 'sunscreen-bottle', material: 'plastic', color: 'white-squeeze', background: 'beach-towel', ratio: 'PORTRAIT',
    prompt: 'A close-up, centered product mockup of a blank plastic sunscreen squeeze bottle. The bottle is solid white plastic, standing on a beach towel, occupying 65% of the frame. Strongly blurred tropical beach background. The bottle body is completely plain with absolutely no prints, SPF text, logos, stickers or labels.' },
  { item: 'trash-bin', material: 'matte-plastic', color: 'concrete-gray', background: 'office-corner', ratio: 'PORTRAIT',
    prompt: 'A close-up, centered product mockup of a blank small desktop trash bin. The bin is solid concrete gray matte plastic, sitting in an office corner, occupying 65% of the frame. Strongly blurred minimalist background. The cylindrical body surface is completely plain with absolutely no prints, logos, designs, or stickers.' }
);

// ============================================================
// 🤖 FLOW BOT FUNCTIONS
// ============================================================

async function launchFlow(): Promise<{ context: BrowserContext; page: Page }> {
  console.log(`[FlowBot] Khởi động Chrome với Profile: ${PROFILE_DIR}`)
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    executablePath: CHROME_PATH,
    args: [
      '--disable-blink-features=AutomationControlled', 
      '--no-first-run', 
      '--no-default-browser-check',
      '--start-maximized'
    ],
    viewport: null,
  })

  const page = context.pages()[0] || await context.newPage()
  await page.goto(FLOW_URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await sleep(8000)

  if (page.url().includes('accounts.google.com')) {
    console.error('❌ YÊU CẦU: Trình duyệt chưa đăng nhập Google. Vui lòng đăng nhập thủ công rồi chạy lại script.')
    await context.close()
    process.exit(1)
  }

  console.log('✓ Trình duyệt đã kết nối Google Flow')
  return { context, page }
}

async function ensureImageMode(page: Page) {
  try {
    const agentBtn = page.locator('button:has-text("Agent"), [role="button"]:has-text("Agent"), [aria-pressed]').filter({ hasText: 'Agent' }).first()
    if (await agentBtn.count() > 0) {
      const pressed = await agentBtn.getAttribute('aria-pressed')
      const checked = await agentBtn.getAttribute('aria-checked')
      const isPressed = pressed === 'true' || checked === 'true' || (await agentBtn.getAttribute('class'))?.includes('active')
      
      if (isPressed) {
        console.log('  [Mode] Phát hiện chế độ Agent đang bật. Tiến hành click tắt để chuyển sang Image Mode...')
        await agentBtn.click()
        await sleep(1500)
      }
    }
  } catch {}
}

async function getValidImageUrls(page: Page): Promise<string[]> {
  return await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('img')) as HTMLImageElement[]
    return imgs
      .filter(img => {
        const r = img.getBoundingClientRect()
        const src = img.src || ''
        return r.width > 100 && r.height > 100 && img.complete && img.naturalWidth > 50 &&
          (src.includes('trpc') || src.includes('googleapis') || src.includes('blob:') ||
           src.includes('imagedelivery') || src.includes('googleusercontent'))
      })
      .map(img => img.src)
  })
}

async function setupEditor(page: Page, ratio: string): Promise<boolean> {
  try {
    // 1. Nếu đang ở Landing Page của Google Labs
    const createBtn = page.locator('button:has-text("Create with Google Flow")').first()
    if (await createBtn.count() > 0 && await createBtn.isVisible()) {
      await createBtn.click()
      await sleep(8000)
    }

    // 2. Không tạo project mới nếu đang ở trong project của người dùng
    if (page.url().endsWith('/flow') || page.url().endsWith('/flow/')) {
      const firstProject = page.locator('a[href*="/project/"], div[role="listitem"]').first()
      if (await firstProject.count() > 0) {
        await firstProject.click()
        await sleep(10000)
      }
    }

    // 3. ĐÓNG PANEL ALL MEDIA NẾU BỊ MỞ
    const backBtn = page.locator('button:has(span:text("arrow_back")), button:has(span:text("chevron_left")), button:has(span:text("arrow_left"))').first()
    if (await backBtn.count() > 0 && await backBtn.isVisible()) {
      console.log('  [Settings] Phát hiện panel Library/All Media đang mở. Tiến hành click đóng để giải phóng giao diện...')
      await backBtn.click()
      await sleep(2000)
    }

    // 4. Mở Model Settings bằng nút "tune" (icon 3 thanh gạt bên cạnh ô prompt)
    console.log(`  [Settings] Kiểm tra và cấu hình tỷ lệ: ${ratio}...`)
    const tuneBtn = page.locator('button:has(span:text("tune")), button:has(span:text("settings")), button[aria-label*="ettings"]').first()
    if (await tuneBtn.count() > 0 && await tuneBtn.isVisible()) {
      await tuneBtn.click()
      await sleep(2500)

      // Chọn model tốt nhất (Banana Pro hoặc Nano Banana Pro nếu có)
      const modelOptions = [
        page.locator('button:has-text("Banana Pro")').first(),
        page.locator('button:has-text("Nano Banana Pro")').first(),
        page.locator('button:has-text("Banana")').first(),
        page.locator('button:has-text("Nano Banana")').first(),
      ]

      for (const option of modelOptions) {
        if (await option.count() > 0 && await option.isVisible()) {
          const text = await option.innerText()
          if (!text.includes('active') && !text.includes('✓')) {
            console.log(`  → Click chọn model: ${text.trim()}`)
            await option.click()
            await sleep(1000)
          }
          break
        }
      }

      // Chọn tỷ lệ ảnh
      const ratioMap: Record<string, string[]> = { 
        PORTRAIT: ['9:16', 'Portrait', 'Vertical'], 
        LANDSCAPE: ['16:9', 'Landscape', 'Horizontal'], 
        SQUARE: ['1:1', 'Square'] 
      }
      const targetTexts = ratioMap[ratio] || ['1:1']
      let ratioClicked = false

      const ratioBtn = page.locator(`button[id$="-trigger-${ratio}"]`).first()
      if (await ratioBtn.count() > 0 && await ratioBtn.isVisible()) {
        await ratioBtn.click()
        ratioClicked = true
        await sleep(1000)
      } else {
        for (const text of targetTexts) {
          const textBtn = page.locator(`button:has-text("${text}")`).first()
          const spanBtn = page.locator(`button:has(span:has-text("${text}"))`).first()
          if (await textBtn.count() > 0 && await textBtn.isVisible()) {
            await textBtn.click()
            ratioClicked = true
            await sleep(1000)
            break
          } else if (await spanBtn.count() > 0 && await spanBtn.isVisible()) {
            await spanBtn.click()
            ratioClicked = true
            await sleep(1000)
            break
          }
        }
      }

      if (!ratioClicked) {
        console.log(`  ⚠ Không tìm thấy nút chọn tỷ lệ cho ${ratio}, giữ mặc định`)
      }

      // Chọn 1x ảnh để chạy nhanh
      const countBtn = page.locator('button[id$="-trigger-SINGLE"], button:has-text("1x")').first()
      if (await countBtn.count() > 0 && await countBtn.isVisible()) { 
        await countBtn.click()
        await sleep(1000) 
      }

      await page.keyboard.press('Escape')
      await sleep(1500)
    } else {
      // Fallback cho giao diện cũ nếu không thấy nút tune
      const modelBtn = page.locator('button:has-text("Nano Banana"), button:has-text("Banana"), button:has-text("Banana Pro"), button:has-text("Nano Banana Pro")').first()
      if (await modelBtn.count() > 0 && await modelBtn.isVisible()) {
        await modelBtn.click()
        await sleep(2000)
        
        const ratioMap: Record<string, string> = { PORTRAIT: '9:16', LANDSCAPE: '16:9', SQUARE: '1:1' }
        const targetRatioText = ratioMap[ratio] || '1:1'
        const textBtn = page.locator(`button:has-text("${targetRatioText}")`).first()
        if (await textBtn.count() > 0 && await textBtn.isVisible()) {
          await textBtn.click()
          await sleep(1000)
        }
        await page.keyboard.press('Escape')
        await sleep(1500)
      }
    }

    return true
  } catch (err: any) {
    console.error('  ✗ Lỗi cấu hình Editor:', err.message)
    return false
  }
}

async function generateImage(page: Page, prompt: string, ratio: string): Promise<boolean> {
  // Luôn đảm bảo cấu hình đúng tỷ lệ và model trước khi tạo ảnh
  const ok = await setupEditor(page, ratio)
  if (!ok) return false

  await ensureImageMode(page)

  const promptSelectors = ['div[data-slate-editor="true"]', 'div[contenteditable="true"]', '[role="textbox"]', 'textarea']
  let promptEl: any = null
  for (const sel of promptSelectors) {
    const el = page.locator(sel).first()
    if (await el.count() > 0 && await el.isVisible({ timeout: 2000 }).catch(() => false)) {
      promptEl = el
      break
    }
  }
  if (!promptEl) { 
    console.log('  ✗ Không tìm thấy ô nhập prompt')
    return false 
  }

  await promptEl.click()
  await page.keyboard.press('Control+A')
  await sleep(100)
  await page.keyboard.press('Backspace')
  await sleep(200)
  await page.keyboard.insertText(prompt)
  await sleep(800)

  // Bấm nút Generate (nút tròn có icon arrow_forward, east, hoặc send)
  const sendSelectors = [
    'button:has(span:text("arrow_forward"))',
    'button:has(span:text("east"))',
    'button:has(span:text("send"))',
    'button[type="submit"]:not([disabled])',
    'button:has-text("Create")',
  ]
  let clicked = false
  for (const sel of sendSelectors) {
    try {
      const btn = page.locator(sel).last()
      if (await btn.count() > 0 && !await btn.isDisabled()) {
        await btn.click({ force: true, timeout: 3000 })
        clicked = true
        break
      }
    } catch {}
  }
  if (!clicked) { 
    await promptEl.press('Enter')
    clicked = true 
  }

  return clicked
}

async function downloadImage(page: Page, savePath: string, oldUrls: string[], timeoutMs = 120000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  let lastLog = 0

  console.log('  [Download] Đang chờ ảnh mới sinh hoàn tất để download bản 2K gốc...')

  while (Date.now() < deadline) {
    await sleep(4000)

    // Lấy thông tin ảnh mới nhất trong DOM để di chuột
    const newImgData: any = await page.evaluate((excludeUrls) => {
      const excludeSet = new Set(excludeUrls)
      const candidates = (Array.from(document.querySelectorAll('img')) as HTMLImageElement[]).filter(img => {
        const r = img.getBoundingClientRect()
        const src = img.src || ''
        return r.width > 100 && r.height > 100 && img.complete && img.naturalWidth > 50 &&
          (src.includes('trpc') || src.includes('googleapis') || src.includes('blob:') ||
           src.includes('imagedelivery') || src.includes('googleusercontent')) &&
          !excludeSet.has(src)
      })
      if (candidates.length === 0) return null
      const img = candidates[candidates.length - 1]
      const r = img.getBoundingClientRect()
      return { src: img.src, x: r.left + r.width / 2, y: r.top + r.height / 2 }
    }, oldUrls)

    if (newImgData) {
      console.log('  [Download] Phát hiện ảnh mới. Di chuột đến ảnh để hiện thanh công cụ...')
      try {
        // Sử dụng Playwright locator.hover() để tự động scroll và hover chính xác
        const targetImg = page.locator(`img[src="${newImgData.src}"]`).first()
        if (await targetImg.count() > 0) {
          await targetImg.hover({ force: true })
          await sleep(1500)
        } else {
          await page.mouse.move(newImgData.x, newImgData.y)
          await sleep(1000)
        }

        // Tìm nút download (nút có icon download hoặc arrow_downward hoặc aria-label chứa Download)
        const downloadSelectors = [
          'button:has(span:text("download"))',
          'button[aria-label*="ownload"]',
          'button[aria-label*="Download"]',
          'button:has(span:text("arrow_downward"))',
          'a[download]'
        ]

        let downloadBtn = null
        for (const sel of downloadSelectors) {
          const btn = page.locator(sel).last()
          if (await btn.count() > 0 && await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
            downloadBtn = btn
            break
          }
        }

        if (downloadBtn) {
          console.log('  [Download] Tìm thấy nút Download gốc. Tiến hành tải ảnh 2K chất lượng gốc...')
          const downloadPromise = page.waitForEvent('download', { timeout: 30000 })
          await downloadBtn.click({ force: true })
          const download = await downloadPromise
          await fs.mkdir(path.dirname(savePath), { recursive: true })
          await download.saveAs(savePath)
          const { size } = await fs.stat(savePath)
          if (size > 20000) {
            console.log(`  ✓ Đã lưu ảnh 2K chất lượng gốc: ${path.basename(savePath)} (${Math.round(size/1024)}KB)`)
            return true
          }
        } else {
          console.log('  [Download] Không tìm thấy nút Download nổi trên ảnh. Thử click thẳng vào ảnh để mở panel...')
          // Fallback click vào ảnh để mở panel chi tiết bên phải
          const imgEl = page.locator(`img[src="${newImgData.src}"]`).first()
          if (await imgEl.count() > 0) {
            await imgEl.click()
            await sleep(2000)
            
            // Tìm nút download trong panel chi tiết bên phải
            const panelDownloadBtn = page.locator('button:has-text("Download"), a:has-text("Download"), button[aria-label*="ownload"]').first()
            if (await panelDownloadBtn.count() > 0 && await panelDownloadBtn.isVisible()) {
              console.log('  [Download] Tìm thấy nút Download trong panel chi tiết. Tiến hành tải...')
              const downloadPromise = page.waitForEvent('download', { timeout: 30000 })
              await panelDownloadBtn.click({ force: true })
              const download = await downloadPromise
              await fs.mkdir(path.dirname(savePath), { recursive: true })
              await download.saveAs(savePath)
              const { size } = await fs.stat(savePath)
              if (size > 20000) {
                console.log(`  ✓ Đã lưu ảnh 2K từ panel chi tiết: ${path.basename(savePath)} (${Math.round(size/1024)}KB)`)
                // Đóng panel chi tiết
                await page.keyboard.press('Escape')
                await sleep(1000)
                return true
              }
            }
            await page.keyboard.press('Escape')
            await sleep(1000)
          }
        }
      } catch (err: any) {
        console.log(`  ⚠ Lỗi tải ảnh 2K trực tiếp (${err.message}). Fallback về chế độ trích xuất canvas...`)
      }

      // FALLBACK: Trích xuất qua canvas nếu không thể kích hoạt download trực tiếp
      console.log('  [Download] Chạy chế độ Fallback Canvas...')
      const result: any = await page.evaluate((targetSrc) => {
        const imgs = Array.from(document.querySelectorAll('img')) as HTMLImageElement[]
        const img = imgs.find(i => i.src === targetSrc)
        if (!img) return { status: 'waiting' }
        try {
          const canvas = document.createElement('canvas')
          canvas.width = img.naturalWidth || 1080
          canvas.height = img.naturalHeight || 1080
          const ctx = canvas.getContext('2d')!
          ctx.drawImage(img, 0, 0)
          const dataUrl = canvas.toDataURL('image/png')
          if (dataUrl === 'data:,' || dataUrl.length < 10000) return { status: 'waiting' }
          return { status: 'ok', dataUrl, w: img.naturalWidth, h: img.naturalHeight }
        } catch {
          return { status: 'cors', src: img.src }
        }
      }, newImgData.src)

      if (result.status === 'ok') {
        const base64 = result.dataUrl.split(',')[1]
        await fs.mkdir(path.dirname(savePath), { recursive: true })
        await fs.writeFile(savePath, Buffer.from(base64, 'base64'))
        const { size } = await fs.stat(savePath)
        if (size > 20000) {
          console.log(`  ✓ Đã lưu ảnh (Fallback Canvas): ${path.basename(savePath)} (${Math.round(size/1024)}KB, ${result.w}×${result.h})`)
          return true
        }
      }

      if (result.status === 'cors') {
        const blob = await page.evaluate(async (src: string) => {
          try { 
            return Array.from(new Uint8Array(await (await fetch(src)).arrayBuffer())) 
          } catch { 
            return null 
          }
        }, result.src)
        if (blob && blob.length > 20000) {
          await fs.mkdir(path.dirname(savePath), { recursive: true })
          await fs.writeFile(savePath, Buffer.from(blob))
          console.log(`  ✓ Đã lưu ảnh (Fallback CORS): ${path.basename(savePath)}`)
          return true
        }
      }
    }

    if (Date.now() - lastLog > 20000) {
      lastLog = Date.now()
      console.log(`  ... đang đợi ảnh mới tạo xong (${Math.round((Date.now() - (deadline - timeoutMs)) / 1000)}s)`)
    }
  }
  return false
}

// ============================================================
// 🚀 MAIN EXECUTION
// ============================================================
async function main() {
  let batchMode = 'test' // 'test' (5 ảnh đầu) hoặc 'all' (100 ảnh)
  let startIndex = 0
  let endIndex = 5
  let forceSquare = false // Mặc định không ép tỉ lệ, trừ khi truyền tham số -s hoặc --square

  // Đọc tham số CLI
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i]
    if (arg === '--all' || arg === '-a') {
      batchMode = 'all'
      startIndex = 0
      endIndex = PROMPTS.length
    } else if (arg === '--range' || arg === '-r') {
      const range = process.argv[++i]?.split('-')
      if (range && range.length === 2) {
        startIndex = parseInt(range[0]) - 1
        endIndex = parseInt(range[1])
        batchMode = 'custom'
      }
    } else if (arg === '--square' || arg === '-s') {
      forceSquare = true
    }
  }

  const activePrompts = PROMPTS.slice(startIndex, endIndex)

  console.log(`\n============================================================`)
  console.log(`KHO MOCKUP GENERATOR — GOOGLE FLOW BOT (NO-AGENT & 2K MOCKUPS)`)
  console.log(`Chế độ chạy    : ${batchMode.toUpperCase()}`)
  console.log(`Số lượng prompt: ${activePrompts.length} (Từ prompt ${startIndex + 1} đến ${endIndex})`)
  console.log(`Ép tỉ lệ SQUARE: ${forceSquare ? 'BẬT (1:1)' : 'TẮT (Theo thiết lập prompt)'}`)
  console.log(`Thư mục lưu    : ${OUTPUT_DIR}`)
  console.log(`============================================================\n`)

  await fs.mkdir(OUTPUT_DIR, { recursive: true })

  const { context, page } = await launchFlow()
  
  let successCount = 0
  let skipCount = 0
  let failCount = 0

  for (let i = 0; i < activePrompts.length; i++) {
    const itemIdx = startIndex + i + 1
    const p = activePrompts[i]
    
    // Áp dụng tỉ lệ SQUARE nếu forceSquare = true
    const ratio = forceSquare ? 'SQUARE' : p.ratio
    const fileName = makeFileName(p.item, p.material, p.color, p.background, ratio, itemIdx)
    const savePath = path.join(OUTPUT_DIR, fileName)

    console.log(`\n[${i + 1}/${activePrompts.length}] Tiến hành: ${fileName}`)
    console.log(`  - Vật phẩm: ${p.item} (${p.material}, ${p.color})`)
    console.log(`  - Tỉ lệ   : ${ratio}`)
    console.log(`  - Prompt  : ${p.prompt.substring(0, 80)}...`)

    // Nếu đã tồn tại file (size > 20KB) thì bỏ qua
    const exists = await fs.stat(savePath).then(s => s.size > 20000).catch(() => false)
    if (exists) {
      console.log(`  ✓ File đã tồn tại — Bỏ qua để tiết kiệm thời gian`)
      skipCount++
      continue
    }

    // Lấy danh sách URL ảnh cũ trước khi generate
    const oldUrls = await getValidImageUrls(page)

    // Chạy tạo ảnh
    const sent = await generateImage(page, p.prompt, ratio)
    if (!sent) {
      console.log(`  ✗ Gặp lỗi khi gửi prompt lên Google Flow`)
      await page.screenshot({ path: path.join(OUTPUT_DIR, `_debug_fail_${p.item}_${Date.now()}.png`) }).catch(() => {})
      failCount++
      continue
    }

    // Tải ảnh về (chỉ lấy ảnh có URL hoàn toàn mới không thuộc oldUrls)
    const saved = await downloadImage(page, savePath, oldUrls)
    if (saved) {
      successCount++
    } else {
      console.log(`  ✗ Lỗi: Hết thời gian chờ tạo ảnh mới (Timeout 120s)`)
      await page.screenshot({ path: path.join(OUTPUT_DIR, `_debug_timeout_${p.item}_${Date.now()}.png`) }).catch(() => {})
      failCount++
    }

    await sleep(2000)
  }

  console.log(`\n============================================================`)
  console.log(`BÁO CÁO KẾT QUẢ: Thành công: ${successCount} | Bỏ qua: ${skipCount} | Thất bại: ${failCount}`)
  console.log(`============================================================\n`)

  await context.close()
}

main().catch(console.error)
