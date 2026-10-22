import type {Entity} from './schema';

/** Reports missing editorial work; never changes a publication status. */
export function editorialIssues(entity:Entity, catalogue:ReadonlyMap<string,Entity>):string[] {
 if(entity.status!=='verified'||entity.review?.edition!=='2.0')return [];
 const issues:string[]=[];
 const review=entity.review;
 if(!review.claims?.length)issues.push('Отсутствуют основания ключевых утверждений');
 if(!review.limitations?.length)issues.push('Не описаны пределы проверки');
 if(!review.unresolved)issues.push('Не зафиксированы открытые вопросы');
 for(const claim of review.claims||[]){
  for(const id of claim.sourceIds){
   if(catalogue.get(id)?.kind!=='source')issues.push(`Основание не является источником: ${id}`);
   if(entity.kind!=='source'&&!entity.sourceIds.includes(id))issues.push(`Основание отсутствует в библиографии: ${id}`);
  }
 }
 if(entity.kind==='article'||entity.kind==='person'){
  const claimSources=new Set(review.claims?.flatMap(claim=>claim.sourceIds));
  if((review.claims?.length||0)<3)issues.push('Для большого материала нужны отдельные основания тезисов');
  if(![...claimSources].some(id=>catalogue.get(id)?.sourceType==='primary'))issues.push('Нет проверенного античного свидетельства');
  if(![...claimSources].some(id=>catalogue.get(id)?.sourceType==='research'))issues.push('Нет проверенной современной интерпретации');
  for(const kind of ['article','event','place'] as const){
   if(kind===entity.kind)continue;
   if(!entity.relatedIds.some(id=>catalogue.get(id)?.kind===kind))issues.push(`Нет основной связи: ${kind}`);
  }
  if(entity.kind==='article'&&!entity.relatedIds.some(id=>catalogue.get(id)?.kind==='object'))issues.push('Нет связанного музейного предмета');
 }
 return issues;
}
