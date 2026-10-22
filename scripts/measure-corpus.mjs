/** Static payload audit after npm run build. Does not fetch museum APIs or load the full corpus in a browser. */
import {readFile,stat,readdir,mkdir,writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {join} from 'node:path';
async function files(directory){const entries=await readdir(directory,{withFileTypes:true});return (await Promise.all(entries.map(entry=>entry.isDirectory()?files(join(directory,entry.name)):[join(directory,entry.name)]))).flat();}
const root='dist';const paths=await files(root);const pages={};
for(const route of ['','articles','people','timeline','collection','library','search','articles/punic-wars','atlas']){
 const body=await readFile(join(root,route,'index.html'));pages[route||'home']={bytes:body.length,gzipBytes:gzipSync(body).length};
}
const data={htmlFiles:paths.filter(path=>path.endsWith('.html')).length,searchBytes:(await Promise.all(paths.filter(path=>path.startsWith('dist/pagefind/')).map(async path=>(await stat(path)).size))).reduce((a,b)=>a+b,0),catalogBytes:(await stat('src/data/catalog.json')).size,placesBytes:(await stat('public/geo/places.geojson')).size,pages};
const output=process.argv[2];if(output){await mkdir(join(output,'..'),{recursive:true});await writeFile(output,JSON.stringify(data,null,2)+'\n');}else console.log(JSON.stringify(data,null,2));
