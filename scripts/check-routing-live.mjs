// Optional manual smoke test. Never included in npm test or the deployment workflow.
import { createRoutingClient } from '../src/lib/routing.ts';
import { writeFile } from 'node:fs/promises';

const requests = [];
const client = createRoutingClient({ fetcher: async (url, init) => {
  const response = await fetch(url, { ...init, headers: { ...init.headers, Origin: 'http://localhost:5173', 'User-Agent': 'VisorGIS/0.4 manual-integration-check' } });
  requests.push({ service: new URL(url).origin, status: response.status, cors: response.headers.get('access-control-allow-origin') });
  return response;
} });
const checks = [];
try {
  const points = await client.search('Oviedo, España');
  if (!points.length) throw new Error('Sin resultados');
  checks.push({ check: 'Photon búsqueda Oviedo', ok: true, count: points.length, first: points[0] });
} catch (error) { checks.push({ check: 'Photon búsqueda Oviedo', ok: false, error: error.message }); }
try {
  const route = await client.route({ label: 'Oviedo', coordinates: [-5.844, 43.362] }, { label: 'Gijón', coordinates: [-5.661, 43.535] });
  checks.push({ check: 'OSRM ruta Oviedo–Gijón', ok: true, metres: route.distance, seconds: route.duration, vertices: route.geometry.coordinates.length, steps: route.steps.length, accesses: route.waypoints.map(p => p.distance) });
} catch (error) { checks.push({ check: 'OSRM ruta Oviedo–Gijón', ok: false, error: error.message }); }
try {
  await client.route({ label: 'Océano', coordinates: [-30, 30] }, { label: 'Oviedo', coordinates: [-5.844, 43.362] });
  checks.push({ check: 'OSRM rechazo punto sin acceso', ok: false, error: 'El servicio aceptó un punto oceánico' });
} catch (error) { checks.push({ check: 'OSRM rechazo punto sin acceso', ok: /no tiene acceso|más de 1 km/.test(error.message), message: error.message }); }
const report = JSON.stringify({ date: new Date().toISOString(), checks, requests }, null, 2);
if (process.argv.includes('--write')) await writeFile(new URL('../docs/routing-check.json', import.meta.url), `${report}\n`);
console.log(report);
if (checks.some(check => !check.ok)) process.exitCode = 1;
