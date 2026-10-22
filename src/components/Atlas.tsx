import { useEffect, useRef, useState } from 'react';
import type { Map as LibreMap, Marker, GeoJSONSource } from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import 'maplibre-gl/dist/maplibre-gl.css';
import '../styles/atlas.css';
export interface AtlasPlace {id:string;title:string;summary:string;coordinates:[number,number];modernName?:string;province?:string;coordinateAccuracy?:string;aliases:string[];url?:string;related:{title:string;url:string}[];}
interface Props { places:AtlasPlace[]; preview?:boolean; }
const periods=[{id:'republic',year:'60 до н. э.',name:'Поздняя республика'},{id:'trajan',year:'117 н. э.',name:'Время Траяна'},{id:'severan',year:'200 н. э.',name:'Эпоха Северов'}];
const militaryIds=['carthage','alexandria','roma','alesia'];
const cultureIds=['pompeii','athens','ephesus','roma'];
const militaryNotes:Record<string,string>={alesia:'Осада Алезии, 52 до н. э. Цезарь и Верцингеториг. Точка обозначает оппидум, не линии осады.',carthage:'Разрушение пунического города, 146 до н. э. Точка обозначает город, не контур боевых действий.',alexandria:'Захват Египта Октавианом, 30 до н. э. Точка обозначает город, не положение войск.',roma:'Взятие Рима Аларихом, 410 н. э. Точка обозначает город, не маршрут наступления.'};
export default function Atlas({places,preview=false}:Props){
 const container=useRef<HTMLDivElement>(null);const map=useRef<LibreMap|null>(null);const markers=useRef<{marker:Marker;id:string}[]>([]);
 const [ready,setReady]=useState(false);const [error,setError]=useState('');const [layerError,setLayerError]=useState('');const [retry,setRetry]=useState(0);
 const [period,setPeriod]=useState('trajan');const [loadedPeriod,setLoadedPeriod]=useState('');const [loading,setLoading]=useState(true);
 const [mode,setMode]=useState('political');const [cities,setCities]=useState(true);const [roads,setRoads]=useState(false);const [borders,setBorders]=useState(true);const [provinces,setProvinces]=useState(false);
 const [selected,setSelected]=useState<AtlasPlace|null>(null);const [query,setQuery]=useState('');const [settings,setSettings]=useState(false);const panel=useRef<HTMLElement>(null);
 const choose=(p:AtlasPlace)=>{setSelected(p);setQuery('');const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;map.current?.flyTo({center:p.coordinates,zoom:Math.max(map.current.getZoom(),5),duration:reduced?0:650});if(!preview){const u=new URL(window.location.href);u.searchParams.set('place',p.id);history.replaceState(null,'',u);}};
 useEffect(()=>{
  let disposed=false;let instance:LibreMap|undefined;const controller=new AbortController();
  setError('');setReady(false);setLoading(true);
  (async()=>{try{
   const libre=await import('maplibre-gl');if(disposed||!container.current)return;
   instance=new libre.Map({container:container.current,center:[16,38],zoom:preview?3:3.3,minZoom:1.8,maxZoom:9,attributionControl:false,style:{version:8,sources:{land:{type:'geojson',data:'/geo/land.geojson'}},layers:[{id:'water',type:'background',paint:{'background-color':'#cdd8d4'}},{id:'land',type:'fill',source:'land',paint:{'fill-color':'#eee9dd'}},{id:'coast',type:'line',source:'land',paint:{'line-color':'#aaa99b','line-width':.7}}]}});
   map.current=instance;instance.addControl(new libre.NavigationControl({showCompass:false}),'top-right');instance.addControl(new libre.ScaleControl({maxWidth:90,unit:'metric'}),'bottom-left');
   instance.on('error',e=>{if(!disposed){setLayerError('Не удалось загрузить часть карты. Проверьте соединение и повторите загрузку.');console.error('Atlas:',e.error?.message);}});
   instance.on('load',()=>{if(disposed||!instance)return;
    instance.addSource('territory',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
    instance.addLayer({id:'territory-fill',type:'fill',source:'territory',paint:{'fill-color':'#975f55','fill-opacity':.24}});
    instance.addLayer({id:'territory-line',type:'line',source:'territory',paint:{'line-color':'#7b4842','line-width':1.25}});
    for(const p of places){const el=document.createElement('button');el.type='button';el.className='place-marker';el.setAttribute('aria-label',`Открыть ${p.title}`);el.dataset.place=p.id;if(p.id==='ostia')el.classList.add('minor-place');const dot=document.createElement('i');dot.setAttribute('aria-hidden','true');const label=document.createElement('span');label.textContent=p.title;el.append(dot,label);el.addEventListener('click',()=>choose(p));const marker=new libre.Marker({element:el,anchor:'bottom'}).setLngLat(p.coordinates).addTo(instance);markers.current.push({marker,id:p.id});}
    instance.on('zoom',()=>{container.current?.classList.toggle('map-detailed',instance!.getZoom()>5)});setReady(true);const id=new URLSearchParams(location.search).get('place');const initial=places.find(p=>p.id===id);if(initial&&!preview)choose(initial);
   });
  }catch(e){if(!disposed){setError('Карта недоступна в этом браузере. Нужна поддержка WebGL. Справочник мест доступен по ссылке ниже.');setLoading(false);console.error(e);}}})();
  return()=>{disposed=true;controller.abort();markers.current.forEach(({marker})=>marker.remove());markers.current=[];instance?.remove();map.current=null;};
 },[retry]);
 useEffect(()=>{if(!ready||!map.current)return;const controller=new AbortController();setLoading(true);setLayerError('');
  // Remove stale boundaries immediately: the displayed year never labels another snapshot.
  (map.current.getSource('territory') as GeoJSONSource)?.setData({type:'FeatureCollection',features:[]});setLoadedPeriod('');
  fetch(`/geo/${period}.geojson`,{signal:controller.signal}).then(r=>{if(!r.ok)throw new Error(String(r.status));return r.json() as Promise<FeatureCollection>}).then(data=>{if(controller.signal.aborted)return;(map.current?.getSource('territory') as GeoJSONSource)?.setData(data);setLoadedPeriod(period);setLoading(false);}).catch(e=>{if(e.name!=='AbortError'){setLayerError('Исторический слой не загрузился. Повторите загрузку.');setLoading(false);}});return()=>controller.abort();
 },[ready,period]);
 useEffect(()=>{const m=map.current;if(!ready||!m)return;for(const id of ['territory-fill','territory-line'])m.setLayoutProperty(id,'visibility',borders?'visible':'none');markers.current.forEach(({marker,id})=>{const relevant=mode==='military'?militaryIds.includes(id):mode==='culture'?cultureIds.includes(id):true;marker.getElement().hidden=!cities||!relevant;});},[ready,borders,cities,mode]);
 useEffect(()=>{const m=map.current;if(!ready||!m)return;const controller=new AbortController();const tasks:[string,boolean][]=[['roads',roads],['provinces',provinces&&period==='severan']];
  for(const [id,enabled] of tasks){if(m.getLayer(id)){m.setLayoutProperty(id,'visibility',enabled?'visible':'none');continue;}if(!enabled)continue;
   fetch(`/geo/${id}.geojson`,{signal:controller.signal}).then(r=>{if(!r.ok)throw new Error(String(r.status));return r.json() as Promise<FeatureCollection>}).then(data=>{if(controller.signal.aborted||!map.current)return;const current=map.current;if(!current.getSource(id)){current.addSource(id,{type:'geojson',data});current.addLayer({id,type:'line',source:id,paint:{'line-color':id==='roads'?'#8c7150':'#743b3a','line-width':id==='roads'?1.1:.9,'line-opacity':.75,...(id==='provinces'?{'line-dasharray':[3,3]}:{})}});}}).catch(e=>{if(e.name!=='AbortError')setLayerError('Дополнительный слой не загрузился. Повторите загрузку.')});
  }return()=>controller.abort();
 },[ready,roads,provinces,period]);
 const changeMode=(next:string)=>{setMode(next);setCities(true);setRoads(next==='infrastructure');setSelected(null);};
 const matches=query.trim()?places.filter(p=>[p.title,p.modernName,...p.aliases].join(' ').toLocaleLowerCase('ru').includes(query.toLocaleLowerCase('ru'))):[];
 return <div className={`atlas ${preview?'atlas-preview':''}`} data-ready={ready} data-period={loadedPeriod} data-roads={roads} data-borders={borders} data-mode={mode}>
  {!preview&&<div className="atlas-toolbar"><div className="atlas-search"><label className="sr-only" htmlFor="place-search">Найти место</label><input id="place-search" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Escape')setQuery('');if(e.key==='Enter'&&matches[0]){setCities(true);setMode('political');choose(matches[0]);}}} placeholder="Найти город · Roma, Рим…" autoComplete="off"/>{query&&<div className="place-results" aria-label="Найденные места">{matches.length?matches.map(p=><button key={p.id} onClick={()=>{setCities(true);setMode('political');choose(p);}}>{p.title}<small>{p.modernName}</small></button>):<p>Место не найдено в текущем каталоге.</p>}</div>}</div><div className="atlas-modes" aria-label="Режим карты">{[['political','Политика'],['infrastructure','Дороги'],['military','Военная история'],['culture','Культура']].map(([id,label])=><button key={id} aria-pressed={mode===id} onClick={()=>changeMode(id)}>{label}</button>)}</div><button className="layers-toggle" aria-expanded={settings} onClick={()=>setSettings(!settings)}>Слои <span aria-hidden="true">≡</span></button></div>}
  <div className="atlas-stage"><div ref={container} className="map-canvas" aria-label="Интерактивная карта Римского мира"/>
   {!preview&&settings&&<section className="layer-panel" aria-label="Слои карты"><div className="panel-heading"><span className="eyebrow">СЛОИ</span><button onClick={()=>setSettings(false)} aria-label="Закрыть слои">×</button></div><label><input type="checkbox" checked={borders} onChange={e=>setBorders(e.target.checked)}/>Территории</label><label><input type="checkbox" checked={cities} onChange={e=>setCities(e.target.checked)}/>Города Pleiades</label><label><input type="checkbox" checked={roads} onChange={e=>setRoads(e.target.checked)}/>Дороги AWMC</label><label><input type="checkbox" checked={provinces} disabled={period!=='severan'} onChange={e=>setProvinces(e.target.checked)}/>Границы провинций · 200</label><p>Дороги имеют широкую датировку. Провинции — линии без подписанных полигонов.</p></section>}
   {!error&&loading&&<div className="map-loading" role="status">Загрузка исторического слоя…</div>}
   {(error||layerError)&&<div className="map-error" role="alert"><p>{error||layerError}</p><button onClick={()=>{setLayerError('');setRetry(x=>x+1)}}>Повторить</button><a href="/places/">Справочник мест →</a></div>}
   {selected&&<aside ref={panel} className="place-panel" aria-label="Выбранное место"><div className="panel-heading"><span className="eyebrow">PLEIADES · МЕСТО</span><button onClick={()=>{setSelected(null);if(!preview){const u=new URL(location.href);u.searchParams.delete('place');history.replaceState(null,'',u);}}} aria-label="Закрыть место">×</button></div><h2>{selected.title}</h2><span className="place-modern">{selected.modernName}</span><p>{mode==='military'?militaryNotes[selected.id]:selected.summary}</p><p className="place-province">{selected.province}</p><details><summary>Координаты и источники</summary><p>{selected.coordinateAccuracy}</p><a href={selected.url}>Запись Pleiades →</a></details><a className="text-link" href={`/places/${selected.id}/`}>История места <span>→</span></a>{!preview&&selected.related.slice(0,2).map(r=><a className="place-related" key={r.url} href={r.url}>{r.title} →</a>)}</aside>}
   <div className="map-sea-label" aria-hidden="true">MARE INTERNUM</div>
   <div className="map-legend"><i/> Римские владения · реконструкция</div>
  </div>
  <div className="map-timeline"><span className="eyebrow">ВРЕМЯ</span><div role="group" aria-label="Исторический срез">{periods.map(p=><button key={p.id} aria-pressed={period===p.id} onClick={()=>setPeriod(p.id)}><strong>{p.year}</strong><small>{p.name}</small></button>)}</div>{preview&&<a className="atlas-expand" href="/atlas/">Открыть атлас →</a>}</div>
  <div className="map-attribution"><p>{mode==='military'?'События разных эпох. Показаны города, а не позиции войск.':mode==='culture'?'Города и археологические комплексы разных эпох.':roads?'Дорожная сеть разных периодов; не срез на выбранный год.':'Границы условны; современная береговая линия. Города — справочный слой разных эпох.'}</p><span><a href="/credits/">AWMC · ODbL</a> / <a href="https://pleiades.stoa.org/credits">Pleiades · CC BY</a> / Natural Earth</span></div>
 </div>;
}
