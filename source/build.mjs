import {build} from 'esbuild';
import {readFile,writeFile,copyFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const path=name=>new URL(name,import.meta.url);
const toRead=async name=>readFile(path('./front/'+name),'utf8');
const pages=process.argv.includes('--pages');
const output=pages?'./pages/':'./release/';
const [template,css,cover]=await Promise.all([toRead('index.template.html'),toRead('style.css'),readFile(path('./front/cover.webp'))]);
const result=await build({entryPoints:[fileURLToPath(path('./front/game.mjs'))],bundle:true,write:false,loader:{'.glb':'binary'},define:{PAGES_BUILD:JSON.stringify(pages)},format:'iife',legalComments:'eof',minify:true,target:['chrome105','firefox110','safari16']});
const sheet=css.replaceAll('COVER_DATA','data:image/webp;base64,'+cover.toString('base64'));
const script=result.outputFiles[0].text.replace(/<\/script/gi,'<\\/script');
const html=template.replace('/* STYLES */',()=>sheet).replace('/* GAME */',()=>script);
await mkdir(path(output),{recursive:true});
await writeFile(path(output+'index.html'),html);
await copyFile(path('./node_modules/three/LICENSE'),path(output+'LICENSE-THREE.txt'));
for(const name of ['README.txt','CHARACTER-CREDITS.txt','LICENSE-NOTO.txt']) {
  await copyFile(path('../'+name),path(output+name));
}
if(!pages) {
  await build({entryPoints:[fileURLToPath(path('./front/room-server.mjs'))],outfile:fileURLToPath(path(output+'room-server.cjs')),bundle:true,platform:'node',target:'node18',format:'cjs',legalComments:'eof'});
  await copyFile(path('./node_modules/ws/LICENSE'),path(output+'LICENSE-WS.txt'));
  await copyFile(path('../start-room-windows.bat'),path(output+'start-room-windows.bat'));
}
