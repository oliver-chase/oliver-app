import type { Configuration } from '@azure/msal-browser'

export function getMsalConfig(): Configuration {
  return {
    auth: {
      clientId: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID ?? '',
      authority: `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_AZURE_TENANT_ID ?? 'common'}`,
      redirectUri: typeof window !== 'undefined' ? window.location.origin + '/' : '/',
      postLogoutRedirectUri: typeof window !== 'undefined' ? window.location.origin + '/login/' : '/login/',
    },
    cache: {
      cacheLocation: 'localStorage',
    },
  }
}

export const LOGIN_SCOPES = ['openid', 'profile', 'email', 'User.Read']
