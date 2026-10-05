import test from 'node:test'
import assert from 'node:assert/strict'
import { activityToForm } from '../admin/activityForm.js'
import { ownActivityGroups, newReferentActivity, canManageAssignedActivity, validateReferentActivity, referentActivityPayload } from './referentActivityForm.js'
const profile = { id: 3, role: 'REFERENT', actif: true }
const group = { id: 5, referentId: 3, actif: true, statut: 'VALIDE' }
const valid = { ...newReferentActivity([group]), titre: 'Atelier', description: 'Description', lieu: 'Bruxelles', dateDebut: '2099-01-01T10:00', dateFin: '2099-01-01T12:00' }
const assigned = { ...valid, groupeId: 5, referentAssigneId: 3, statut: 'BROUILLON' }
test('only own active approved groups', () => {
 assert.deepEqual(ownActivityGroups([group,{...group,id:6,referentId:4},{...group,actif:false},{...group,statut:'EN_ATTENTE'}],profile),[group])
 assert.deepEqual(ownActivityGroups([group],{...profile,actif:false}),[])
})
test('one group is prefilled; several require explicit selection', () => {
 assert.equal(newReferentActivity([group]).groupeId,5)
 assert.equal(newReferentActivity([group,{...group,id:6}]).groupeId,'')
 assert.equal(newReferentActivity([]).nature,'GROUPE')
})
for (const visibilite of ['PUBLIC','PRIVE_GROUPE']) test(`valid free group payload ${visibilite}`, () => {
 const form={...valid,visibilite}
 assert.deepEqual(validateReferentActivity(form,[group],profile),[])
 const payload=referentActivityPayload(form)
 assert.equal(payload.groupeId,5);assert.equal(payload.nature,'GROUPE');assert.equal(payload.visibilite,visibilite)
 assert.equal(payload.gratuite,true);assert.equal(payload.prix,null);assert.equal('referentAssigneId' in payload,false)
})
for (const [patch,error] of [[{nature:'GENERALE'},'referent'],[{groupeId:6},'groupeId'],[{visibilite:'MEMBRES'},'visibilite'],[{titre:' '},'titre'],[{description:''},'description'],[{lieu:''},'lieu'],[{dateFin:'2099-01-01T10:00'},'dateOrder'],[{capaciteMax:0},'capaciteMax']]) test(`invalid form ${JSON.stringify(patch)}`,()=>assert.ok(validateReferentActivity({...valid,...patch},[group],profile).includes(error)))
test('assignment, not creator, grants management',()=>{
 assert.equal(canManageAssignedActivity({...assigned,createurId:99},[group],profile),true)
 assert.equal(canManageAssignedActivity({...assigned,referentAssigneId:4},[group],profile),false)
 assert.equal(canManageAssignedActivity(assigned,[{...group,referentId:4}],profile),false)
})
test('referent cannot move even a draft to another own group',()=>assert.ok(validateReferentActivity({...valid,groupeId:6},[group,{...group,id:6}],profile,assigned).includes('referent')))
test('draft edit preserves assignment and may change audience',()=>{
 const payload=referentActivityPayload({...valid,visibilite:'PRIVE_GROUPE'},assigned)
 assert.equal(payload.visibilite,'PRIVE_GROUPE')
 for(const key of ['nature','groupeId','referentAssigneId']) assert.equal(key in payload,false)
})
test('published edit omits frozen audience and group',()=>{
 const payload=referentActivityPayload(valid,{...assigned,statut:'PUBLIEE'})
 for(const key of ['nature','groupeId','referentAssigneId','visibilite']) assert.equal(key in payload,false)
})
test('historical paid connected-only activity is preserved',()=>{
 const original={...assigned,groupeId:null,referentAssigneId:null,gratuite:false,prix:12,visibilite:'MEMBRES'}
 const form=activityToForm(original)
 assert.deepEqual(validateReferentActivity(form,[],profile,original),[])
 const payload=referentActivityPayload(form,original)
 assert.equal(payload.gratuite,false);assert.equal(payload.prix,12)
 for(const key of ['nature','groupeId','referentAssigneId','visibilite']) assert.equal(key in payload,false)
})
