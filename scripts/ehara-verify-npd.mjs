const BASE="http://localhost:3000", key=process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const r=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${key}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:"ehara.altus@gmail.com",password:"EharaWMS@2026",returnSecureToken:true})}).then(r=>r.json());
const s=await fetch(`${BASE}/api/auth/session`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({idToken:r.idToken})});
const cookie=(s.headers.getSetCookie?.()??[]).map(c=>c.split(";")[0]).join("; ");
for(const p of ["/npd","/npd/new"]){const res=await fetch(`${BASE}${p}`,{headers:{Cookie:cookie}});const html=res.status===200?await res.text():"";const hits=["Air Filter Bracket","Grab Handel","New Product","NPD Products"].filter(w=>html.includes(w));console.log(`${p.padEnd(10)} -> ${res.status}  [${hits.join(", ")||"—"}]`);}
process.exit(0);
