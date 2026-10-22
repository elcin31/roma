/** Download only reviewed Met Open Access images; preserve originals in ignored research/. */
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import sharp from 'sharp';
const records=JSON.parse(await readFile(new URL('../src/data/museum-records.json',import.meta.url),'utf8'));
const root=new URL('../',import.meta.url);
await mkdir(new URL('research/',root),{recursive:true});
await mkdir(new URL('public/images/',root),{recursive:true});
for(const record of records){
 if(!record.isPublicDomain||!record.primaryImage||record.imageLicense!=='CC0 1.0')throw new Error(`Unapproved image rights: ${record.objectID}`);
 const original=new URL(`research/${record.objectID}.jpg`,root);
 try{await access(original);}catch{
  const response=await fetch(record.primaryImage,{signal:AbortSignal.timeout(60000)});
  if(!response.ok)throw new Error(`Met image ${record.objectID}: HTTP ${response.status}`);
  await writeFile(original,Buffer.from(await response.arrayBuffer()));
 }
 const input=await readFile(original);
 for(const [suffix,width,height,quality] of [['',1400,1500,85],['-small',600,700,82]]){
  await sharp(input).rotate().resize({width,height,fit:'inside',withoutEnlargement:true}).webp({quality}).toFile(new URL(`public/images/met-${record.objectID}${suffix}.webp`,root).pathname);
 }
 console.log(`Prepared Met ${record.objectID} (CC0)`);
}
