import webpush from 'web-push';

const { publicKey, privateKey } = webpush.generateVAPIDKeys();

console.log('Generated VAPID keypair.\n');
console.log('Local — add to .env:');
console.log(`VAPID_PUBLIC_KEY=${publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${privateKey}`);
console.log('VAPID_SUBJECT=mailto:your-email@example.com');
console.log('\nProduction — add the same three as Forgejo Actions secrets on');
console.log('andy/andystevens.name. The build step reads VAPID_PUBLIC_KEY; the');
console.log('"Send push notifications" step reads all three.');
console.log('\nThe public key name matters. Preferences.astro reads');
console.log('import.meta.env.VAPID_PUBLIC_KEY, exposed by the VAPID_PUBLIC_');
console.log('entry in astro.config.mjs envPrefix. A key stored as');
console.log('PUBLIC_VAPID_KEY is read by nothing and silently disables push.');
console.log('\nVAPID_PRIVATE_KEY stays server-side; it is never inlined into the');
console.log('client bundle (envPrefix deliberately allows only VAPID_PUBLIC_).');
