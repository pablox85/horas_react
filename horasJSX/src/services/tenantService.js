const DEFAULT_TENANT_ID = 'default';

const sanitizeTenantId = (value) => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || DEFAULT_TENANT_ID;
};

export const getTenantId = () => {
  return sanitizeTenantId(import.meta.env.VITE_TENANT_ID || DEFAULT_TENANT_ID);
};
