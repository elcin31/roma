import {useCallback,useEffect,useRef,useState} from 'react';
import type {Map as LibreMap,Marker,GeoJSONSource} from 'maplibre-gl';
import {createAtlasLoader,type DatasetId} from '../lib/atlas-cache';
import {loadMapStyles} from '../lib/map-styles';
import '../styles/atlas.css';

export interface AtlasPlace {id:string;title:string;summary:string;coordinates:[number,number];modernName?:string;province?:string;coordinateAccuracy?:string;aliases:string[];url?:string;related:{title:string;url:string}[];}
interface Props {places:AtlasPlace[];preview?:boolean;}
const periods=[{id:'republic',year:'60 до н. э.',name:'Поздняя республика'},{id:'trajan',year:'117 н. э.',name:'Время Траяна'},{id:'severan',year:'200 н. э.',name:'Эпоха Северов'}] as const;
type Period=typeof periods[number]['id'];
type Layer='territory'|'roads'|'provinces';
const militaryIds=['carthage','alexandria','roma','alesia'];
const cultureIds=['pompeii','athens','ephesus','roma'];
const militaryNotes:Record<string,string>={alesia:'Осада Алезии, 52 до н. э. Цезарь и Верцингеториг. Точка обозначает оппидум, не линии осады.',carthage:'Разрушение пунического города, 146 до н. э. Точка обозначает город, не контур боевых действий.',alexandria:'Захват Египта Октавианом, 30 до н. э. Точка обозначает город, не положение войск.',roma:'Взятие Рима Аларихом, 410 н. э. Точка обозначает город, не маршрут наступления.'};

export default function Atlas({places,preview=false}:Props){
  const container=useRef<HTMLDivElement>(null);
  const map=useRef<LibreMap|null>(null);
  const markers=useRef<{marker:Marker;id:string}[]>([]);
  const loader=useRef<ReturnType<typeof createAtlasLoader>|null>(null);
  if(!loader.current)loader.current=createAtlasLoader();
  const [ready,setReady]=useState(false);
  const [error,setError]=useState('');
  const [errors,setErrors]=useState<Partial<Record<Layer,string>>>({});
  const [retry,setRetry]=useState(0);
  const [retries,setRetries]=useState({territory:0,roads:0,provinces:0});
  const [period,setPeriod]=useState<Period>('trajan');
  const [loadedPeriod,setLoadedPeriod]=useState('');
  const [loading,setLoading]=useState(true);
  const [pending,setPending]=useState({roads:false,provinces:false});
  const [mode,setMode]=useState('political');
  const [cities,setCities]=useState(true);
  const [roads,setRoads]=useState(false);
  const [borders,setBorders]=useState(true);
  const [provinces,setProvinces]=useState(false);
  const [selected,setSelected]=useState<AtlasPlace|null>(null);
  const [query,setQuery]=useState('');
  const [settings,setSettings]=useState(false);
  const searchInput=useRef<HTMLInputElement>(null);
  const layersToggle=useRef<HTMLButtonElement>(null);
  const layerPanel=useRef<HTMLElement>(null);
  const placeTitle=useRef<HTMLHeadingElement>(null);
  const placePanel=useRef<HTMLElement>(null);
  const syncMarkers=useRef<()=>void>(()=>{});
  const returnFocus=useRef<HTMLElement|null>(null);
  const focusFrame=useRef(0);

  const updateURL=useCallback((id?:string)=>{
    if(preview)return;
    const url=new URL(location.href);
    if(id)url.searchParams.set('place',id);else url.searchParams.delete('place');
    history.replaceState(null,'',url);
  },[preview]);
  const choose=useCallback((place:AtlasPlace,trigger?:HTMLElement)=>{
    returnFocus.current=trigger||null;
    setSelected(place);setSettings(false);setQuery('');updateURL(place.id);
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    map.current?.flyTo({center:place.coordinates,zoom:Math.max(map.current.getZoom(),5),duration:reduced?0:500});
    if(trigger){cancelAnimationFrame(focusFrame.current);focusFrame.current=requestAnimationFrame(()=>placeTitle.current?.focus({preventScroll:true}));}
  },[updateURL]);
  const closePlace=useCallback((restore=true)=>{
    setSelected(null);updateURL();
    if(restore){const trigger=returnFocus.current;cancelAnimationFrame(focusFrame.current);focusFrame.current=requestAnimationFrame(()=>{syncMarkers.current();if(trigger?.isConnected&&!trigger.hidden&&getComputedStyle(trigger).visibility!=='hidden')trigger.focus({preventScroll:true});else searchInput.current?.focus({preventScroll:true});});}
  },[updateURL]);
  const closeLayers=useCallback((restore=true)=>{setSettings(false);if(restore)layersToggle.current?.focus({preventScroll:true});},[]);
  const layerError=useCallback((id:Layer,message?:string)=>{
    setErrors(previous=>{if(previous[id]===message)return previous;const next={...previous};if(message)next[id]=message;else delete next[id];return next;});
  },[]);

  useEffect(()=>{
    let disposed=false;
    let instance:LibreMap|undefined;
    let resize:ResizeObserver|undefined;
    let resizeFrame=0;
    const controller=new AbortController();
    setError('');setErrors({});setReady(false);setLoading(true);setLoadedPeriod('');
    let phase='preload';let landFailed=false;
    (async()=>{
      try{
        const [libre,,land]=await Promise.all([import('maplibre-gl'),loadMapStyles(),loader.current!('land',controller.signal).catch(error=>{landFailed=true;throw error;})]);
        // Let the document paint before the first WebGL shader compilation.
        await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
        if(disposed||!container.current)return;
        phase='engine';
        instance=new libre.Map({
          container:container.current,center:[16,38],zoom:preview?3:3.3,minZoom:1.8,maxZoom:9,
          attributionControl:false,dragRotate:false,pitchWithRotate:false,maxPitch:0,fadeDuration:0,
          // DOM labels retain native resolution; cap the expensive WebGL surface on high-DPI phones.
          pixelRatio:Math.min(devicePixelRatio||1,1.5),renderWorldCopies:false,
          locale:{'NavigationControl.ZoomIn':'Увеличить масштаб','NavigationControl.ZoomOut':'Уменьшить масштаб','Map.Title':'Карта Римского мира'},
          style:{version:8,sources:{land:{type:'geojson',data:land},territory:{type:'geojson',data:{type:'FeatureCollection',features:[]}}},layers:[
            {id:'water',type:'background',paint:{'background-color':'#cdd8d4'}},
            {id:'land',type:'fill',source:'land',paint:{'fill-color':'#eee9dd','fill-outline-color':'#aaa99b'}},
            {id:'territory-fill',type:'fill',source:'territory',layout:{visibility:'none'},paint:{'fill-color':'rgba(151,95,85,0.24)','fill-outline-color':'#7b4842'}}
          ]}
        });
        map.current=instance;
        instance.touchZoomRotate.disableRotation();
        instance.addControl(new libre.NavigationControl({showCompass:false}),'top-right');
        instance.addControl(new libre.ScaleControl({maxWidth:90,unit:'metric'}),'bottom-left');
        instance.on('error',()=>{if(!disposed)setError('Не удалось отобразить карту. Повторите загрузку или откройте справочник мест.');});
        instance.on('load',()=>{
          if(disposed||!instance)return;
          for(const place of places){
            const element=document.createElement('button');element.type='button';element.className='place-marker';element.setAttribute('aria-label',`Открыть ${place.title}`);element.dataset.place=place.id;
            const dot=document.createElement('i');dot.setAttribute('aria-hidden','true');const label=document.createElement('span');label.textContent=place.title;element.append(dot,label);
            element.addEventListener('click',()=>choose(place,element));
            const marker=new libre.Marker({element,anchor:'bottom'}).setLngLat(place.coordinates).addTo(instance);
            markers.current.push({marker,id:place.id});
          }
          instance.on('moveend',()=>requestAnimationFrame(()=>{if(!disposed)syncMarkers.current();}));
          instance.once('idle',()=>syncMarkers.current());
          setReady(true);
          const initial=places.find(p=>p.id===new URLSearchParams(location.search).get('place'));
          if(initial&&!preview)choose(initial);
        });
        resize=new ResizeObserver(()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{if(!disposed)instance?.resize();});});
        resize.observe(container.current);
      }catch{
        if(!disposed){setError(landFailed?'Подложка карты не загрузилась. Проверьте соединение и повторите загрузку.':phase==='engine'?'Карта недоступна в этом браузере. Для неё нужна поддержка WebGL. Справочник мест доступен ниже.':'Карта не загрузилась. Проверьте соединение и повторите загрузку.');setLoading(false);}
      }
    })();
    return()=>{disposed=true;controller.abort();resize?.disconnect();cancelAnimationFrame(resizeFrame);cancelAnimationFrame(focusFrame.current);markers.current.forEach(({marker})=>marker.remove());markers.current=[];instance?.remove();map.current=null;};
  },[retry,places,preview,choose]);

  useEffect(()=>{
    const instance=map.current;
    if(!ready||!instance)return;
    const controller=new AbortController();
    setLoading(true);setLoadedPeriod('');layerError('territory');
    for(const id of ['territory-fill'])instance.setLayoutProperty(id,'visibility','none');
    (async()=>{
      try{
        const data=await loader.current!(period,controller.signal);
        if(controller.signal.aborted)return;
        // Completion includes worker processing. A fetched response alone is not a displayed snapshot.
        await (instance.getSource('territory') as GeoJSONSource).setData(data,true);
        if(controller.signal.aborted||map.current!==instance)return;
        setLoadedPeriod(period);setLoading(false);
      }catch{
        if(!controller.signal.aborted){layerError('territory','Исторический слой не загрузился. Повторите загрузку.');setLoading(false);}
      }
    })();
    return()=>controller.abort();
  },[ready,period,retries.territory,layerError]);

  useEffect(()=>{
    const instance=map.current;
    if(!ready||!instance)return;
    for(const id of ['territory-fill'])instance.setLayoutProperty(id,'visibility',borders&&loadedPeriod===period?'visible':'none');
    syncMarkers.current();
  },[ready,borders,cities,mode,loadedPeriod,period,selected,settings]);

  // Independent effects keep a period change from cancelling an in-flight road download.
  useEffect(()=>loadLineLayer('roads',roads),[ready,roads,retries.roads]);
  useEffect(()=>loadLineLayer('provinces',provinces&&period==='severan'),[ready,provinces,period,retries.provinces]);
  function loadLineLayer(id:'roads'|'provinces',enabled:boolean){
    const instance=map.current;
    if(!ready||!instance)return;
    const controller=new AbortController();layerError(id);setPending(previous=>({...previous,[id]:false}));
    if(instance.getLayer(id)){instance.setLayoutProperty(id,'visibility',enabled?'visible':'none');return;}
    if(!enabled)return;
    setPending(previous=>({...previous,[id]:true}));
    (async()=>{
      try{
        const data=await loader.current!(id as DatasetId,controller.signal);
        if(controller.signal.aborted||map.current!==instance)return;
        if(!instance.getSource(id)){
          instance.addSource(id,{type:'geojson',data});
          instance.addLayer({id,type:'line',source:id,paint:{'line-color':id==='roads'?'#8c7150':'#743b3a','line-width':id==='roads'?1.1:.9,'line-opacity':.75,...(id==='provinces'?{'line-dasharray':[3,3]}:{})}});
        }
        setPending(previous=>({...previous,[id]:false}));
      }catch{
        if(!controller.signal.aborted){layerError(id,id==='roads'?'Дорожный слой не загрузился. Повторите загрузку.':'Границы провинций не загрузились. Повторите загрузку.');setPending(previous=>({...previous,[id]:false}));}
      }
    })();
    return()=>controller.abort();
  }

  useEffect(()=>{
    function escape(event:KeyboardEvent){
      if(event.key!=='Escape')return;
      if(query){setQuery('');searchInput.current?.focus();}
      else if(settings)closeLayers();
      else if(selected)closePlace();
    }
    function outside(event:PointerEvent){if(settings&&event.target instanceof Node&&!layerPanel.current?.contains(event.target)&&!layersToggle.current?.contains(event.target))closeLayers(false);}
    document.addEventListener('keydown',escape);document.addEventListener('pointerdown',outside);
    return()=>{document.removeEventListener('keydown',escape);document.removeEventListener('pointerdown',outside);};
  },[query,settings,selected,closePlace,closeLayers]);
  useEffect(()=>{if(settings)layerPanel.current?.querySelector<HTMLInputElement>('input')?.focus({preventScroll:true});},[settings]);

  // Eleven DOM labels need collision handling, not a new clustering dependency.
  // Recalculate only after camera movement, resizing or panel changes, never on every render frame.
  syncMarkers.current=()=>{
    const stage=container.current?.getBoundingClientRect();
    if(!stage)return;
    const blocked:DOMRect[]=[];
    if(selected&&placePanel.current)blocked.push(placePanel.current.getBoundingClientRect());
    if(settings&&layerPanel.current)blocked.push(layerPanel.current.getBoundingClientRect());
    container.current?.querySelectorAll<HTMLElement>('.maplibregl-ctrl').forEach(control=>blocked.push(control.getBoundingClientRect()));
    const candidates=markers.current.map(({marker,id})=>{
      const element=marker.getElement();
      const relevant=mode==='military'?militaryIds.includes(id):mode==='culture'?cultureIds.includes(id):true;
      element.hidden=!cities||!relevant;element.classList.remove('is-colliding');
      element.setAttribute('aria-pressed',String(selected?.id===id));
      return {id,element};
    }).filter(({element})=>!element.hidden).map(item=>({...item,rect:item.element.getBoundingClientRect()}));
    candidates.sort((a,b)=>Number(b.id===selected?.id)-Number(a.id===selected?.id));
    for(const {element,rect} of candidates){
      const clipped=rect.left<stage.left||rect.right>stage.right||rect.top<stage.top||rect.bottom>stage.bottom;
      const covered=blocked.some(other=>rect.left<other.right+3&&rect.right>other.left-3&&rect.top<other.bottom+3&&rect.bottom>other.top-3);
      element.classList.toggle('is-colliding',clipped||covered);
      if(!clipped&&!covered)blocked.push(rect);
    }
  };

  const changePeriod=(next:Period)=>{
    if(next===period)return;
    const instance=map.current;
    if(ready&&instance)for(const id of ['territory-fill'])instance.setLayoutProperty(id,'visibility','none');
    setLoadedPeriod('');setLoading(true);setPeriod(next);
  };
  const changeMode=(next:string)=>{setMode(next);setCities(true);setRoads(next==='infrastructure');closePlace(false);setSettings(false);};
  const retryFailed=()=>{
    if(error){setRetry(value=>value+1);return;}
    setRetries(previous=>({...previous,...Object.fromEntries(Object.keys(errors).map(id=>[id,previous[id as Layer]+1]))}));
  };
  const matches=query.trim()?places.filter(p=>[p.title,p.modernName,...p.aliases].join(' ').toLocaleLowerCase('ru').includes(query.trim().toLocaleLowerCase('ru'))):[];
  const visibleError=error||Object.values(errors)[0];
  const busy=!ready||loading||pending.roads||pending.provinces;
  const loadingText=!ready?'Загрузка карты…':loading?`Загрузка границ · ${periods.find(p=>p.id===period)?.year}`:pending.roads?'Загрузка дорог…':'Загрузка границ провинций…';

  return <div className={`atlas ${preview?'atlas-preview':''}`} data-ready={ready} data-period={loadedPeriod} data-roads={roads} data-borders={borders} data-mode={mode}>
    {!preview&&<div className="atlas-toolbar">
      <div className="atlas-search"><label className="sr-only" htmlFor="place-search">Найти место</label>
        <input ref={searchInput} id="place-search" value={query} onChange={event=>setQuery(event.target.value)} onKeyDown={event=>{if(event.key==='ArrowDown'){event.preventDefault();event.currentTarget.parentElement?.querySelector<HTMLButtonElement>('.place-results button')?.focus();}if(event.key==='Enter'&&matches[0]){setCities(true);setMode('political');choose(matches[0],event.currentTarget);}}} placeholder="Найти город · Roma, Рим…" autoComplete="off"/>
        {query&&<div className="place-results" role="group" aria-label="Найденные места">{matches.length?matches.map(place=><button key={place.id} onClick={event=>{setCities(true);setMode('political');choose(place,event.currentTarget);}}>{place.title}<small>{place.modernName}</small></button>):<p role="status">Место не найдено в текущем каталоге.</p>}</div>}
      </div>
      <div className="atlas-modes" role="group" aria-label="Режим карты">{[['political','Политика'],['infrastructure','Дороги'],['military','Военная история'],['culture','Культура']].map(([id,label])=><button key={id} aria-pressed={mode===id} onClick={event=>{event.currentTarget.focus({preventScroll:true});changeMode(id);}}>{label}</button>)}</div>
      <button ref={layersToggle} className="layers-toggle" aria-expanded={settings} aria-controls="atlas-layers" onClick={()=>{if(settings)closeLayers();else{closePlace(false);setSettings(true);}}}>Слои <span aria-hidden="true">≡</span></button>
    </div>}
    <div className="atlas-stage">
      <div ref={container} className="map-canvas" role="region" aria-label="Интерактивная карта Римского мира" aria-busy={busy&&!visibleError}/>
      {!preview&&<section hidden={!settings} ref={layerPanel} id="atlas-layers" className="layer-panel" aria-label="Слои карты">
        <div className="panel-heading"><span className="eyebrow">СЛОИ</span><button onClick={()=>closeLayers()} aria-label="Закрыть слои">×</button></div>
        <label><input type="checkbox" checked={borders} onChange={event=>setBorders(event.target.checked)}/>Территории</label>
        <label><input type="checkbox" checked={cities} onChange={event=>setCities(event.target.checked)}/>Города Pleiades</label>
        <label><input type="checkbox" checked={roads} onChange={event=>setRoads(event.target.checked)}/>Дороги AWMC</label>
        <label className={period!=='severan'?'layer-unavailable':''}><input type="checkbox" checked={provinces} disabled={period!=='severan'} aria-describedby="province-availability" onChange={event=>setProvinces(event.target.checked)}/>Границы провинций · 200</label>
        <p id="province-availability">{period!=='severan'?'Провинциальные линии доступны только для 200 года. ':'Провинции — линии без подписанных полигонов. '}Дороги имеют широкую датировку.</p>
      </section>}
      {!visibleError&&busy&&<div className="map-loading" role="status">{loadingText}</div>}
      {visibleError&&<div className="map-error" role="alert"><p>{visibleError}</p><button onClick={retryFailed}>Повторить</button><a href="/places/">Справочник мест →</a></div>}
      {selected&&<aside ref={placePanel} className="place-panel" aria-labelledby="selected-place-title">
        <div className="panel-heading"><span className="eyebrow">PLEIADES · МЕСТО</span><button onClick={()=>closePlace()} aria-label="Закрыть место">×</button></div>
        <div className="place-panel-content"><h2 ref={placeTitle} id="selected-place-title" tabIndex={-1}>{selected.title}</h2><span className="place-modern">{selected.modernName}</span>
          <p>{mode==='military'?militaryNotes[selected.id]||selected.summary:selected.summary}</p><p className="place-province">{selected.province}</p>
          <details><summary>Координаты и источники</summary><p>{selected.coordinateAccuracy}</p><a href={selected.url}>Запись Pleiades →</a></details>
          <a className="text-link" href={`/places/${selected.id}/`}>История места <span>→</span></a>
          {!preview&&selected.related.slice(0,2).map(link=><a className="place-related" key={link.url} href={link.url}>{link.title} →</a>)}
        </div>
      </aside>}
      <div className="map-sea-label" aria-hidden="true">MARE INTERNUM</div>
      <div className="map-legend" hidden={!borders||loadedPeriod!==period}><i/> Римские владения · реконструкция</div>
    </div>
    <div className="map-timeline"><span className="eyebrow">ВРЕМЯ</span><div role="group" aria-label="Исторический срез">{periods.map(item=><button key={item.id} aria-pressed={period===item.id} onClick={()=>changePeriod(item.id)}><strong>{item.year}</strong><small>{item.name}</small></button>)}</div>{preview&&<a className="atlas-expand" href="/atlas/">Открыть атлас →</a>}</div>
    <div className="map-attribution"><p>{mode==='military'?'События разных эпох. Показаны города, а не позиции войск.':mode==='culture'?'Города и археологические комплексы разных эпох.':roads?'Дорожная сеть разных периодов; не срез на выбранный год.':'Границы условны; современная береговая линия. Города — справочный слой разных эпох.'}</p><span><a href="/credits/">AWMC · ODbL</a> / <a href="https://pleiades.stoa.org/credits">Pleiades · CC BY</a> / Natural Earth</span></div>
    {!preview&&<div className="atlas-text-alternative"><a href="/places/">Все места в текстовом справочнике →</a><span>Можно исследовать без карты</span></div>}
  </div>;
}
