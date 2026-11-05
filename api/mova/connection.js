// MOVA cloud adapter gateway: deliberately fails closed until an authenticated
// cloud adapter and per-user authorization are implemented and tested.
// Never accept or log MOVAhome credentials on these placeholder routes.
const noStore = res => {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
};
const deny = (res, code, status=503) => res.status(status).json({
  ok: false, connected: false, errorCode: code,
  error: 'MOVA cloud integration is not available yet'
});
export default function handler(req, res) {
  noStore(res);
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return deny(res, 'METHOD_NOT_ALLOWED', 405);
  }
  return deny(res, 'MOVA_BACKEND_NOT_CONFIGURED');
}
