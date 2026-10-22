import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const study='Пунические войны: как Рим стал средиземноморской державой';
test('Punic study → Hannibal → Cannae → Carthage → atlas → museum → saved study',async({page})=>{
 test.setTimeout(70000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/articles/punic-wars/');await expect(page.getByRole('heading',{level:1})).toHaveText(study);
 await page.locator('.prose a[href="/people/hannibal/"]').click();await expect(page.getByRole('heading',{level:1})).toHaveText('Ганнибал Барка');
 await page.locator('#events a[href="/events/cannae-216/"]').click();await expect(page.getByRole('heading',{level:1})).toHaveText('Битва при Каннах');
 await page.locator('.related-section a[href="/places/carthage/"]').click();await expect(page.getByRole('heading',{level:1})).toHaveText('Карфаген');
 const toc=page.locator('.toc-disclosure');if(!await toc.evaluate((el:HTMLDetailsElement)=>el.open))await toc.locator('summary').click();
 await page.locator('.toc a[href="/atlas/?place=carthage"]').click();await expect(page.locator('.atlas')).toHaveAttribute('data-ready','true');await expect(page.locator('.place-panel h2')).toHaveText('Карфаген');
 await page.locator('.place-panel a[href="/articles/punic-wars/"]').click();await expect(page.getByRole('heading',{level:1})).toHaveText(study);
 await page.locator('.prose a[href="/collection/met-252883/"]').click();await expect(page.getByRole('heading',{level:1})).toHaveText('Светильник в форме головы слона');await expect(page.locator('.facts')).toContainText('26.212');
 await page.getByRole('button',{name:'Увеличить изображение'}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'Закрыть ×',exact:true}).click();await expect(page.locator('#zoom-image')).toBeFocused();
 await page.locator('.related-section a[href="/articles/punic-wars/"]').click();await page.getByRole('button',{name:'В мою библиотеку'}).click();await page.goto('/library/');await expect(page.locator('#library-items')).toContainText(study);await page.reload();await page.locator('#library-items a').click();await expect(page).toHaveURL(/articles\/punic-wars\/$/);expect(errors).toEqual([]);
});

test('new Russian and Latin aliases are searchable with entity filters',async({page})=>{
 for(const [query,type,title,path] of [
  ['Punic Wars','Исследование',study,'/articles/punic-wars/'],
  ['Hannibal Barca','Личность','Ганнибал Барка','/people/hannibal/'],
  ['Carthago Nova','Место','Новый Карфаген','/places/carthago-nova/'],
  ['Мамилия','Музейный предмет','Зубчатый денарий Мамилия Лиметана','/collection/met-248035/'],
  ['Каннах','Событие','Битва при Каннах','/events/cannae-216/']
 ]){
  await page.goto(`/search/?q=${encodeURIComponent(query)}`);await expect(page.locator('.search-status')).toContainText('Найдено:');await page.locator('#search-filters').getByRole('button',{name:type,exact:true}).click();
  const result=page.locator('.search-results a').filter({has:page.getByRole('heading',{name:title,exact:true})});await expect(result).toBeVisible();await result.click();await expect(page).toHaveURL(path);
 }
});

test('timeline combines epoch and theme filters and restores the URL state',async({page})=>{
 await page.goto('/timeline/');const all=Number(await page.locator('#visible-count').textContent());
 await page.getByRole('button',{name:'Римская республика',exact:true}).click();await page.getByLabel('Тема событий').selectOption('Войны');
 const visible=page.locator('[data-directory-entry]:visible');expect(await visible.count()).toBeLessThan(all);await expect(visible).toContainText(['Начало Первой Пунической войны']);
 await expect(page.locator('[data-directory-entry]').filter({hasText:'Цензура Катона Старшего'})).toBeHidden();await expect(page.locator('[data-directory-entry]').filter({hasText:'Битва при Каннах'})).toBeVisible();
 await expect(page).toHaveURL(/theme=republic.*topic=/);const count=await visible.count();await page.reload();await expect(page.getByLabel('Тема событий')).toHaveValue('Войны');await expect(visible).toHaveCount(count);
 const hrefs=await visible.locator('a').evaluateAll(links=>links.map(link=>link.getAttribute('href')));expect(hrefs.indexOf('/events/first-punic-264/')).toBeLessThan(hrefs.indexOf('/events/cannae-216/'));expect(hrefs.indexOf('/events/cannae-216/')).toBeLessThan(hrefs.indexOf('/events/zama-202/'));
 await page.getByLabel('Тема событий').selectOption('Культура и общество');await expect(visible).toHaveCount(0);await expect(page.locator('#visible-count')).toHaveText('0');
 await page.getByRole('button',{name:'Все',exact:true}).click();await expect(visible).not.toHaveCount(0);
});

test('new museum group filters real objects and keeps the checked image attribution',async({page})=>{
 await page.goto('/collection/');await page.getByRole('button',{name:'Республиканская монета',exact:true}).click();await expect(page.locator('[data-directory-entry]:visible')).toHaveCount(4);
 await page.locator('.entry[href="/collection/met-248034/"]').click();await expect(page.locator('.facts')).toContainText('08.170.81');await expect(page.locator('.prose')).toContainText('EID MAR');
 await page.getByRole('button',{name:'Увеличить изображение'}).click();const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();await expect.poll(()=>dialog.locator('img').evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBeGreaterThan(0);await expect(dialog.locator('a')).toHaveAttribute('href','https://www.metmuseum.org/art/collection/search/248034');await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();
});

test('new places use original map controls and keep dated boundaries',async({page})=>{
 await page.goto('/atlas/?place=cannae');await expect(page.locator('.atlas')).toHaveAttribute('data-ready','true');await expect(page.locator('.place-panel h2')).toHaveText('Канны');await expect(page.locator('.place-panel')).toContainText('поселения');await page.getByRole('button',{name:'Закрыть место'}).click();
 await page.getByRole('textbox',{name:'Найти место'}).fill('Qart Hadasht');await page.locator('.place-results button').click();await expect(page.locator('.place-panel h2')).toHaveText('Новый Карфаген');
 await page.getByRole('button',{name:'60 до н. э.'}).click();await expect(page.locator('.atlas')).toHaveAttribute('data-period','republic');await page.getByRole('button',{name:/200 н. э./}).click();await expect(page.locator('.atlas')).toHaveAttribute('data-period','severan');await expect(page.locator('.map-error')).toHaveCount(0);
});

test('expanded reading pages and filter controls retain accessible semantics',async({page})=>{
 for(const url of ['/articles/punic-wars/','/people/hannibal/','/timeline/','/collection/met-255259/']){
  await page.goto(url);await page.evaluate(()=>document.fonts.ready);const results=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(results.violations,`${url}: ${JSON.stringify(results.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})))}`).toEqual([]);
 }
});
