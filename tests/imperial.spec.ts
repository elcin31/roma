import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('economy → attributed aureus → saved study survives reload',async({page})=>{
 await page.goto('/articles/imperial-economy/');await page.getByRole('button',{name:'В мою библиотеку'}).click();
 await page.locator('.related-section a[href="/collection/met-246880/"]').click();await expect(page.locator('.facts')).toContainText('99.35.177');
 await page.getByRole('button',{name:'Увеличить изображение'}).click();const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
 await expect.poll(()=>dialog.locator('img').evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBeGreaterThan(0);
 await expect(dialog.locator('a')).toHaveAttribute('href','https://www.metmuseum.org/art/collection/search/246880');
 await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await expect(page.locator('#zoom-image')).toBeFocused();
 await expect.poll(()=>page.evaluate(()=>document.documentElement.style.overflow)).toBe('');
 await page.locator('.related-section a[href="/articles/imperial-economy/"]').click();await page.goto('/library/');await page.reload();
 await page.locator('#library-items a[href="/articles/imperial-economy/"]').click();await expect(page.getByRole('heading',{level:1})).toHaveText('Экономика Римской империи');
});

test('slavery study → Antoninus Pius → dated legal evidence',async({page})=>{
 await page.goto('/articles/slavery-society/');await page.locator('.prose a[href="/people/antoninus-pius/"]').click();
 await expect(page.getByRole('heading',{level:1})).toHaveText('Антонин Пий');
 await page.locator('.bibliography a[href="/sources/institutes/"]').click();await expect(page.locator('.prose')).toContainText('I.8');
 await expect(page.locator('.prose')).toContainText('VI века');
});

test('third-century crisis → Aurelian → Palmyra → existing atlas → study',async({page})=>{
 test.setTimeout(70000);const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/articles/third-century-crisis/');await page.locator('.prose a[href="/people/aurelian/"]').click();
 await page.locator('#events a[href="/events/palmyra-taken-272/"]').click();await expect(page.getByRole('heading',{level:1})).toHaveText('Взятие Пальмиры Аврелианом');
 await page.locator('.related-section a[href="/places/palmyra/"]').click();
 const toc=page.locator('.toc-disclosure');if(!await toc.evaluate((el:HTMLDetailsElement)=>el.open))await toc.locator('summary').click();
 await page.locator('.toc a[href="/atlas/?place=palmyra"]').click();await expect(page.locator('.atlas')).toHaveAttribute('data-ready','true');
 await expect(page.locator('.place-panel h2')).toHaveText('Пальмира');await page.locator('.place-panel a[href="/articles/third-century-crisis/"]').click();
 await expect(page.getByRole('heading',{level:1})).toHaveText('Кризис III века');expect(errors).toEqual([]);
});

test('Trajan study → preserved biography → first Dacian war → actual coin',async({page})=>{
 await page.goto('/articles/trajan-empire/');await page.locator('.prose a[href="/people/trajan/"]').click();
 await expect(page.getByRole('heading',{level:1})).toHaveText('Траян');await page.locator('#events a[href="/events/dacia-first-101/"]').click();
 await expect(page.locator('.dates')).toHaveText('101 н. э. — 102 н. э.');await page.locator('.related-section a[href="/articles/trajan-empire/"]').click();
 await page.getByRole('link',{name:'сестерций с дакийским противником',exact:true}).click();await expect(page.locator('.facts')).toContainText('08.170.384');
 await expect(page.locator('.prose')).toContainText('фотография показывает лицевую сторону');
});

test('imperial aliases are searchable and society navigation exposes the new studies',async({page})=>{
 test.setTimeout(70000);
 for(const [query,type,path] of [['Roman economy','Исследование','/articles/imperial-economy/'],['Aurelianus','Личность','/people/aurelian/'],['Titus Aelius Hadrianus Antoninus Pius','Личность','/people/antoninus-pius/'],['Nicomedia','Место','/places/nicomedia/']] as const){
  await page.goto(`/search/?q=${encodeURIComponent(query)}`);await expect(page.locator('.search-status')).toContainText('Найдено:');
  await page.locator('#search-filters').getByRole('button',{name:type,exact:true}).click();const result=page.locator(`.search-results a[href="${path}"]`);
  await expect(result).toBeVisible();await result.click();await expect(page).toHaveURL(path);
 }
 await page.goto('/society/');for(const id of ['imperial-economy','slavery-society','roman-city-life','religion-christianity'])await expect(page.locator(`.entry[href="/articles/${id}/"]`)).toBeVisible();
});

test('new imperial readings and attributed objects retain accessible semantics',async({page})=>{
 for(const path of ['/articles/imperial-economy/','/articles/slavery-society/','/collection/met-253569/','/places/palmyra/']){
  await page.goto(path);const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(result.violations,path).toEqual([]);
 }
});

const newRoutes=[
 ...['imperial-economy','slavery-society','roman-city-life','religion-christianity','trajan-empire','third-century-crisis'].map(id=>`/articles/${id}/`),
 ...['antoninus-pius','commodus','septimius-severus','caracalla','aurelian','trajan'].map(id=>`/people/${id}/`),
 ...[248058,246880,248050,246882,254474,248891,256126,255973,248899,252884,254819,250939,249414,239584,245376,245787,248466,253569].map(id=>`/collection/met-${id}/`),
 '/places/nicomedia/','/places/palmyra/'
];
for(const width of [320,375,390,430,768,1024,1440])test(`imperial responsive reading at ${width}px`,async({page},info)=>{
 test.skip(info.project.name!=='chromium','Exact widths run once in Chromium');test.setTimeout(90000);await page.setViewportSize({width,height:900});
 for(const path of newRoutes){
  await page.goto(path);await page.evaluate(()=>document.fonts.ready);
  const metrics=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,headings:[...document.querySelectorAll('h1,h2')].map(e=>({text:e.textContent,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right}))}));
  expect(metrics.scroll,`${path} overflow`).toBeLessThanOrEqual(width+1);
  for(const h of metrics.headings){expect(h.left,`${path} ${h.text}`).toBeGreaterThanOrEqual(-1);expect(h.right,`${path} ${h.text}`).toBeLessThanOrEqual(width+1);}
 }
});
