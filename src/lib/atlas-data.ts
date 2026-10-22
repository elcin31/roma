import {ofKind,related} from './catalog';
import {entityUrl} from './schema';
import type {AtlasPlace} from '../components/Atlas';
export const atlasPlaces:AtlasPlace[]=ofKind('place').filter(p=>p.coordinates).map(p=>({id:p.id,title:p.title,summary:p.summary,coordinates:p.coordinates!,modernName:p.modernName,province:p.province,coordinateAccuracy:p.coordinateAccuracy,aliases:p.aliases,url:p.url,related:related(p.id).filter(e=>e.kind!=='source').sort((a,b)=>Number(b.kind==='article')-Number(a.kind==='article')).slice(0,5).map(e=>({title:e.title,url:entityUrl(e)}))}));
