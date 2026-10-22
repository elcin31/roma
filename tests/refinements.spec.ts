import {test,expect} from '@playwright/test';

async function waitForMap(page:import('@playwright/test').Page){await expect(page.locator('.atlas')).toHaveAttribute('data-period','trajan');}

test('contents collapse on phones and follow the section being read',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/articles/augustan-settlement/');
  const disclosure=page.locator('.toc-disclosure');await expect(disclosure).not.toHaveAttribute('open');
  await disclosure.locator('summary').click();const link=disclosure.getByRole('link',{name:'Армия, деньги и память о войне'});await link.click();
  await expect(disclosure).not.toHaveAttribute('open');const target=page.getByRole('heading',{name:'Армия, деньги и память о войне',exact:true});await expect(target).toBeFocused();
  await expect.poll(async()=>target.evaluate(e=>Math.abs(e.getBoundingClientRect().top))).toBeLessThan(50);
  await expect(disclosure.getByRole('link',{name:'Армия, деньги и память о войне',includeHidden:true})).toHaveAttribute('aria-current','location');
  await page.setViewportSize({width:1440,height:1000});await expect(disclosure).toHaveAttribute('open');await expect(disclosure.getByRole('link',{name:'Портрет как продолжение политики'})).toBeVisible();
  await page.getByRole('heading',{name:'Что означает «начало империи»',exact:true}).evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));
  await expect(disclosure.getByRole('link',{name:'Что означает «начало империи»'})).toHaveAttribute('aria-current','location');
  const top=await page.locator('.toc').evaluate(e=>e.getBoundingClientRect().top);expect(top).toBeGreaterThanOrEqual(0);expect(top).toBeLessThan(60);
});

test('atlas reuses parsed snapshots instead of requesting them repeatedly',async({page})=>{
  const requests:string[]=[];page.on('request',request=>{if(/\/geo\/(trajan|republic)\.geojson/.test(request.url()))requests.push(request.url());});
  await page.goto('/atlas/');await waitForMap(page);
  for(const [name,id] of [['60 до н. э.','republic'],['117 н. э.','trajan'],['60 до н. э.','republic'],['117 н. э.','trajan']]){
    await page.getByRole('button',{name:new RegExp(`^${name}`)}).click();await expect(page.locator('.atlas')).toHaveAttribute('data-period',id);
  }
  expect(requests.filter(url=>url.includes('trajan'))).toHaveLength(1);expect(requests.filter(url=>url.includes('republic'))).toHaveLength(1);
});

test('slow obsolete snapshot cannot overwrite a more recent selection',async({page})=>{
  let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
  await page.route('**/geo/republic.geojson',async route=>{await gate;await route.continue().catch(()=>{});});
  await page.goto('/atlas/');await waitForMap(page);
  await page.getByRole('button',{name:/^60 до н. э./}).click();await expect(page.locator('.atlas')).toHaveAttribute('data-period','');await expect(page.locator('.map-loading')).toContainText('60 до н. э.');
  await page.getByRole('button',{name:/^200 н. э./}).click();await expect(page.locator('.atlas')).toHaveAttribute('data-period','severan');release();
  await expect(page.getByRole('button',{name:/^200 н. э./})).toHaveAttribute('aria-pressed','true');await page.waitForTimeout(300);await expect(page.locator('.atlas')).toHaveAttribute('data-period','severan');await expect(page.locator('.map-error')).toHaveCount(0);
});

test('failed basemap has a usable fallback and retry',async({page})=>{
  await page.route('**/geo/land.geojson',route=>route.abort());await page.goto('/atlas/');
  await expect(page.locator('.map-error')).toContainText('Подложка карты не загрузилась');await expect(page.locator('.map-loading')).toHaveCount(0);
  await expect(page.locator('.map-error').getByRole('link',{name:'Справочник мест'})).toHaveAttribute('href','/places/');
  await page.unroute('**/geo/land.geojson');await page.locator('.map-error').getByRole('button',{name:'Повторить'}).click();await waitForMap(page);await expect(page.locator('.map-canvas canvas')).toHaveCount(1);
});

test('retrying a historical layer retains canvas and zoom',async({page})=>{
  const requests:string[]=[];page.on('request',request=>{if(request.url().includes('/geo/'))requests.push(request.url());});
  await page.route('**/geo/trajan.geojson',route=>route.abort());await page.goto('/atlas/');await expect(page.locator('.map-error')).toContainText('Исторический слой');
  const canvas=await page.locator('.map-canvas canvas').elementHandle();await page.getByRole('button',{name:'Увеличить масштаб',exact:true}).click();await page.waitForTimeout(400);const scale=await page.locator('.maplibregl-ctrl-scale').textContent();
  await page.unroute('**/geo/trajan.geojson');await page.locator('.map-error button').click();await waitForMap(page);
  expect(await canvas!.evaluate(element=>element.isConnected)).toBe(true);await expect(page.locator('.maplibregl-ctrl-scale')).toHaveText(scale!);expect(requests.filter(url=>url.endsWith('land.geojson'))).toHaveLength(1);
});

test('place and layer panels restore focus, exclude each other and clear stale URLs',async({page})=>{
  await page.goto('/atlas/');await waitForMap(page);const search=page.getByRole('textbox',{name:'Найти место'});await search.fill('Roma');await search.press('ArrowDown');await expect(page.locator('.place-results button').first()).toBeFocused();await page.keyboard.press('Enter');
  await expect(page.locator('.place-panel h2')).toBeFocused();await page.keyboard.press('Escape');await expect(page.locator('.place-panel')).toHaveCount(0);await expect(search).toBeFocused();await expect(page).not.toHaveURL(/place=/);
  const marker=page.getByRole('button',{name:'Открыть Рим',exact:true});await marker.click();await expect(page.locator('.place-panel h2')).toBeFocused();await page.keyboard.press('Escape');await expect(marker).toBeFocused();
  await marker.click();await page.getByRole('button',{name:'Слои',exact:false}).click();await expect(page.locator('.place-panel')).toHaveCount(0);await expect(page.getByRole('checkbox',{name:'Территории',exact:true})).toBeFocused();await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Слои',exact:false})).toBeFocused();
  await search.fill('Roma');await page.locator('.place-results button').click();await page.getByRole('button',{name:'Культура',exact:true}).click();await expect(page).not.toHaveURL(/place=/);await expect(page.locator('.place-panel')).toHaveCount(0);
  await expect(page.getByRole('link',{name:'Все места в текстовом справочнике'})).toHaveAttribute('href','/places/');
});

test('roads download survives a period switch and provinces are only available in 200',async({page})=>{
  let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});let roadRequests=0;
  await page.route('**/geo/roads.geojson',async route=>{roadRequests++;await gate;await route.continue();});
  await page.goto('/atlas/');await waitForMap(page);await page.getByRole('button',{name:'Слои',exact:false}).click();await expect(page.getByRole('checkbox',{name:'Границы провинций'})).toBeDisabled();await expect(page.locator('#province-availability')).toContainText('только для 200');
  await page.getByRole('checkbox',{name:'Дороги AWMC'}).check();await page.getByRole('button',{name:'Закрыть слои'}).click();await page.getByRole('button',{name:/^60 до н. э./}).click();await expect(page.locator('.atlas')).toHaveAttribute('data-period','republic');
  const before=await page.locator('.map-canvas canvas').screenshot();release();await expect(page.locator('.map-loading')).toHaveCount(0);await page.waitForTimeout(350);const after=await page.locator('.map-canvas canvas').screenshot();expect(Buffer.compare(before,after)).not.toBe(0);expect(roadRequests).toBe(1);
  await page.getByRole('button',{name:/^200 н. э./}).click();await expect(page.locator('.atlas')).toHaveAttribute('data-period','severan');await page.getByRole('button',{name:'Слои',exact:false}).click();await expect(page.getByRole('checkbox',{name:'Границы провинций'})).toBeEnabled();await page.getByRole('checkbox',{name:'Границы провинций'}).check();await page.getByRole('button',{name:'Закрыть слои'}).click();await expect(page.locator('.map-error')).toHaveCount(0);
});

test('atlas panels and canvas adapt to phone rotation',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/atlas/?place=roma');await waitForMap(page);
  for(const viewport of [{width:844,height:390},{width:320,height:700},{width:430,height:932}]){
    await page.setViewportSize(viewport);await expect.poll(()=>page.locator('.map-canvas canvas').evaluate(canvas=>Math.abs(canvas.getBoundingClientRect().width-canvas.parentElement!.getBoundingClientRect().width))).toBeLessThan(1);
    const bounds=await page.locator('.place-panel').evaluate(panel=>{const p=panel.getBoundingClientRect(),s=panel.closest('.atlas-stage')!.getBoundingClientRect();return {left:p.left-s.left,right:s.right-p.right,top:p.top-s.top,bottom:s.bottom-p.bottom};});
    for(const gap of Object.values(bounds))expect(gap).toBeGreaterThanOrEqual(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
  }
  await page.getByRole('button',{name:'Закрыть место'}).click();await expect(page.locator('.place-panel')).toHaveCount(0);
});

test('museum zoom pans the full image and always restores focus and scrolling',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/collection/met-247008/');await page.getByRole('button',{name:'Увеличить изображение'}).click();
  const dialog=page.getByRole('dialog');await expect(dialog.getByRole('button',{name:'Закрыть'})).toBeFocused();await dialog.getByRole('button',{name:'Увеличить до исходного размера'}).click();await expect(dialog).toHaveClass(/is-enlarged/);
  const viewport=dialog.locator('.image-dialog-viewport');expect(await viewport.evaluate(e=>e.scrollWidth>e.clientWidth)).toBe(true);await viewport.evaluate(e=>{e.scrollLeft=150;});expect(await viewport.evaluate(e=>e.scrollLeft)).toBeGreaterThan(0);
  await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await expect(page.locator('#zoom-image')).toBeFocused();expect(await page.evaluate(()=>document.documentElement.style.overflow)).toBe('');
});

test('clearing search removes the stale query and corrupted bookmarks can be replaced',async({page})=>{
  await page.goto('/search/?q=Roma');await expect(page.locator('.search-results')).toContainText('Рим');await page.getByRole('searchbox').fill('');await expect(page.locator('.search-status')).toContainText('Введите');await expect(page).not.toHaveURL(/q=/);
  await page.evaluate(()=>localStorage.setItem('roma-library-v1','{invalid'));await page.goto('/library/');await expect(page.locator('#library-empty')).toBeVisible();await expect(page.locator('#library-status')).not.toContainText('недоступно');
  await page.goto('/articles/founding/');await page.getByRole('button',{name:'В мою библиотеку'}).click();await page.goto('/library/');await expect(page.locator('#library-items')).toContainText('Основание Рима');
});

test('mobile menu closes when clicking content and after a breakpoint change',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/');const menu=page.locator('.menu-toggle');await menu.click();await expect(menu).toHaveAttribute('aria-expanded','true');await page.locator('h1').click();await expect(menu).toHaveAttribute('aria-expanded','false');
  await menu.click();await page.setViewportSize({width:1024,height:900});await expect(menu).toBeHidden();await expect(menu).toHaveAttribute('aria-expanded','false');await page.setViewportSize({width:390,height:844});await expect(menu).toBeVisible();await expect(menu).toHaveAttribute('aria-expanded','false');
});

test('deferred map stylesheet fails safely and can be retried',async({page})=>{
  const style=/\/_astro\/maplibre-gl\.[^/]+\.css/;
  await page.route(style,route=>route.abort());await page.goto('/atlas/');
  await expect(page.locator('.map-error')).toContainText('Карта не загрузилась');await expect(page.locator('.map-error a')).toHaveAttribute('href','/places/');
  await page.unroute(style);await page.locator('.map-error button').click();await waitForMap(page);await expect(page.locator('#maplibre-styles')).toHaveCount(1);
});

test('home defers the map engine and its stylesheet until the atlas enters view',async({page})=>{
  await page.goto('/');await page.evaluate(()=>document.fonts.ready);await expect(page.locator('#maplibre-styles')).toHaveCount(0);
  await page.locator('.atlas').scrollIntoViewIfNeeded();await waitForMap(page);await expect(page.locator('#maplibre-styles')).toHaveCount(1);await expect(page.locator('.map-canvas canvas')).toHaveCount(1);
});

test('museum viewer cannot lose an early click while scripts are loading',async({page})=>{
  let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
  await page.route(/\/_astro\/Bookmark\.[^/]+\.js/,async route=>{await gate;await route.continue();});
  await page.setViewportSize({width:390,height:844});await page.goto('/collection/met-247008/',{waitUntil:'commit'});
  const zoom=page.getByRole('button',{name:'Увеличить изображение'});
  await expect(zoom).toBeVisible();await expect(zoom).toBeDisabled();await expect(zoom).toHaveAttribute('aria-busy','true');await expect(page.locator('[data-bookmark]')).toBeDisabled();await expect(page.locator('.menu-toggle')).toBeDisabled();
  release();await expect(zoom).toBeEnabled();await page.locator('[data-bookmark]').click();await expect(page.locator('[data-bookmark]')).toHaveAttribute('aria-pressed','true');await page.locator('.menu-toggle').click();await expect(page.locator('.menu-toggle')).toHaveAttribute('aria-expanded','true');await page.keyboard.press('Escape');await zoom.click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(zoom).toBeFocused();
});
