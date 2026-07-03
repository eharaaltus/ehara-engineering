const BASE="http://localhost:3000", key=process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const r=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${key}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:"ehara.altus@gmail.com",password:"EharaWMS@2026",returnSecureToken:true})}).then(r=>r.json());
if(!r.idToken){console.error("password login failed:",r.error?.message);process.exit(1);}
console.log("✓ password sign-in OK for ehara.altus@gmail.com");
const s=await fetch(`${BASE}/api/auth/session`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({idToken:r.idToken})});
const cookie=(s.headers.getSetCookie?.()??[]).map(c=>c.split(";")[0]).join("; ");
console.log("✓ session ->",s.status);
for(const p of ["/","/admin","/admin/employees","/weekly-goals/dashboard"]){const res=await fetch(`${BASE}${p}`,{headers:{Cookie:cookie},redirect:"manual"});console.log(`  ${p.padEnd(24)} -> ${res.status}`);}
process.exit(0);
