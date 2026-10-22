import {test} from 'node:test';
import assert from 'node:assert/strict';
import {getEntity,byId,ofKind,related,chronological,isPublished} from '../src/lib/catalog';
import {entitySchema,formatDate} from '../src/lib/schema';
import {editorialIssues} from '../src/lib/editorial';
import edition from '../src/data/edition-2.0.json';
import records from '../src/data/museum-records.json';
import geo from '../src/data/place-provenance.json';

test('filled sources and review do not publish draft or needs_review content',()=>{
 const entry=getEntity('punic-wars');
 for(const status of ['draft','needs_review'] as const){const copy={...entry,status};assert(copy.sourceIds.length);assert(copy.review);assert.equal(isPublished(copy),false);assert.equal(copy.status,status);}
 assert.equal(isPublished({...entry,review:undefined}),false);
});
test('new verified research requires claim evidence, limits and both kinds of scholarship',()=>{
 const original=getEntity('punic-wars');assert.deepEqual(editorialIssues(original,byId),[]);
 assert(editorialIssues({...original,review:{...original.review!,claims:[],limitations:[],unresolved:undefined}},byId).length>=5);
 const onlyAncient={...original,review:{...original.review!,claims:original.review!.claims!.map(c=>({...c,sourceIds:['polybius-one']}))}};
 assert(editorialIssues(onlyAncient,byId).some(s=>s.includes('современной')));
 const bad={...original,review:{...original.review!,claims:[{claim:'Персона не должна подменять исторический источник.',sourceIds:['hannibal'],locator:'Недопустимая ссылка'}]}};
 assert(editorialIssues(bad,byId).some(s=>s.includes('не является источником')));
});
test('editorial source references must belong to the bibliography',()=>{
 const original=getEntity('punic-wars');const altered={...original,review:{...original.review!,claims:[...original.review!.claims!,{claim:'Нельзя незаметно сослаться на неиспользованную книгу.',sourceIds:['institutes'],locator:'Не включено в библиографию'}]}};
 assert(editorialIssues(altered,byId).some(s=>s.includes('библиографии')));
});
test('editor explicit links lead the reading path without duplicate backlinks',()=>{
 const ids=related('hannibal').map(e=>e.id);assert.equal(ids[0],'punic-wars');assert.equal(new Set(ids).size,ids.length);assert(ids.includes('cannae-216'));
 assert(related('cannae-216').some(e=>e.id==='carthage'));
});
test('expanded timeline sorts BCE dates and retains uncertainty',()=>{
 const ids=chronological(ofKind('event')).map(e=>e.id);
 for(const [a,b] of [['first-punic-264','cannae-216'],['cannae-216','zama-202'],['zama-202','peace-201'],['peace-201','corinth-146'],['corinth-146','settlement-27']])assert(ids.indexOf(a)<ids.indexOf(b));
 assert.match(formatDate(getEntity('hannibal').date),/183\/182\/181/);
 assert.match(formatDate(getEntity('fabius-maximus').date),/не установлен/);
 assert.equal(entitySchema.safeParse({...getEntity('hannibal'),date:{year:0}}).success,false);
});
test('edition registry has substantive public material and traceable museum rights',()=>{
 for(const id of edition.entityIds){const e=getEntity(id);assert.equal(e.review?.edition,'2.0');assert.deepEqual(editorialIssues(e,byId),[]);}
 const additions=edition.entityIds.map(getEntity);assert.equal(additions.filter(e=>e.kind==='article').length,2);
 for(const place of additions.filter(e=>e.kind==='place'))assert(geo.some(r=>r.id===place.id&&r.pleiadesId===place.pleiadesId));
 for(const object of additions.filter(e=>e.kind==='object')){const record=records.find(r=>`met-${r.objectID}`===object.id);assert(record?.isPublicDomain&&record.primaryImage);assert.equal(object.accessionNumber,record.accessionNumber);assert.equal(object.material,record.medium);}
 assert.equal(getEntity('cannae').pleiadesId,'442523');assert.equal(getEntity('messana').pleiadesId,'462538');assert.equal(getEntity('carthago-nova').pleiadesId,'265849');
});
