import Cache from './utils/cache';

const cache = new Cache({
  ttl: 15 * 60, // 15 min
  trim: 1 * 60, // 1 min
});

// Old namecheap check
async function checkNamecheapHtml(tld: string) {
  // Get namecheap data
  let ncData = cache.getOrDefault('namecheap', null);
  if (!ncData) {
    const res = await fetch(
      'https://www.namecheap.com/domains/handshake-domains/'
    );
    const html = await res.text();
    const regex = /gethandshakedomainspricing.{0,20}"body":(\[.+\])/;
    const m = html.match(regex);
    if (!m || !m[1]) return null;

    ncData = JSON.parse(m[1]);
    cache.set('namecheap', ncData);
  }

  // sanity check
  if (!ncData) return null;

  // Get TLD
  const tldData = ncData.filter((x: any) => x.Tld === tld)?.[0];
  return {
    listed: !!tldData,
    registerPrice: tldData?.RegularPrice?.Price.toFixed(2),
  };
}

async function checkNamecheap(tld: string) {
  const apiBase = process.env.NAMECHEAP_API_BASE;
  const apiKey = process.env.NAMECHEAP_API_KEY;
  const apiUser = process.env.NAMECHEAP_API_USER;
  if (!apiBase || !apiKey || !apiUser)
    throw new Error('No API base/key/user specified for Namecheap');

  let ncData = cache.getOrDefault('namecheap:' + tld, null);

  if (!ncData) {
    const res = await fetch(
      `${apiBase}/xml.response?ApiUser=${apiUser}&ApiKey=${apiKey}&UserName=${apiUser}&Command=namecheap.users.getPricing&ClientIp=192.168.1.1&ProductType=DOMAIN&ProductCategory=DOMAINS&ActionName=REGISTER&ProductName=${tld}`
    );

    const xml = await res.text();

    const regex = /<Price Duration="1" ?(.+) ?\/>/;
    const m = xml.match(regex);
    if (!m || !m[1]) return null;

    const parsed = m[1]
      .trim()
      .split(' ')
      .reduce((acc: any, pair: string) => {
        const [k, v] = pair.split('=');
        acc[k ?? ''] = v?.slice(1, -1);
        return acc;
      }, {});

    ncData = parsed;
    cache.set('namecheap:' + tld, ncData);
  }

  // sanity check
  if (!ncData) return null;

  return {
    listed: true,
    registerPrice: Number((ncData as any).Price).toFixed(2),
  };
}

async function checkEncirca(tld: string) {
  // Get encrica data
  let encircaData = cache.getOrDefault('encirca', null);
  if (!encircaData) {
    const res = await fetch(
      'https://esb.encirca.com/api/encirca/60808a9caaa6be5acac18ac8/fetchPricing',
      { method: 'POST' }
    );
    const data = await res.json();
    if (data.success !== true) return null;
    encircaData = data.results;
    cache.set('encirca', encircaData);
  }

  // sanity check
  if (!encircaData) return null;

  // Get TLD
  const tldData = (encircaData as any[]).filter(
    (x: any) => x.tlds?.[0]?.name === tld && x.type === 'Domain Order'
  )?.[0];
  return {
    listed: !!tldData,
    registerPrice: Number(tldData?.price_regular).toFixed(2),
  };
}

async function checkPorkbun(tld: string) {
  // Get porkbun data
  let porkbunData = cache.getOrDefault('porkbun', null);
  if (!porkbunData) {
    const res = await fetch('https://porkbun.com/api/json/v3/pricing/get');
    const data = await res.json();
    if (data.status !== 'SUCCESS') return null;
    porkbunData = data.pricing;
    cache.set('porkbun', porkbunData);
  }

  // sanity check
  if (!porkbunData) return null;

  // Get TLD
  const tldData = (porkbunData as any)[tld];
  return {
    listed: !!tldData,
    registerPrice: Number(tldData?.registration).toFixed(2),
  };
}

async function check101Domain(tld: string) {
  // Get 101Domain data
  let d101Data = cache.getOrDefault('101domain', null);
  if (!d101Data) {
    const res = await fetch('https://www.101domain.com/blockchain_domains.htm');
    const html = await res.text();
    const regex = /catExteArray\s*=\s*(\{(?:.|\n)+\})\s*<\/script>/;
    const m = html.match(regex);
    if (!m || !m[1]) return null;

    const cleaned = m[1]
      .replaceAll("'", '"')
      .replace(/\s/g, '')
      .replaceAll(',}', '}');
    d101Data = JSON.parse(cleaned)
      .handshake.extensions.split(',')
      .map((x: string) => x.slice(1));
    cache.set('101domain', d101Data);
  }

  // sanity check
  if (!d101Data) return null;

  // Get TLD
  const tldData = (d101Data as string[]).includes(tld);
  return {
    listed: !!tldData,
    registerPrice: null,
  };
}

async function checkNamebase(tld: string) {
  // unlikely to be premium
  const randomName = Math.random().toString(36).substring(2, 15);

  return fetch(
    `https://www.namebase.io/api/registrar/search?term=${randomName}.${tld}`
  )
    .then((res) => res.json())
    .then((data: any) => {
      if (!data?.results?.length) return null;
      const [first] = data.results;

      if (first.status === 'unsupported') {
        return {
          listed: false,
          registerPrice: null,
        };
      }

      return {
        listed: true,
        registerPrice: Number(first?.fees?.create).toFixed(2),
      };
    });
}

export async function checkRegistrars(tld: string) {
  const results = (
    await Promise.allSettled([
      checkNamecheap(tld),
      checkEncirca(tld),
      checkPorkbun(tld),
      check101Domain(tld),
      checkNamebase(tld),
    ])
  ).map((x) => (x.status === 'fulfilled' ? x.value : null));

  return [
    {
      name: 'Namecheap',
      tldUrl: `https://www.namecheap.com/domains/handshake-domains/`,
      ...results[0],
    },
    {
      name: 'Encirca',
      tldUrl: `https://www.encirca.com/handshake-${tld}/`,
      ...results[1],
    },
    {
      name: 'Porkbun',
      tldUrl: `https://porkbun.com/tld/${tld}`,
      ...results[2],
    },
    {
      name: '101Domain',
      tldUrl: `https://www.101domain.com/blockchain_domains.htm`,
      ...results[3],
    },
    {
      name: 'Namebase',
      tldUrl: `https://www.namebase.io/registrar/search/${tld}`,
      ...results[4],
    },
  ];
}
