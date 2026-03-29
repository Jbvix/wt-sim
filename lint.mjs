import fs from 'fs';
import * as acorn from 'file:///C:/Users/jossi/AppData/Roaming/npm/node_modules/acorn/dist/acorn.mjs';

const html = fs.readFileSync('winchsim.html', 'utf8');
const scriptMatch = html.match(/<script type="module">([\s\S]*?)<\/script>/);

if (scriptMatch) {
    const js = scriptMatch[1];
    try {
        acorn.parse(js, { ecmaVersion: 2022, sourceType: 'module' });
        console.log('Syntax OK');
    } catch (e) {
        console.error('Syntax Error at line ' + e.loc.line + ' / col ' + e.loc.column + ': ' + e.message);
        
        const lines = js.split('\n');
        console.log('CONTEXTO:');
        console.log(lines[e.loc.line - 2]);
        console.log(lines[e.loc.line - 1]);
        console.log(lines[e.loc.line]);
    }
} else {
    console.error('Script tag not found');
}
