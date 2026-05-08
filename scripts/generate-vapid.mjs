import webpush from 'web-push';

const { publicKey, privateKey } = webpush.generateVAPIDKeys();

console.log('Generated VAPID keypair. Add these to .env (local) and Netlify env (prod):\n');
console.log(`PUBLIC_VAPID_KEY=${publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${privateKey}`);
console.log(`VAPID_SUBJECT=mailto:taylorstevens@gmail.com`);
console.log('\nPUBLIC_VAPID_KEY is exposed to the browser (safe — it is the public half).');
console.log('VAPID_PRIVATE_KEY must stay server-side only.');
