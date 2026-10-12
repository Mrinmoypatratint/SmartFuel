'use strict';
document.getElementById('loginForm').addEventListener('submit',async e=>{
 e.preventDefault();const b=document.getElementById('loginBtn'),err=document.getElementById('error');b.disabled=true;err.textContent='';
 try{const res=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:document.getElementById('email').value,password:document.getElementById('password').value})});const data=await res.json();if(!res.ok)throw Error(data.error||'Login unsuccessful');location.href='/';}
 catch(x){err.textContent=x.message;b.disabled=false;}
});
