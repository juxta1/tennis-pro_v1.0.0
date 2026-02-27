import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Colors: Replace emerald (green) with red (Swiss accent), and stone with gray
content = content.replace(/emerald-600/g, 'red-600');
content = content.replace(/emerald-500/g, 'red-500');
content = content.replace(/emerald-700/g, 'red-700');
content = content.replace(/emerald-50/g, 'gray-100');
content = content.replace(/emerald-100/g, 'gray-200');
content = content.replace(/stone-/g, 'gray-');

// 2. Borders & Shadows: Remove shadows, make borders thick and black
content = content.replace(/shadow-(xl|lg|md|sm|2xl)/g, '');
content = content.replace(/shadow-red-600\/20/g, '');
content = content.replace(/border border-gray-200/g, 'border-2 border-black');
content = content.replace(/border border-gray-100/g, 'border-2 border-black');
content = content.replace(/border-gray-200/g, 'border-black');
content = content.replace(/border-gray-100/g, 'border-black');
content = content.replace(/border-gray-300/g, 'border-black');
content = content.replace(/border-dashed/g, 'border-dotted');

// 3. Radii: Remove rounded corners for a sharp, grid-like feel
content = content.replace(/rounded-(3xl|2xl|xl|lg|md|sm|\[.*?\])/g, 'rounded-none');

// 4. Typography: Heavier weights, tighter tracking, pure black text
content = content.replace(/font-bold/g, 'font-black');
content = content.replace(/text-gray-800/g, 'text-black');
content = content.replace(/text-gray-900/g, 'text-black');
content = content.replace(/text-gray-500/g, 'text-gray-600');
content = content.replace(/text-gray-400/g, 'text-gray-500');
content = content.replace(/tracking-tight/g, 'tracking-tighter');

// 5. Backgrounds: High contrast (pure white instead of off-white)
content = content.replace(/bg-gray-50/g, 'bg-white');

fs.writeFileSync('src/App.tsx', content);
console.log('Swiss design applied to App.tsx');
