import { readFileSync,readdirSync,existsSync } from 'node:fs';
import assert from 'node:assert/strict';
import {allEntities,entities,byId,ofKind} from '../src/lib/catalog';
import {chronologicalYear} from '../src/lib/schema';
import records from '../src/data/museum-records.json';
import manifest from '../public/geo/manifest.json';
import imageMetadata from '../src/data/image-metadata.json';
const allIds=new Set<string>();
for(const e of allEntities){
 assert(!allIds.has(e.id),`Duplicate ID ${e.id}`);allIds.add(e.id);
 if(e.date?.endYear)assert(chronologicalYear(e.date.year)<=chronologicalYear(e.date.endYear),`Reversed date ${e.id}`);
}
for(const e of allEntities){for(const id of [...e.relatedIds,...e.sourceIds,...e.periodIds,...e.sections.flatMap(s=>s.sourceIds),...(e.placeId?[e.placeId]:[]),...(e.commanders||[])]){assert(allIds.has(id),`Broken relation ${e.id} → ${id}`);if(e.status==='verified')assert(byId.has(id),`Public relation points to draft ${e.id} → ${id}`);}
 for(const id of e.periodIds)assert(byId.get(id)?.kind==='period',`Not a period ${id}`);
 if(e.status==='verified'){assert(e.review?.evidence.length,`Missing review ${e.id}`);assert(e.sourceIds.length||e.url,`Missing attribution ${e.id}`);}
 if(e.image)assert(existsSync(`public${e.image}`),`Missing image ${e.image}`);
 if(e.kind==='place'){assert(e.coordinates&&e.pleiadesId&&e.coordinateAccuracy&&e.url,`Incomplete place ${e.id}`);}
 if(e.kind==='object'){for(const field of ['museum','accessionNumber','material','dimensions','findspot','provenance','objectDate','image','license','url'] as const)assert(e[field],`Missing museum ${field}: ${e.id}`);const record=records.find(r=>`met-${r.objectID}`===e.id);assert(record?.isPublicDomain&&record.primaryImage,`Rights not checked: ${e.id}`);assert.equal(e.accessionNumber,record.accessionNumber);}
 if(e.kind==='dataset')assert(e.license&&e.version&&e.attribution&&e.url);
}
function coords(value:unknown):void {assert(Array.isArray(value));if(typeof value[0]==='number'){assert(value.length>=2);assert(Number.isFinite(value[0])&&Math.abs(value[0])<=180);assert(typeof value[1]==='number'&&Number.isFinite(value[1])&&Math.abs(value[1])<=90);}else value.forEach(coords);}
for(const file of readdirSync('public/geo').filter(f=>f.endsWith('.geojson'))){const geo=JSON.parse(readFileSync(`public/geo/${file}`,'utf8'));assert.equal(geo.type,'FeatureCollection');assert(geo.features.length>0);for(const f of geo.features){assert(f.geometry);coords(f.geometry.coordinates);if(f.geometry.type==='Polygon')for(const ring of f.geometry.coordinates){assert(ring.length>=4);assert.deepEqual(ring[0],ring.at(-1));}}}
for(const m of manifest){assert(m.license&&m.url&&m.version&&m.sha256);assert(existsSync(`public${m.file}`));}
const articleFiles=readdirSync('src/content/articles').filter(f=>f.endsWith('.mdx'));
for(const e of ofKind('article')){const body=readFileSync(`src/content/articles/${e.id}.mdx`,'utf8');assert(body.includes(`entityId: ${e.id}`));assert(body.includes('status: verified'));assert(body.split(/\s+/).length>=800,`Research too short: ${e.id}`);assert(body.includes('/sources/'),`Missing claim citations: ${e.id}`);}
assert.equal(articleFiles.length,ofKind('article').length);
console.log(`Validated ${allEntities.length} entities, ${entities.length} published, ${articleFiles.length} MDX articles, ${records.length} museum rights records and ${manifest.length+1} GeoJSON files.`);

for(const [file,size] of Object.entries(imageMetadata)){assert(existsSync(`public${file}`),`Missing responsive image ${file}`);assert(size.width>0&&size.height>0,`Invalid image size ${file}`);}
for(const e of entities)if(e.image)assert(e.image in imageMetadata,`Missing image metadata ${e.id}`);
