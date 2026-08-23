import fetch from 'node-fetch';

async function run(){
  const res = await fetch('http://localhost:5001/api/auth/login', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({email:'admin@test.com', password:'123456'})
  });
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Body:', text);
}

run().catch(err=>{console.error(err); process.exit(1)});
