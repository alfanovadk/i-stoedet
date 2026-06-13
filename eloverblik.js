// eloverblik.js — Eloverblik CustomerApi-klient. CORS-verificeret (origin *), ingen proxy.
const BASE = 'https://api.eloverblik.dk/customerapi/api';

async function call(url, opts){
  const r = await fetch(url, opts);
  if(!r.ok) throw new Error('eloverblik:'+r.status);
  return r.json();
}

// Veksl langlivet refresh-token til 24t data-access-token.
export async function getAccessToken(refreshToken){
  const j = await call(`${BASE}/token`, { headers:{ Authorization:`Bearer ${refreshToken}` } });
  if(!j || !j.result) throw new Error('eloverblik:token');
  return j.result;
}

export async function getMeteringPoints(accessToken){
  const j = await call(`${BASE}/meteringpoints/meteringpoints`, { headers:{ Authorization:`Bearer ${accessToken}` } });
  const list = (j && j.result) || [];
  return list.map(m => ({
    id: m.meteringPointId,
    label: [m.streetName, m.buildingNumber, m.cityName].filter(Boolean).join(' ') || m.meteringPointId
  }));
}

export async function getTimeSeries(accessToken, mpId, fromISO, toISO){
  return call(`${BASE}/meterdata/gettimeseries/${fromISO}/${toISO}/Hour`, {
    method:'POST',
    headers:{ Authorization:`Bearer ${accessToken}`, 'Content-Type':'application/json' },
    body: JSON.stringify({ meteringPoints:{ meteringPoint:[mpId] } })
  });
}

// Map CIM-dokument → { dayKey: number[24] } (kWh pr. time, index = position-1).
export function parseTimeSeries(json){
  const out = {};
  try {
    const docs = (json && json.result) || [];
    for(const d of docs){
      const series = (d.MyEnergyData_MarketDocument && d.MyEnergyData_MarketDocument.TimeSeries) || [];
      for(const ts of series){
        for(const per of (ts.Period || [])){
          const start = new Date(per.timeInterval.start);
          // Day-window starts previous evening (22:00Z/23:00Z) = local midnight.
          // VERIFICÉR mod rigtigt kald (Task 6): dayKey-udledning + tidszone.
          const local = new Date(start.getTime() + 2*3600*1000); // nudge into local day
          const y=local.getUTCFullYear(), m=local.getUTCMonth()+1, day=local.getUTCDate();
          const dayKey = `${y}-${m}-${day}`;
          const arr = out[dayKey] || Array(24).fill(0);
          for(const p of (per.Point || [])){
            const idx = (+p.position) - 1;
            if(idx>=0 && idx<24) arr[idx] = +p['out_Quantity.quantity'] || 0;
          }
          out[dayKey] = arr;
        }
      }
    }
  } catch(e){ return out; }
  return out;
}
