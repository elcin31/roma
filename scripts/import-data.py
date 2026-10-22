"""Refresh pinned public datasets. No runtime museum API or tile-server requests.
Run from repository root: python scripts/import-data.py
Raw responses cached in ignored research/; attribution manifests are versioned.
"""
import json, urllib.request, hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
CACHE=ROOT/'research';CACHE.mkdir(exist_ok=True)
OUT=ROOT/'public/geo';OUT.mkdir(exist_ok=True)
SHA='7ecf8bccea2efe1e1e9df2daf6001942de73fb87'
manifest=[]
def retrieve(key,url):
 p=CACHE/(key+'.txt')
 if not p.exists():p.write_bytes(urllib.request.urlopen(url,timeout=60).read())
 return p.read_bytes()
def rounded(x):
 if isinstance(x,float):return round(x,5)
 if isinstance(x,list):return [rounded(v) for v in x]
 if isinstance(x,dict):return {k:rounded(v) for k,v in x.items()}
 return x
for name,file,path in [
 ('republic','roman_empire_bce_60','political_shading/roman_empire_bce_60'),
 ('trajan','roman_empire_ce_117_extent','political_shading/roman_empire_ce_117_extent'),
 ('severan','roman_empire_ce_200_extent','political_shading/roman_empire_ce_200_extent'),
 ('provinces','roman_empire_ce_200_provinces','political_shading/roman_empire_ce_200_provinces'),
 ('roads','roads','roads')]:
 url=f'https://raw.githubusercontent.com/AWMC/geodata/{SHA}/Cultural-Data/{path}/{file}.geojson'
 raw=retrieve('awmc-'+file+'.geojson',url);data=json.loads(raw)
 for f in data['features']:
  props=f['properties']; f['id']=props['OBJECTID'];f['properties']={k:v for k,v in props.items() if k in ['OBJECTID','Source','Name','timeperiod','timeperi_1','Known_or_a']}
 data['attribution']='Ancient World Mapping Center; Barrington Atlas; OpenStreetMap contributors. ODbL 1.0.'
 data['license']='https://opendatacommons.org/licenses/odbl/1-0/'
 (OUT/f'{name}.geojson').write_text(json.dumps(rounded(data),ensure_ascii=False,separators=(',',':')))
 manifest.append({'id':name,'url':url,'version':SHA,'retrieved':'2026-10-22','sha256':hashlib.sha256(raw).hexdigest(),'license':'ODbL-1.0','file':f'/geo/{name}.geojson','modifications':'Preserved geometry; rounded to 5 decimal places; retained source and temporal fields, removed unused GIS fields. Entire derivative available at file URL.'})
url='https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson'
raw=retrieve('ne',url);data=json.loads(raw)
(OUT/'land.geojson').write_text(json.dumps(rounded(data),separators=(',',':')))
manifest.append({'id':'land','url':url,'version':'110m snapshot, 2026-10-22','retrieved':'2026-10-22','sha256':hashlib.sha256(raw).hexdigest(),'license':'Public domain','file':'/geo/land.geojson','modifications':'Coordinate precision reduced to 5 decimals. Modern coastline, not reconstructed ancient coastline.'})
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
(OUT/'LICENSE-ODbL.txt').write_bytes(retrieve('awmc-license',f'https://raw.githubusercontent.com/AWMC/geodata/{SHA}/LICENSE.txt'))
ids=[247993,248132,247117,256570,249180,250945,247008,247011]
metadata=[]
for id in ids:
 url=f'https://collectionapi.metmuseum.org/public/collection/v1/objects/{id}'
 a=json.loads(retrieve('met-'+str(id),url))
 assert a['isPublicDomain'] and a['primaryImage']
 metadata.append({**a,'apiURL':url,'retrieved':'2026-10-22','imageLicense':'CC0 1.0'})
(ROOT/'src/data/museum-records.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2))
print('Imported',len(manifest),'datasets and',len(metadata),'museum records')
