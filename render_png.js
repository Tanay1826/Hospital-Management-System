const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const svgPath = path.join(__dirname, 'public', 'er-diagram-updated.svg');
const pngPath = path.join(__dirname, 'public', 'er-diagram-updated.png');
const artifactPngPath = path.join('C:', 'Users', 'ASUS', '.gemini', 'antigravity', 'brain', '419de6db-8bbc-422d-be43-6534032dd680', 'er_diagram_updated.png');

console.log('Reading SVG from:', svgPath);
const svg = fs.readFileSync(svgPath, 'utf8');

const opts = {
    fitTo: {
        mode: 'width',
        value: 2700
    },
    font: {
        loadSystemFonts: true,
        defaultFontFamily: 'Segoe UI'
    }
};

const resvg = new Resvg(svg, opts);
const pngData = resvg.render();
const pngBuffer = pngData.asPng();

fs.writeFileSync(pngPath, pngBuffer);
console.log('Successfully rendered PNG to:', pngPath, 'Size:', pngBuffer.length, 'bytes');

try {
    fs.writeFileSync(artifactPngPath, pngBuffer);
    console.log('Successfully copied PNG to artifacts:', artifactPngPath);
} catch (e) {
    console.error('Could not copy to artifact path:', e.message);
}
