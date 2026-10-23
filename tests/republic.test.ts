import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import type {FeatureCollection,Point} from 'geojson';
import {getEntity,ofKind,related,chronological,byId} from '../src/lib/catalog';
import {editorialIssues} from '../src/lib/editorial';
import edition from '../src/data/edition-2.0.json';
const places=JSON.parse(readFileSync('public/geo/places.geojson','utf8')) as FeatureCollection<Point>;

const studies=['gracchi-land','marius-army','sulla-civil-war','caesar-gaul','caesar-pompey','fall-republic'];
const biographies=['tiberius-gracchus','gaius-gracchus','marius','sulla','pompey','caesar'];
test('late republican studies have substantive bodies, evidence and a complete reading graph',()=>{
 for(const id of studies){
  const entity=getEntity(id);
  const text=readFileSync(`src/content/articles/${id}.mdx`,'utf8').replace(/^---[\s\S]*?---\s*/,'').replace(/^import[^\n]*$/gm,'').replace(/<figure>[\s\S]*?<\/figure>/g,'').replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').replace(/^##.*$/gm,'').trim();
  assert(text.split(/\s+/).length>=1200,`${id}: prose excluding frontmatter, headings, illustration and link URLs`);
  assert.deepEqual(editorialIssues(entity,byId),[]);
  for(const kind of ['person','event','place','object'])assert(related(id).some(e=>e.kind===kind),`${id} → ${kind}`);
  assert(entity.sourceIds.some(key=>getEntity(key).sourceType==='primary'));
  assert(entity.sourceIds.some(key=>getEntity(key).sourceType==='research'));
 }
});
test('expanded biographies and events preserve depth and source evidence',()=>{
 assert(getEntity('caesar').aliases.includes('Gaius Iulius Caesar'),'Keep the existing Latin search alias');
 for(const id of biographies){const e=getEntity(id);assert(e.sections.reduce((n,s)=>n+s.text.split(/\s+/).length,0)>=500,id);assert.deepEqual(editorialIssues(e,byId),[]);}
 const block=edition.blocks.find(b=>b.id==='late-republic')!;
 for(const id of block.entityIds){const e=getEntity(id);if(e.kind!=='event')continue;assert(e.date);assert(e.sourceIds.length);assert(e.relatedIds.some(key=>getEntity(key).kind==='person'));assert(e.relatedIds.some(key=>getEntity(key).kind==='place'));assert(e.sections.reduce((n,s)=>n+s.text.split(/\s+/).length,0)>=60,id);}
});
test('chronology distinguishes battles, death, and successive kinds of extraordinary power',()=>{
 const order=chronological(ofKind('event')).map(e=>e.id);
 for(const [a,b] of [['gracchus-law-133','gaius-tribune-123'],['marius-consul-107','sulla-march-88'],['sulla-march-88','sulla-dictator-82'],['sulla-dictator-82','civil-war'],['civil-war','pharsalus-48'],['caesar-assassination','second-triumvirate-43'],['second-triumvirate-43','philippi-42'],['philippi-42','settlement-27']])assert(order.indexOf(a)<order.indexOf(b),`${a} → ${b}`);
 assert.equal(getEntity('sullan-proscriptions-82').date?.endYear,-81);
 assert.equal(getEntity('gaius-tribune-123').date?.endYear,-122);
 assert.match(getEntity('gracchi-land').summary,/земл/i);
});
test('new geographical records preserve uncertainty and reuse the existing atlas data',()=>{
 for(const id of ['pharsalus','gergovia','bibracte','nola','brundisium']){
  const e=getEntity(id);const f=places.features.find(f=>f.id===id);assert(f,id);assert.deepEqual(f.geometry.coordinates,e.coordinates);assert.match(e.coordinateAccuracy!,/не точная/);
 }
 assert.equal(getEntity('gergovia').subtitle,'Gergovia?');
 assert(getEntity('gergovia').review!.unresolved!.length>0);
 assert.notEqual(getEntity('bibracte').id,getEntity('lugdunum').id);
 assert(related('met-248034').some(e=>e.id==='fall-republic'));
 assert(related('nola').some(e=>e.id==='sulla-civil-war'));
});
