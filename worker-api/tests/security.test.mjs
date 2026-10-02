import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/index.js';
test('anonymous privileged routes perform no reads or provider work', async () => {
 let calls=0;
 const env={STATE_DB:{prepare(){calls++;throw Error('sensitive state');}}};
 for(const [path,method,body] of [['/api/customer/acme','GET'],['/api/preview','POST',{company:'Acme',services:['Worker']}],['/api/provision','POST',{company:'Acme',services:['Worker']}]]) {
  const response=await app.fetch(new Request('https://platform.test'+path,{method,...(body?{body:JSON.stringify(body),headers:{'content-type':'application/json'}}:{})}),env);
  assert.ok([401,403,503].includes(response.status));
 }
 assert.equal(calls,0);
});
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
const token='synthetic-operator-token-for-local-tests';
function local(){const sql=new DatabaseSync(':memory:');for(const file of ['001_state.sql','002_resource_metadata.sql','003_deployment_targets.sql'])sql.exec(readFileSync(new URL('../migrations/'+file,import.meta.url),'utf8'));let reads=0;const prepare=(statement,args=[])=>({sql:statement,args,bind(...a){return prepare(statement,a)},async first(){reads++;return sql.prepare(statement).get(...args)||null},async all(){reads++;return{results:sql.prepare(statement).all(...args)}},async run(){reads++;return{meta:{changes:Number(sql.prepare(statement).run(...args).changes)}}}});return{sql,get reads(){return reads},db:{prepare,async batch(statements){sql.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());sql.exec('COMMIT');return results}catch(e){sql.exec('ROLLBACK');throw e}}}};}
const req=(path,body,headers={})=>new Request('https://platform.test'+path,{method:body===undefined?'GET':'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json',...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});
test('wrong credentials, customer credentials, aliases and missing config cause no privileged effects',async t=>{
 let effects=0;t.mock.method(globalThis,'fetch',()=>{effects++;throw Error('forbidden')});const env={OPS_API_TOKEN:token,STATE_DB:{prepare(){effects++;throw Error('forbidden')}}};
 for(const path of ['/api/provision','/api/provision/','/api/preview','/api/customer/acme','/api/workers','/api/workers/test/source','/api/targets','/api/tenant-enrollment','/provision','/api/PROVISION'])for(const headers of [{authorization:'Bearer wrong'},{authorization:'Bearer customer'},{authorization:'',cookie:'bhc_session=fixture'},{authorization:''}]){
  const r=await app.fetch(req(path,{},headers),env);assert.ok([401,403].includes(r.status));const b=await r.json();assert.ok(!JSON.stringify(b).includes('stack'));
 }
 assert.equal((await app.fetch(req('/api/customer/acme'),{STATE_DB:env.STATE_DB})).status,503);assert.equal(effects,0);
});
test('strict bounded privileged schemas and unsupported execution fail before provider work',async t=>{
 let effects=0;t.mock.method(globalThis,'fetch',()=>{effects++;throw Error('forbidden')});const env={OPS_API_TOKEN:token,STATE_DB:{prepare(){effects++;throw Error('forbidden')}}};
 for(const body of [{company:'Acme',services:['Worker'],account_id:'stolen'},{company:'Acme',services:['Unknown']},{company:'Acme',services:['Worker'],organizationId:crypto.randomUUID()},{company:'../',services:['R2']},{company:'Acme',services:['Worker'],ready:true}])assert.equal((await app.fetch(req('/api/preview',body),env)).status,400);
 assert.equal((await app.fetch(req('/api/preview',{company:'x'.repeat(9000),services:['R2']}),env)).status,413);
 assert.equal((await app.fetch(new Request('https://platform.test/api/preview',{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:'{'}),env)).status,400);
 assert.equal((await app.fetch(req('/api/preview?account_id=stolen',{company:'Acme',services:['Worker']}),env)).status,400);
 for(const gate of [undefined,'true'])assert.equal((await app.fetch(req('/api/provision',{company:'Acme',services:['Worker']}),{...env,LEGACY_PROVISION_EXECUTION:gate})).status,503);
 assert.equal((await app.fetch(req('/api/tenant-enrollment',{organizationId:crypto.randomUUID()}),env)).status,501);assert.equal(effects,0);
});
test('operator legacy visibility remains read-only, without implicit adoption or manifests',async()=>{
 const localdb=local();try{localdb.sql.exec("INSERT INTO customers VALUES('acme','Same Name','example.com','fixture'); INSERT INTO resources(customer_id,resource_type,resource_id,resource_name,created_at,metadata) VALUES('acme','Worker','old','old','fixture','{\"token\":\"private-marker\"}')");
 const res=await app.fetch(req('/api/customer/acme'),{OPS_API_TOKEN:token,STATE_DB:localdb.db});const body=await res.json();assert.equal(body.legacy,true);assert.equal(body.ownershipVerified,false);assert.ok(!JSON.stringify(body).includes('private-marker'));assert.equal(localdb.sql.prepare('SELECT count(*) n FROM resource_ownership').get().n,0);
 }finally{localdb.sql.close();}
});
test('targets persist unverified/inactive; scoped service cannot select another target or operator routes',async()=>{
 const l=local();try{const env={OPS_API_TOKEN:token,STATE_DB:l.db,PLATFORM_ACCOUNT_REFERENCES:JSON.stringify({future:{credentialRef:'FUTURE_CF_TOKEN',environment:'production'}})};
 const res=await app.fetch(req('/api/targets',{accountRef:'future',credentialRef:'FUTURE_CF_TOKEN',environment:'production',purpose:'customer_production',productId:'fixture-product'}),env);assert.equal(res.status,201);const target=await res.json();assert.equal(target.active,false);assert.equal(target.verification,'unverified');assert.equal(target.credentialRef,undefined);
 assert.equal((await app.fetch(req('/api/targets',{accountRef:'future',credentialRef:'FUTURE_CF_TOKEN',environment:'production',purpose:'shared_product',productId:'fixture-product',active:true}),env)).status,400);
 env.SERVICE_FIXTURE='synthetic-scoped-service-token-32-characters';env.PLATFORM_SERVICE_CREDENTIALS=JSON.stringify({bhc:{secretRef:'SERVICE_FIXTURE',targetIds:[target.id],productIds:['fixture-product'],environment:'production',operations:['target.inspect']}});
 env.PLATFORM_TARGET_SCOPES=JSON.stringify({[target.id]:{productId:'fixture-product',environment:'production'}});
 const headers={authorization:'Bearer '+env.SERVICE_FIXTURE,'x-platform-service':'bhc'};
 const before=l.reads;assert.equal((await app.fetch(req('/api/targets/'+crypto.randomUUID(),undefined,headers),env)).status,403);assert.equal(l.reads,before);
 for(const path of ['/api/workers','/api/customer/acme','/api/provision'])assert.equal((await app.fetch(req(path,path.endsWith('provision')?{}:undefined,headers),env)).status,403);
 const own=await app.fetch(req('/api/targets/'+target.id,undefined,headers),env);assert.equal(own.status,200);assert.equal((await own.json()).available,false);
 assert.equal(l.sql.prepare('SELECT count(*) n FROM platform_audit').get().n,1);
 }finally{l.sql.close();}
});
