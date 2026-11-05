// MOVA connector status endpoint. Safe-by-default: no credentials or fake device data.
// The upstream MOVAhome adapter is not deployed yet.
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  return res.status(200).json({
    connected: false,
    state: 'connector_not_configured',
    capabilities: [],
    errorCode: 'MOVA_BACKEND_NOT_CONFIGURED'
  });
}
