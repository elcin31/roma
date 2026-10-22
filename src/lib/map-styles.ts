import stylesheetURL from 'maplibre-gl/dist/maplibre-gl.css?url';
let ready:Promise<void>|undefined;
/** Importing CSS normally makes Astro hoist it into the page, even for client:visible. */
export function loadMapStyles():Promise<void>{
  if(!ready)ready=new Promise<void>((resolve,reject)=>{
    const link=document.createElement('link');link.id='maplibre-styles';link.rel='stylesheet';link.href=stylesheetURL;
    link.addEventListener('load',()=>resolve(),{once:true});
    link.addEventListener('error',()=>{link.remove();reject(new Error('Map stylesheet unavailable'));},{once:true});
    document.head.append(link);
  }).catch(error=>{ready=undefined;throw error;});
  return ready;
}
