export const isTokenValid = (token: string): boolean => {
  if (!token) return false;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    
    // Check if token is expired (with 5 minute buffer)
    return payload.exp > (now + 300);
  } catch {
    return false;
  }
};

export const getTokenPayload = (token: string): any => {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
};

export const getTokenExpiration = (token: string): Date | null => {
  const payload = getTokenPayload(token);
  if (!payload?.exp) return null;
  
  return new Date(payload.exp * 1000);
};