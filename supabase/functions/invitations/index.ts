// Supabase Edge Function: invitations
// Deploy with JWT verification enabled; validates admin bearer JWT separately.
// Required secrets: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const url = Deno.env.get('SUPABASE_URL')!;
const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ADMIN_UID = '7b5df442-b39c-41ae-b637-4907250797e8';
const admin = createClient(url, service, {auth:{persistSession:false}});
const headers = {'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'https://welcometoevent.com','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'};
const response=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
async function digest(token:string) {const data=new TextEncoder().encode(token);return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data))).map(b=>b.toString(16).padStart(2,'0')).join('')}
function randomToken(){const bytes=crypto.getRandomValues(new Uint8Array(32));return Array.from(bytes).map(b=>b.toString(16).padStart(2,'0')).join('')}
async function isAdmin(req:Request){const bearer=req.headers.get('authorization')||'';if(!bearer.startsWith('Bearer '))return false;const client=createClient(url,anon,{auth:{persistSession:false}});const {data,error}=await client.auth.getUser(bearer.slice(7));return !error&&data.user?.id===ADMIN_UID}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{headers});
 if(req.method!=='POST')return response({error:'Method not allowed'},405);
 try{
 const input=await req.json();
 const action=String(input.action||'');
 if(action.startsWith('admin.')){
  if(!await isAdmin(req))return response({error:'Unauthorized'},401);
  if(action==='admin.list'){
   const eventId=String(input.event_id||'');
   const {data,error}=await admin.from('invitations').select('id,household_name,email,phone,max_guests,sent_at,created_at,event_rsvps(guest_name,attending,guest_count,updated_at)').eq('event_id',eventId).order('created_at',{ascending:false}).limit(1000);
   if(error)throw error;return response({invitations:data});
  }
  if(action==='admin.create'){
   const eventId=String(input.event_id||'');
   const name=String(input.household_name||'').trim();
   const email=input.email?String(input.email).trim():null;
   const phone=input.phone?String(input.phone).trim():null;
   const max=Number(input.max_guests||10);
   if(!/^[0-9a-f-]{36}$/i.test(eventId)||name.length<1||name.length>120||!Number.isInteger(max)||max<1||max>30)return response({error:'Invalid invitation details'},400);
   const token=randomToken();
   const {data,error}=await admin.from('invitations').insert({event_id:eventId,household_name:name,email,phone,max_guests:max,token_hash:await digest(token)}).select('id').single();
   if(error)throw error;
   // Raw token is shown only once to organizer. Never log it or store it in the DB.
   return response({id:data.id,invitation_url:'https://welcometoevent.com/sabriyapasni/?invite='+token});
  }
  return response({error:'Unknown admin action'},400);
 }
 const token=String(input.token||'');
 if(!/^[a-f0-9]{64}$/.test(token))return response({error:'Invalid invitation link'},403);
 const hash=await digest(token);
 const {data:inv,error:invErr}=await admin.from('invitations').select('id,event_id,household_name,max_guests,events(title,event_date,venue,access_mode)').eq('token_hash',hash).maybeSingle();
 if(invErr)throw invErr;
 if(!inv)return response({error:'Invitation not found'},403);
 if(action==='guest.view'){
  const {data:rsvp,error}=await admin.from('event_rsvps').select('guest_name,attending,guest_count').eq('invitation_id',inv.id).maybeSingle();
  if(error)throw error;return response({household_name:inv.household_name,max_guests:inv.max_guests,event:inv.events,rsvp});
 }
 if(action==='guest.rsvp'){
  const name=String(input.guest_name||'').trim().replace(/\s+/g,' ');
  const attending=input.attending;
  const count=Number(input.guest_count);
  if(name.length<1||name.length>120||typeof attending!=='boolean'||!Number.isInteger(count)||count<0||count>inv.max_guests||(attending&&count<1)||(!attending&&count!==0))return response({error:'Please check your RSVP details'},400);
  const {error}=await admin.from('event_rsvps').upsert({event_id:inv.event_id,invitation_id:inv.id,guest_name:name,attending,guest_count:count,updated_at:new Date().toISOString()},{onConflict:'invitation_id'});
  if(error)throw error;return response({ok:true});
 }
 return response({error:'Unknown action'},400);
 }catch(err){console.error('Invitation request failed',err instanceof Error?err.message:'unknown');return response({error:'Unable to process request'},500)}
});
