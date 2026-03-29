import fs from 'fs';
import * as acorn from 'acorn';

const html = fs.readFileSync('winchsim.html', 'utf8');
const st = html.indexOf('<script type="module">') + '<script type="module">'.length;
const en = html.indexOf('</script>', st);
const js = html.substring(st, en);

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
