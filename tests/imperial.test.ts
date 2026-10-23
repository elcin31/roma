import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {getEntity,related,chronological,ofKind,byId} from '../src/lib/catalog';
import {editorialIssues} from '../src/lib/editorial';
import records from '../src/data/museum-records.json';
import provenance from '../src/data/place-provenance.json';

const studies=['imperial-economy','slavery-society','roman-city-life','religion-christianity','trajan-empire','third-century-crisis'];
test('imperial studies have substantive prose, evidence and connected reading paths',()=>{
 for(const id of studies){
  const e=getEntity(id);
  const prose=readFileSync(`src/content/articles/${id}.mdx`,'utf8').replace(/^---[\s\S]*?---\s*/,'').replace(/^import[^\n]*$/gm,'').replace(/<figure>[\s\S]*?<\/figure>/g,'').replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').replace(/^##.*$/gm,'').trim();
  assert(prose.split(/\s+/).length>=1200,`${id}: exclude metadata, illustrations, headings and link URLs`);
  assert.deepEqual(editorialIssues(e,byId),[]);
  for(const kind of ['person','event','place','object'])assert(related(id).some(item=>item.kind===kind),`${id} → ${kind}`);
  for(const type of ['primary','research'])assert(e.sourceIds.some(key=>getEntity(key).sourceType===type),`${id}: ${type}`);
 }
});

test('imperial biographies retain depth and distinguish reign from lifespan',()=>{
 for(const id of ['antoninus-pius','commodus','septimius-severus','caracalla','aurelian','trajan']){
  const e=getEntity(id);assert(e.sections.reduce((n,s)=>n+s.text.split(/\s+/).length,0)>=500,id);
  assert.deepEqual(editorialIssues(e,byId),[]);
  assert(related(id).some(item=>item.kind==='article'));
 }
 assert(getEntity('trajan').aliases.includes('Marcus Ulpius Traianus'));
 assert.match(getEntity('aurelian').date!.label!,/Правление/);
 assert.equal(getEntity('aurelian').date!.year,270);
});

test('museum metadata distinguishes the issuer, portrait subject, restoration and object date',()=>{
 for(const id of ['met-248058','met-248050','met-246882','met-248899','met-252884','met-253569']){
  const e=getEntity(id);const record=records.find(item=>`met-${item.objectID}`===id)!;
  assert(record.isPublicDomain&&record.primaryImage,id);assert.equal(e.accessionNumber,record.accessionNumber);assert.equal(e.material,record.medium);
  assert.deepEqual(editorialIssues(e,byId),[]);
 }
 assert.match(getEntity('met-248050').title,/Плавтилла/);
 assert.match(getEntity('met-246882').title,/Фаустины/);
 assert.match(getEntity('met-248899').sections[0].text,/современный слепок/);
 assert.match(getEntity('met-248058').sections[0].text,/фотография показывает лицевую сторону/);
 assert.equal(getEntity('met-252884').date!.endYear,370);
 assert.match(getEntity('met-252884').sections[0].text,/337/);
 assert.match(getEntity('met-253569').sections.map(s=>s.text).join(' '),/имя не устанавливает бывшего рабского статуса/);
});

test('imperial chronology separates conquest, renewed violence and reunification',()=>{
 const ids=chronological(ofKind('event')).map(e=>e.id);
 for(const [a,b] of [['dacia-first-101','dacia-second-105'],['dacia-second-105','parthian-campaign-114'],['caracalla-citizenship-212','caracalla-death-217'],['valerian-captured-260','palmyra-taken-272'],['palmyra-taken-272','palmyra-sacked-273'],['palmyra-sacked-273','aurelian-reunification-274'],['aurelian-reunification-274','aurelian-death-275'],['aurelian-death-275','milan-agreement-313']])assert(ids.indexOf(a)<ids.indexOf(b),`${a} → ${b}`);
 assert.equal(getEntity('pliny-bithynia-110').date!.approximate,true);
 assert.equal(getEntity('postumus-regime-260').date!.endYear,274);
 assert.match(getEntity('postumus-regime-260').sections.map(s=>s.text).join(' '),/преемник/);
});

test('Nicomedia and Palmyra use attributed city points without claiming event locations',()=>{
 const geo=JSON.parse(readFileSync('public/geo/places.geojson','utf8'));
 for(const [id,pleiadesId] of [['nicomedia','511337'],['palmyra','668331']]){
  const e=getEntity(id);const feature=geo.features.find((item:{id:string})=>item.id===id);
  assert.equal(e.pleiadesId,pleiadesId);assert.deepEqual(feature.geometry.coordinates,e.coordinates);
  assert(provenance.some(item=>item.id===id&&item.pleiadesId===pleiadesId));
  assert.match(e.coordinateAccuracy!,/не точная/);
  assert(related(id).some(item=>item.kind==='article'));
 }
});
