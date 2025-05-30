// TODO:
// Clean all this up,
// class-ify each registrar
// with a common interface,
//

import Cache from '../../utils/cache';

const cache = new Cache({
  ttl: 15 * 60, // 15 min
  trim: 1 * 60, // 1 min
})

// Old namecheap check
async function checkNamecheapHtml(tld) {
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
  const tldData = ncData.filter(x => x.Tld === tld)?.[0];
  // {
  //   Tld: 'cabins',
  //   Register: { Price: 50, PricingHint: '', PricingMode: 0, RegularPrice: 50 },
  //   Renew: { Price: 40, PricingHint: '', PricingMode: 0, RegularPrice: 40 }
  // }
  return {
    listed: !!tldData,
    registerPrice: tldData?.RegularPrice?.Price.toFixed(2),
  }
}

async function checkNamecheap(tld) {
  const apiBase = process.env.NAMECHEAP_API_BASE;
  const apiKey = process.env.NAMECHEAP_API_KEY;
  const apiUser = process.env.NAMECHEAP_API_USER;
  if (!apiBase || !apiKey || !apiUser) throw new Error('No API base/key/user specified for Namecheap');

  let ncData = cache.getOrDefault('namecheap:' + tld, null);

  if (!ncData) {
    const res = await fetch(
      `${apiBase}/xml.response?ApiUser=${apiUser}&ApiKey=${apiKey}&UserName=${apiUser}&Command=namecheap.users.getPricing&ClientIp=192.168.1.1&ProductType=DOMAIN&ProductCategory=DOMAINS&ActionName=REGISTER&ProductName=${tld}`
    );

    const xml = await res.text();

    const regex = /<Price Duration="1" ?(.+) ?\/>/;
    const m = xml.match(regex);
    if (!m || !m[1]) return null;

    // m[1]:
    // DurationType="YEAR" Price="20.00" PricingType="MULTIPLE" RegularPrice="20.00" RegularPriceType="MULTIPLE" YourPrice="20.00" YourPriceType="MULTIPLE" PromotionPrice="0.0" Currency="USD"
    // console.log({ match: m[1] });

    // { "DurationType": "YEAR", "Price": "20.00", "PricingType": "MULTIPLE", "RegularPrice": "20.00", "RegularPriceType": "MULTIPLE", "YourPrice": "20.00", "YourPriceType": "MULTIPLE", "PromotionPrice": "0.0", "Currency": "USD" }
    const parsed = m[1].trim().split(" ").reduce((acc, pair) => {
      const [k, v] = pair.split("=");
      acc[k] = v.slice(1, -1);
      return acc;
    }, {});

    ncData = parsed;
    cache.set('namecheap:' + tld, ncData);
  }

  // sanity check
  if (!ncData) return null;

  return {
    listed: true,
    registerPrice: Number(ncData.Price).toFixed(2),
  }
}

async function checkEncirca(tld) {
  // Get encrica data
  let encircaData = cache.getOrDefault('encirca', null);
  if (!encircaData) {
    const res = await fetch(
      'https://esb.encirca.com/api/encirca/60808a9caaa6be5acac18ac8/fetchPricing',
      { 'method': 'POST' }
    );
    const data = await res.json();
    if (data.success !== true) return null;
    encircaData = data.results;
    cache.set('encirca', encircaData);
  }

  // sanity check
  if (!encircaData) return null;

  // Get TLD
  const tldData = encircaData.filter(x => x.tlds?.[0]?.name === tld && x.type === 'Domain Order')?.[0];
  // {
  //   "_id": "5ee3dce1cc09a824d2437a1e",
  //   "price_regular": "20",
  //   "type": "Domain Renewal",
  //   "tlds": [
  //       {
  //           "name": "txt"
  //       }
  //   ],
  //   "price_sale": 10
  // }
  return {
    listed: !!tldData,
    registerPrice: Number(tldData?.price_regular).toFixed(2),
  }
}

async function checkPorkbun(tld) {
  // Get porkbun data
  let porkbunData = cache.getOrDefault('porkbun', null);
  if (!porkbunData) {
    const res = await fetch(
      'https://porkbun.com/api/json/v3/pricing/get'
    );
    const data = await res.json();
    if (data.status !== 'SUCCESS') return null;
    porkbunData = data.pricing;
    cache.set('porkbun', porkbunData);
  }

  // sanity check
  if (!porkbunData) return null;

  // Get TLD
  const tldData = porkbunData[tld];
  // "xp":{"registration":"11.64","renewal":"11.64","transfer":"11.64","coupons":[]
  return {
    listed: !!tldData,
    registerPrice: Number(tldData?.registration).toFixed(2),
  }
}

async function check101Domain(tld) {
  // Get 101Domain data
  let d101Data = cache.getOrDefault('101domain', null);
  if (!d101Data) {
    const res = await fetch(
      'https://www.101domain.com/blockchain_domains.htm'
    );
    const html = await res.text();
    const regex = /catExteArray\s*=\s*(\{(?:.|\n)+\})\s*<\/script>/;
    const m = html.match(regex);
    if (!m || !m[1]) return null;

    const cleaned = m[1].replaceAll('\'', '"').replace(/\s/g, '').replaceAll(',}', '}');
    d101Data = JSON.parse(cleaned).handshake.extensions.split(',').map(x => x.slice(1));
    cache.set('101domain', d101Data);
  }

  // sanity check
  if (!d101Data) return null;

  // Get TLD
  const tldData = d101Data.includes(tld);
  // 'tld'
  return {
    listed: !!tldData,
    registerPrice: null,
  }
}



async function checkNamebase(tld) {
  // unlikely to be premium
  const randomName = Math.random().toString(36).substring(2, 15);

  return fetch(`https://www.namebase.io/api/registrar/search?term=${randomName}.${tld}`)
    .then((res) => res.json())
    .then((data) => {
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

export default async (req, res) => {
  const tld = req.query.tld?.toLowerCase();
  if (!tld || tld.length > 100) {
    return res.status(400).json({ error: 'Invalid TLD' });
  }

  const results = (await Promise.allSettled([
    checkNamecheap(tld),
    checkEncirca(tld),
    checkPorkbun(tld),
    check101Domain(tld),
    checkNamebase(tld),
  ])).map(x => x.status === 'fulfilled' ? x.value : null);

  return res.json([
    { name: 'Namecheap', tldUrl: `https://www.namecheap.com/domains/handshake-domains/`, ...results[0] },
    { name: 'Encirca', tldUrl: `https://www.encirca.com/handshake-${tld}/`, ...results[1] },
    { name: 'Porkbun', tldUrl: `https://porkbun.com/tld/${tld}`, ...results[2] },
    { name: '101Domain', tldUrl: `https://www.101domain.com/blockchain_domains.htm`, ...results[3] },
    { name: 'Namebase', tldUrl: `https://www.namebase.io/registrar/search/${tld}`, ...results[4] },
  ]);
};
