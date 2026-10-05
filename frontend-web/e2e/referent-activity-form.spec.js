import { test, expect } from '@playwright/test'
import { Buffer } from 'node:buffer'
const token = `header.${Buffer.from(JSON.stringify({ exp: 4102444800 })).toString('base64')}.signature`
const profile = { id: 3, role: 'REFERENT', actif: true, prenom: 'Anne', nom: 'Martin', email: 'ref@example.org' }
const group = { id: 5, nom: 'Sport', referentId: 3, actif: true, statut: 'VALIDE' }
const activity = { id: 42, titre: 'Créée par ADMIN', description: 'Description', lieu: 'Bruxelles', dateDebut: '2099-01-15T10:00:00', dateFin: '2099-01-15T12:00:00', capaciteMax: 10, gratuite: true, prix: null, statut: 'BROUILLON', visibilite: 'PUBLIC', groupeId: 5, groupeNom: 'Sport', referentAssigneId: 3, nombreInscrits: 2 }
// All API responses in this suite are mocked; this does not validate a live backend.
async function setup(page, { groups = [group], activities = [], forbidden = false } = {}) {
 const writes=[]
 await page.addInitScript(({token,profile})=>{
  localStorage.setItem('bxconnect_lang','fr');localStorage.setItem('token',token);localStorage.setItem('user',JSON.stringify(profile))
 },{token,profile})
 await page.route(url=>url.pathname.startsWith('/api/'), async route=>{
  const req=route.request(), url=new URL(req.url()), path=url.pathname
  if(['POST','PUT','PATCH'].includes(req.method()) && path.startsWith('/api/activites')) {
   writes.push({method:req.method(),body:req.postDataJSON(),params:Object.fromEntries(url.searchParams)})
   if(forbidden) return route.fulfill({status:403,json:{}})
   const updated={...activity,...req.postDataJSON(),...Object.fromEntries(url.searchParams)}
   activities=[updated]
   return route.fulfill({json:updated})
  }
  if(path==='/api/users/me') return route.fulfill({json:profile})
  if(path==='/api/referent/groupes') return route.fulfill({json:groups})
  if(path==='/api/referent/mes-activites') return route.fulfill({json:activities})
  if(path==='/api/activites/42') return route.fulfill({json:activities[0] || activity})
  if(path==='/api/activites/42/presences') return route.fulfill({json:[]})
  return route.fulfill({json:[]})
 })
 await page.goto('/referent/activites')
 await expect(page.getByRole('heading',{name:'Mes activités assignées'})).toBeVisible()
 await expect(page.getByRole('button',{name:'Nouvelle activité',exact:true})).toBeEnabled()
 return writes
}
async function create(page) {
 await page.getByRole('button',{name:'Nouvelle activité',exact:true}).click()
 return page.getByRole('form')
}
async function fill(form) {
  await form.locator('input[type="date"]').first().fill('2099-01-15')
 await form.getByRole('textbox',{name:'Titre *',exact:true}).fill('Atelier référent')
 await form.getByRole('textbox',{name:'Description *',exact:true}).fill('Description')
 await form.getByRole('textbox',{name:'Lieu *',exact:true}).fill('Bruxelles')
 await form.locator('input[type="time"]').nth(0).fill('10:00')
 await form.locator('input[type="time"]').nth(1).fill('12:00')
}
for (const width of [1440,390]) for(const visibility of ['PUBLIC','PRIVE_GROUPE']) {
 test(`creation and publication ${visibility} at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900})
  const writes=await setup(page)
  const form=await create(page)
  await expect(form.getByRole('combobox',{name:'Groupe',exact:true})).toHaveValue('5')
  await expect(form.getByRole('combobox',{name:'Groupe',exact:true})).toBeDisabled()
  await expect(form.getByRole('combobox')).toHaveCount(2)
  await expect(form.getByText('Activité générale',{exact:true})).toHaveCount(0)
  await expect(form.getByLabel(/référent|prix/i)).toHaveCount(0)
  await expect(form.getByRole('combobox',{name:'Qui peut participer ?'}).locator('option')).toHaveText(['Tout le monde','Membres du groupe'])
  await fill(form)
  await form.getByRole('combobox',{name:'Qui peut participer ?'}).selectOption(visibility)
  await page.evaluate(()=>window.scrollTo(0,0))
  await page.screenshot({path:test.info().outputPath('form.png'),fullPage:true})
  await form.getByRole('button',{name:'Enregistrer le brouillon'}).click()
  await expect(form).toHaveCount(0)
  expect(writes[0].body).toMatchObject({nature:'GROUPE',groupeId:5,visibilite:visibility,gratuite:true,prix:null})
  expect(writes[0].body).not.toHaveProperty('referentAssigneId')
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('heading',{name:'Atelier référent',exact:true}).scrollIntoViewIfNeeded()
  await page.screenshot({path:test.info().outputPath('list.png')})
  await page.getByRole('button',{name:'Publier',exact:true}).click()
  const dialog=page.getByRole('dialog')
  await expect(dialog.getByRole('radio')).toHaveCount(0)
  await expect(dialog.getByText(visibility==='PUBLIC'?'Cette activité du groupe Sport sera visible par tout le monde.':'Cette activité sera réservée aux membres acceptés du groupe Sport.')).toBeVisible()
  await page.screenshot({path:test.info().outputPath('publication.png')})
  await dialog.getByRole('button',{name:'Publier',exact:true}).click()
  await expect(dialog).toHaveCount(0)
  expect(writes[1].params).toEqual({statut:'PUBLIEE',visibilite:visibility})
  const link=page.getByRole('link',{name:'Présences',exact:true})
  await expect(link).toHaveAttribute('href','/referent/activites/42/presences')
  await link.click();await expect(page).toHaveURL(/\/referent\/activites\/42\/presences$/)
 })
}
test('multiple own groups only; selection required',async({page})=>{
 const writes=await setup(page,{groups:[group,{...group,id:6,nom:'Culture'},{...group,id:7,nom:'Autre',referentId:9},{...group,id:8,nom:'Inactif',actif:false}]})
 const form=await create(page), select=form.getByRole('combobox',{name:'Groupe',exact:true})
 await expect(select.locator('option')).toHaveText(['Choisir un groupe','Sport','Culture'])
 await fill(form);await form.getByRole('button',{name:'Enregistrer le brouillon'}).click()
 await expect(form.getByRole('alert')).toContainText('Choisissez un groupe')
 expect(writes).toHaveLength(0)
 await select.selectOption('6');await form.getByRole('button',{name:'Enregistrer le brouillon'}).click()
 await expect(form).toHaveCount(0);expect(writes[0].body.groupeId).toBe(6)
})
test('no eligible group blocks creation',async({page})=>{
 await setup(page,{groups:[]});const form=await create(page)
 await expect(form.getByRole('alert')).toContainText('Aucun groupe validé')
 await expect(form.getByRole('button',{name:'Enregistrer le brouillon'})).toBeDisabled()
})
for(const statut of ['BROUILLON','PUBLIEE']) test(`assigned ADMIN activity editable with frozen group: ${statut}`,async({page})=>{
 const writes=await setup(page,{activities:[{...activity,statut}]})
 await expect(page.getByRole('heading',{name:'Créée par ADMIN'})).toBeVisible()
 await expect(page.getByText('Groupe: Sport')).toBeVisible()
 await page.getByRole('button',{name:'Modifier',exact:true}).click()
 const form=page.getByRole('form')
 await expect(form.getByRole('combobox',{name:'Groupe',exact:true})).toBeDisabled()
 if(statut==='PUBLIEE') await expect(form.getByRole('combobox',{name:'Qui peut participer ?'})).toBeDisabled()
 else await form.getByRole('combobox',{name:'Qui peut participer ?'}).selectOption('PRIVE_GROUPE')
 await form.getByRole('button',{name:'Enregistrer les modifications'}).click()
 await expect(form).toHaveCount(0)
 for(const key of ['groupeId','referentAssigneId','nature']) expect(writes[0].body).not.toHaveProperty(key)
 if(statut==='PUBLIEE') expect(writes[0].body).not.toHaveProperty('visibilite')
 else expect(writes[0].body.visibilite).toBe('PRIVE_GROUPE')
})
test('incoherent assignment has no management or attendance actions',async({page})=>{
 await setup(page,{activities:[{...activity,referentAssigneId:9}]})
 await expect(page.getByText(/Vous ne pouvez plus gérer/)).toBeVisible()
 await expect(page.getByRole('button',{name:'Modifier',exact:true})).toHaveCount(0)
 await expect(page.getByRole('button',{name:'Publier',exact:true})).toHaveCount(0)
 await expect(page.getByRole('link',{name:'Présences',exact:true})).toHaveCount(0)
})
test('historical audience and price preserved without creation option',async({page})=>{
 const writes=await setup(page,{activities:[{...activity,groupeId:null,referentAssigneId:null,groupeNom:null,visibilite:'MEMBRES',gratuite:false,prix:15}]})
 await expect(page.getByText('Visibilité: Utilisateurs connectés')).toBeVisible()
 await page.getByRole('button',{name:'Modifier',exact:true}).click()
 const form=page.getByRole('form');await expect(form.getByRole('combobox')).toHaveCount(0)
 await form.getByRole('button',{name:'Enregistrer les modifications'}).click();await expect(form).toHaveCount(0)
 expect(writes[0].body).toMatchObject({gratuite:false,prix:15})
 expect(writes[0].body).not.toHaveProperty('visibilite')
})
test('backend rejects reassignment race with understandable error',async({page})=>{
 const writes=await setup(page,{activities:[activity],forbidden:true})
 await page.getByRole('button',{name:'Modifier',exact:true}).click()
 await page.getByRole('button',{name:'Enregistrer les modifications'}).click()
 await expect(page.getByText(/Vérifiez votre affectation/)).toBeVisible()
 expect(writes).toHaveLength(1)
 await expect(page.getByRole('form')).toBeVisible()
})
