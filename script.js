// ===== Referencias =====
const baseColor   = document.getElementById("baseColor");
const offsetEl    = document.getElementById("offset");
const blurEl      = document.getElementById("blur");
const radiusEl    = document.getElementById("radius");

const preview     = document.getElementById("previewBox");
const output      = document.getElementById("output");
const copyBtn     = document.getElementById("copyBtn");
const insetBtn    = document.getElementById("toggleInsetBtn");
const randomBtn   = document.getElementById("randomBtn");

// ===== Estado =====
let isInset = false;

// ===== Utilidades de color (sin librerías) =====
function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }

function hexToRgb(hex){
  let h = hex.replace('#','').trim();
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgbToHex(r,g,b){
  const toHex = x => Math.round(clamp(x,0,255)).toString(16).padStart(2,'0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
function shift(rgb, amt){ // [-255..+255]
  return {
    r: clamp(rgb.r + amt, 0, 255),
    g: clamp(rgb.g + amt, 0, 255),
    b: clamp(rgb.b + amt, 0, 255)
  };
}
// Pasteles claros estéticos (HSL -> HEX)
function hslToHex(h,s,l){
  s/=100; l/=100;
  const k = n => (n + h/30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n)-3, Math.min(9-k(n), 1)));
  const r = Math.round(255 * f(0));
  const g = Math.round(255 * f(8));
  const b = Math.round(255 * f(4));
  return rgbToHex(r,g,b);
}

// Deriva sombras desde base (tema claro)
function deriveShadows(baseHex){
  const rgb = hexToRgb(baseHex);
  const light = shift(rgb, +18);
  const dark  = shift(rgb, -26);
  return {
    light: rgbToHex(light.r, light.g, light.b),
    dark : rgbToHex(dark.r,  dark.g,  dark.b)
  };
}

// ===== Generación de snippet =====
function genCssSnippet({ base, radius, offset, blur, light, dark, inset }){
  const shadow = inset
    ? `inset ${offset}px ${offset}px ${blur}px ${dark},
  inset -${offset}px -${offset}px ${blur}px ${light}`
    : `${offset}px ${offset}px ${blur}px ${dark},
  -${offset}px -${offset}px ${blur}px ${light}`;

  const className = inset ? '.my-neo.inset' : '.my-neo';

  return `:root{
  --base: ${base};
  --shadow-dark: ${dark};
  --shadow-light: ${light};
}

${className}{
  background: var(--base);
  border-radius: ${radius}px;
  box-shadow:
    ${shadow};
}`;
}

// ===== Render =====
function update(){
  const base   = baseColor.value;
  const offset = parseInt(offsetEl.value, 10);
  const blur   = parseInt(blurEl.value,   10);
  const radius = parseInt(radiusEl.value, 10);

  const { light, dark } = deriveShadows(base);

  const root = document.documentElement.style;
  root.setProperty('--base', base);
  root.setProperty('--shadow-light', light);
  root.setProperty('--shadow-dark', dark);
  root.setProperty('--radius', `${radius}px`);
  root.setProperty('--offset', `${offset}px`);
  root.setProperty('--blur',   `${blur}px`);

  // Box-shadow según modo
  if (isInset){
    preview.style.boxShadow = `
      inset ${offset}px ${offset}px ${blur}px var(--shadow-dark),
      inset -${offset}px -${offset}px ${blur}px var(--shadow-light)
    `;
  } else {
    preview.style.boxShadow = `
      ${offset}px ${offset}px ${blur}px var(--shadow-dark),
      -${offset}px -${offset}px ${blur}px var(--shadow-light)
    `;
  }
  preview.style.background   = `var(--base)`;
  preview.style.borderRadius = `${radius}px`;

  // Snippet al textarea
  output.value = genCssSnippet({ base, radius, offset, blur, light, dark, inset:isInset });
}

// ===== Acciones =====
async function copyCSS(){
  const text = output.value || '';
  if (!text) return;
  try{
    await navigator.clipboard.writeText(text);
    copyBtn.textContent = "Copiado ✓";
    setTimeout(() => copyBtn.textContent = "Copiar CSS", 900);
  }catch{
    output.select();
    document.execCommand('copy');
    copyBtn.textContent = "Copiado ✓";
    setTimeout(() => copyBtn.textContent = "Copiar CSS", 900);
  }
}

function toggleInset(){
  isInset = !isInset;
  insetBtn.setAttribute('aria-pressed', String(isInset));
  insetBtn.textContent = `Hundido (Inset): ${isInset ? 'ON' : 'OFF'}`;
  update();
}

// Valores aleatorios “seguros” (se ven bien)
function randomize(){
  // color pastel claro (cool/neutral): H 200–260, S 12–22, L 90–96
  const h = Math.floor(200 + Math.random()*60);
  const s = Math.floor(12 + Math.random()*10);
  const l = Math.floor(90 + Math.random()*6);
  const hex = hslToHex(h, s, l);

  // offset y blur coherentes
  const offset = Math.floor(6 + Math.random()*18);            // 6–24
  const blur   = offset + Math.floor(6 + Math.random()*12);   // offset+6 .. offset+18  (suave)
  const radius = Math.floor(8 + Math.random()*24);            // 8–32

  baseColor.value = hex;
  offsetEl.value  = clamp(offset, 2, 30);
  blurEl.value    = clamp(blur, 4, 40);
  radiusEl.value  = clamp(radius, 4, 40);

  // 30% de probabilidad de activar inset
  isInset = Math.random() < 0.3;
  insetBtn.setAttribute('aria-pressed', String(isInset));
  insetBtn.textContent = `Hundido (Inset): ${isInset ? 'ON' : 'OFF'}`;

  update();
}

// Listeners
[baseColor, offsetEl, blurEl, radiusEl].forEach(el => {
  el.addEventListener('input', update);
  el.addEventListener('change', update);
});
copyBtn.addEventListener('click', copyCSS);
insetBtn.addEventListener('click', toggleInset);
randomBtn.addEventListener('click', randomize);

// Inicial
update();
