import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const routes=['/','/articles/augustan-settlement/','/people/augustus/','/atlas/','/collection/','/collection/met-247008/','/search/?q=Август','/library/'];
for(const route of routes)test(`WCAG AA scan: ${route}`,async({page})=>{
  await page.goto(route);await page.evaluate(()=>document.fonts.ready);
  if(route==='/atlas/')await expect(page.locator('.atlas')).toHaveAttribute('data-period','trajan');
  if(route.startsWith('/search'))await expect(page.locator('.search-results a').first()).toBeVisible();
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  expect(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
});
test('WCAG AA scan: expanded mobile menu and museum viewer',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/');await page.getByRole('button',{name:'Меню'}).click();
  const menu=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(menu.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
  await page.goto('/collection/met-247008/');await page.getByRole('button',{name:'Увеличить изображение'}).click();
  const viewer=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(viewer.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
});
