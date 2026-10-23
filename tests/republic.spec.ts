import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('Sulla study → biography → march → Nola → atlas → study',async({page})=>{
 test.setTimeout(70000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/articles/sulla-civil-war/');await page.locator('.prose a[href="/people/sulla/"]').first().click();
 await expect(page.getByRole('heading',{level:1})).toHaveText('Луций Корнелий Сулла');
 await page.locator('#events a[href="/events/sulla-march-88/"]').click();
 await page.locator('.related-section a[href="/places/nola/"]').click();
 const toc=page.locator('.toc-disclosure');if(!await toc.evaluate((el:HTMLDetailsElement)=>el.open))await toc.locator('summary').click();
 await page.locator('.toc a[href="/atlas/?place=nola"]').click();
 await expect(page.locator('.atlas')).toHaveAttribute('data-ready','true');await expect(page.locator('.place-panel h2')).toHaveText('Нола');
 await page.locator('.place-panel a[href="/articles/sulla-civil-war/"]').click();
 await expect(page.getByRole('heading',{level:1})).toHaveText('Сулла: война, проскрипции и республика');expect(errors).toEqual([]);
});

test('Gracchi study → Tiberius → reform → Gaius and evidence',async({page})=>{
 await page.goto('/articles/gracchi-land/');await page.locator('.prose a[href="/people/tiberius-gracchus/"]').click();
 await page.locator('#events a[href="/events/gracchus-law-133/"]').click();
 await page.locator('.related-section a[href="/people/gaius-gracchus/"]').click();
 await expect(page.getByRole('heading',{level:1})).toHaveText('Гай Семпроний Гракх');
 await page.locator('.bibliography a[href="/sources/plutarch-gaius-gracchus/"]').click();
 await expect(page.locator('.prose')).toContainText('700');
});

test('new studies and Latin aliases are available through historical search',async({page})=>{
 test.setTimeout(70000);
 for(const [query,type,path] of [['Marian reforms','Исследование','/articles/marius-army/'],['Fall of the Roman Republic','Исследование','/articles/fall-republic/'],['Tiberius Sempronius Gracchus','Личность','/people/tiberius-gracchus/'],['Gaius Iulius Caesar','Личность','/people/caesar/'],['Pharsalus','Место','/places/pharsalus/']] as const){
  await page.goto(`/search/?q=${encodeURIComponent(query)}`);await expect(page.locator('.search-status')).toContainText('Найдено:');
  await page.locator('#search-filters').getByRole('button',{name:type,exact:true}).click();
  const result=page.locator(`.search-results a[href="${path}"]`);await expect(result).toBeVisible();await result.click();await expect(page).toHaveURL(path);
 }
});

test('fall of the Republic → attributed coin → persistent saved study',async({page})=>{
 await page.goto('/articles/fall-republic/');await page.getByRole('button',{name:'В мою библиотеку'}).click();
 await page.locator('.prose a[href="/collection/met-248034/"]').click();await expect(page.locator('.facts')).toContainText('08.170.81');
 await page.getByRole('button',{name:'Увеличить изображение'}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'Закрыть ×',exact:true}).click();
 await page.goto('/library/');await expect(page.locator('#library-items')).toContainText('Почему пала Римская республика');await page.reload();
 await page.locator('#library-items a[href="/articles/fall-republic/"]').click();await expect(page.getByRole('heading',{level:1})).toHaveText('Почему пала Римская республика');
});

test('new reading pages and geographical uncertainty remain accessible',async({page})=>{
 for(const path of ['/articles/fall-republic/','/articles/marius-army/','/people/gaius-gracchus/','/places/gergovia/']){
  await page.goto(path);const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(result.violations,`${path}`).toEqual([]);
 }
 await expect(page.locator('main')).toContainText('вопрос');
});

for(const width of [320,375,390,430,768,1024,1440])test(`republic responsive reading at ${width}px`,async({page},info)=>{
 test.skip(info.project.name!=='chromium','Exact widths run once in Chromium');await page.setViewportSize({width,height:900});
 for(const path of ['/articles/gracchi-land/','/articles/marius-army/','/articles/sulla-civil-war/','/articles/caesar-gaul/','/articles/caesar-pompey/','/articles/fall-republic/','/people/tiberius-gracchus/','/people/caesar/','/places/gergovia/']){
  await page.goto(path);await page.evaluate(()=>document.fonts.ready);const metrics=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth,headings:[...document.querySelectorAll('h1,h2')].map(e=>({text:e.textContent,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right}))}));
  expect(metrics.scroll,`${path} overflow`).toBeLessThanOrEqual(width+1);for(const h of metrics.headings){expect(h.left,`${path} ${h.text}`).toBeGreaterThanOrEqual(-1);expect(h.right,`${path} ${h.text}`).toBeLessThanOrEqual(width+1);}
 }
});
