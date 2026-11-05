import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers:[Google({authorization:{params:{scope:'openid email profile https://www.googleapis.com/auth/drive.appdata',access_type:'offline',prompt:'consent'}}})],
  session:{strategy:'jwt'},
  callbacks:{async jwt({token,account}){if(account){token.accessToken=account.access_token;token.refreshToken=account.refresh_token||token.refreshToken;token.expiresAt=account.expires_at;token.scope=account.scope||''}return token}}
});
