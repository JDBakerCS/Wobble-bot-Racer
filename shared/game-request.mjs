export const REQUEST_TIMEOUT=8000;

// A stalled poll must release the client's polling lock so the next poll can
// recover. Keep timeouts as unknown outcomes: an input may already be saved.
export async function requestGame(body){
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),REQUEST_TIMEOUT);
 try{
  const res=await fetch('/api/game',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal});
  const data=await res.json();
  if(!res.ok)throw Object.assign(Error(data.error||'Race server unavailable.'),{rejected:true});
  return data;
 }catch(error){
  if(controller.signal.aborted)throw Error('Connection timed out. Reconnecting to the race…');
  throw error;
 }finally{clearTimeout(timeout);}
}
