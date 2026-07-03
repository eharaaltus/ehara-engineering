const BASE="http://localhost:3000", key=process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const r=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${key}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:"ehara.altus@gmail.com",password:"EharaWMS@2026",returnSecureToken:true})}).then(r=>r.json());
const s=await fetch(`${BASE}/api/auth/session`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({idToken:r.idToken})});
const cookie=(s.headers.getSetCookie?.()??[]).map(c=>c.split(";")[0]).join("; ");
for(const p of ["/tasks","/"]){const html=await fetch(`${BASE}${p}`,{headers:{Cookie:cookie}}).then(r=>r.text());
  const hits=["M&M","Grab","Quality","seat belt","PPSO"].filter(w=>html.includes(w));
  console.log(`${p.padEnd(8)} -> ${html.length} bytes · real-data markers: [${hits.join(", ")||"none visible in SSR"}]`);}
process.exit(0);
