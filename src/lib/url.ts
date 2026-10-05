// Base-aware internal URLs. Every internal link and fetch goes through href().

const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

export function href(path: string): string {
  if (EXTERNAL.test(path)) return path;
  const base = import.meta.env.BASE_URL.replace(/\/+$/, '');
  const rest = path.replace(/^\/+/, '');
  return rest ? `${base}/${rest}` : `${base}/`;
}
