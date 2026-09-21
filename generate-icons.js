// Gera ícones PNG usando o módulo http nativo para baixar um SVG e converter
// Cria ícones 192x192 e 512x512 usando Canvas do Node (se disponível) ou SVG puro

const fs = require('fs');
const path = require('path');

const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#2D4354"/>
  <circle cx="256" cy="220" r="110" fill="none" stroke="#9E6752" stroke-width="36"/>
  <rect x="196" y="350" width="120" height="36" rx="18" fill="#9E6752"/>
  <rect x="236" y="310" width="40" height="80" rx="8" fill="#9E6752"/>
  <text x="256" y="240" font-family="Arial" font-weight="bold" font-size="110" fill="#FED7A5" text-anchor="middle" dominant-baseline="middle">R$</text>
</svg>`;

const outDir = path.join(__dirname, 'img');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Salva os SVGs diretos (o manifest pode apontar para SVG também)
fs.writeFileSync(path.join(outDir, 'icon.svg'), svgIcon);
console.log('✓ icon.svg criado');

// Tenta gerar PNGs via canvas (Node Canvas)
try {
  const { createCanvas } = require('canvas');

  [192, 512].forEach(size => {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Fundo arredondado
    const r = size * 0.19;
    ctx.fillStyle = '#2D4354';
    ctx.beginPath();
    ctx.moveTo(r, 0); ctx.lineTo(size - r, 0);
    ctx.quadraticCurveTo(size, 0, size, r);
    ctx.lineTo(size, size - r);
    ctx.quadraticCurveTo(size, size, size - r, size);
    ctx.lineTo(r, size);
    ctx.quadraticCurveTo(0, size, 0, size - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();
    ctx.fill();

    // Texto R$
    ctx.fillStyle = '#FED7A5';
    ctx.font = `bold ${size * 0.34}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('R$', size / 2, size / 2 - size * 0.06);

    // Linha decorativa
    ctx.fillStyle = '#9E6752';
    ctx.fillRect(size * 0.25, size * 0.7, size * 0.5, size * 0.07);

    const buf = canvas.toBuffer('image/png');
    const file = path.join(outDir, `FinTracker_${size}.png`);
    fs.writeFileSync(file, buf);
    console.log(`✓ ${file} criado (${size}x${size})`);
  });
} catch (e) {
  console.log('⚠ Canvas não disponível, usando fallback SVG como ícone.');
  // Copia o SVG com nomes esperados pelo manifest
  fs.copyFileSync(path.join(outDir, 'icon.svg'), path.join(outDir, 'FinTracker_192.svg'));
  fs.copyFileSync(path.join(outDir, 'icon.svg'), path.join(outDir, 'FinTracker_512.svg'));
  console.log('✓ SVGs de fallback criados');
}

