import {build} from 'esbuild';
import {readFile,writeFile,copyFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const path=name=>new URL(name,import.meta.url);
const toRead=async name=>readFile(path('./front/'+name),'utf8');
const [template,css,cover]=await Promise.all([toRead('index.template.html'),toRead('style.css'),readFile(path('./front/cover.webp'))]);
const result=await build({entryPoints:[fileURLToPath(path('./front/game.mjs'))],bundle:true,write:false,loader:{'.glb':'binary'},format:'iife',legalComments:'eof',minify:true,target:['chrome105','firefox110','safari16']});
const sheet=css.replaceAll('COVER_DATA','data:image/webp;base64,'+cover.toString('base64'));
const script=result.outputFiles[0].text.replace(/<\/script/gi,'<\\/script');
const html=template.replace('/* STYLES */',()=>sheet).replace('/* GAME */',()=>script);
await mkdir(path('./release/'),{recursive:true});
await writeFile(path('./release/index.html'),html);
await build({entryPoints:[fileURLToPath(path('./front/room-server.mjs'))],outfile:fileURLToPath(path('./release/room-server.cjs')),bundle:true,platform:'node',target:'node18',format:'cjs',legalComments:'eof'});
await copyFile(path('./node_modules/three/LICENSE'),path('./release/LICENSE-THREE.txt'));
await copyFile(path('./node_modules/ws/LICENSE'),path('./release/LICENSE-WS.txt'));
for(const name of ['README.txt','CHARACTER-CREDITS.txt','LICENSE-NOTO.txt','start-room-windows.bat']) {
  await copyFile(path('../'+name),path('./release/'+name));
}
