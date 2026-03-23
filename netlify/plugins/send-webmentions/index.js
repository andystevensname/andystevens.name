export const onSuccess = async function () {
  const token = process.env.GO_JAMMING_TOKEN;
  if (!token) {
    console.log('GO_JAMMING_TOKEN not set, skipping webmention send');
    return;
  }

  const domain = 'andystevens.name';
  const url = `https://webmention.${domain}/webmention/${domain}/${token}`;

  try {
    const res = await fetch(url, { method: 'PUT' });
    if (res.ok) {
      console.log('Webmentions sent successfully');
    } else {
      console.warn(`Webmention send failed: ${res.status} ${res.statusText}`);
    }
  } catch (e) {
    console.warn('Webmention send error:', e.message);
  }
};
