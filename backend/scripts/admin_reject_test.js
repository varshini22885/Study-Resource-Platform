(async()=>{
  const fetch = global.fetch.bind(global);
  const API_BASE = 'http://localhost:5000/api';

  async function login(email,password){
    const res = await fetch(`${API_BASE}/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
    const body = await res.json().catch(()=>null);
    const cookie = res.headers.get('set-cookie')||'';
    return {status:res.status,ok:res.ok,body,cookie};
  }

  async function createLink(cookie,title){
    const res = await fetch(`${API_BASE}/resources/upload`,{method:'POST',headers:{'Content-Type':'application/json', Cookie: cookie},body:JSON.stringify({title,description:'smoke',subject:'Other',type:'link',url:'https://example.com'})});
    const body = await res.json().catch(()=>null);
    return {status:res.status,ok:res.ok,body};
  }

  async function rejectResource(cookie,id,reason){
    const res = await fetch(`${API_BASE}/resources/${id}/reject`,{method:'PUT',headers:{'Content-Type':'application/json', Cookie: cookie},body:JSON.stringify({reason})});
    const body = await res.json().catch(()=>null);
    return {status:res.status,ok:res.ok,body};
  }

  try{
    const adminEmail='smoke-admin@example.com', adminPass='AdminPass123!';
    const userEmail='smoke-user@example.com', userPass='UserPass123!';

    const loginUser = await login(userEmail,userPass);
    console.log('user login ok',loginUser.ok,'role',loginUser.body?.user?.role);
    const unique = Date.now().toString().slice(-6);
    const create = await createLink(loginUser.cookie, 'SmokeRejectTest '+unique);
    console.log('created resource status',create.status, create.body && create.body.resource && create.body.resource._id);
    const resourceId = create.body?.resource?._id;
    if (!resourceId) return console.log('create failed, aborting');

    const loginAdmin = await login(adminEmail,adminPass);
    console.log('admin login ok',loginAdmin.ok,'role',loginAdmin.body?.user?.role);

    const rej = await rejectResource(loginAdmin.cookie, resourceId, 'Testing reject via script');
    console.log('reject result',rej.status, rej.body);
  }catch(e){
    console.error('error',e);
  }
  process.exit(0);
})();
