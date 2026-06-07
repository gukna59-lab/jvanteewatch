import fs from 'fs';
import path from 'path';

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        if (file === 'node_modules' || file === 'dist' || file.startsWith('.')) return;
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walkDir(file));
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            results.push(file);
        }
    });
    return results;
}

const files = walkDir('./src');
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/bg-\[\#0A0C10\]/g, 'bg-bg-main');
    content = content.replace(/bg-\[\#11141A\]/g, 'bg-bg-card');
    content = content.replace(/bg-\[\#1E293B\]/g, 'bg-bg-hover');
    content = content.replace(/border-\[\#1F2937\]/g, 'border-border-card');
    content = content.replace(/bg-\[\#0F172A\]/g, 'bg-bg-card'); // Similar
    content = content.replace(/text-zinc-100/g, 'text-text-main');
    // We won't replace all zincs to avoid breaking specific colored things, 
    // but the main backgrounds are most important for light mode
    fs.writeFileSync(file, content, 'utf8');
});

console.log('Replaced colors');
