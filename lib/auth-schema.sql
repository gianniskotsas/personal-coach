create table if not exists "user" ("id" text not null primary key, "name" text not null, "email" text not null unique, "emailVerified" boolean not null, "image" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null);

create table if not exists "session" ("id" text not null primary key, "expiresAt" timestamptz not null, "token" text not null unique, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null, "ipAddress" text, "userAgent" text, "userId" text not null references "user" ("id") on delete cascade);

create table if not exists "account" ("id" text not null primary key, "accountId" text not null, "providerId" text not null, "userId" text not null references "user" ("id") on delete cascade, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz, "scope" text, "password" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null);

create table if not exists "verification" ("id" text not null primary key, "identifier" text not null, "value" text not null, "expiresAt" timestamptz not null, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null);

create table if not exists "oauthApplication" ("id" text not null primary key, "name" text not null, "icon" text, "metadata" text, "clientId" text not null unique, "clientSecret" text, "redirectUrls" text not null, "type" text not null, "disabled" boolean, "userId" text references "user" ("id") on delete cascade, "createdAt" timestamptz not null, "updatedAt" timestamptz not null);

create table if not exists "oauthAccessToken" ("id" text not null primary key, "accessToken" text not null unique, "refreshToken" text not null unique, "accessTokenExpiresAt" timestamptz not null, "refreshTokenExpiresAt" timestamptz not null, "clientId" text not null references "oauthApplication" ("clientId") on delete cascade, "userId" text references "user" ("id") on delete cascade, "scopes" text not null, "createdAt" timestamptz not null, "updatedAt" timestamptz not null);

create table if not exists "oauthConsent" ("id" text not null primary key, "clientId" text not null references "oauthApplication" ("clientId") on delete cascade, "userId" text not null references "user" ("id") on delete cascade, "scopes" text not null, "createdAt" timestamptz not null, "updatedAt" timestamptz not null, "consentGiven" boolean not null);

create table if not exists "apikey" ("id" text not null primary key, "configId" text not null, "name" text, "start" text, "referenceId" text not null, "prefix" text, "key" text not null, "refillInterval" integer, "refillAmount" integer, "lastRefillAt" timestamptz, "enabled" boolean, "rateLimitEnabled" boolean, "rateLimitTimeWindow" integer, "rateLimitMax" integer, "requestCount" integer, "remaining" integer, "lastRequest" timestamptz, "expiresAt" timestamptz, "createdAt" timestamptz not null, "updatedAt" timestamptz not null, "permissions" text, "metadata" text);

create index if not exists "session_userId_idx" on "session" ("userId");

create index if not exists "account_userId_idx" on "account" ("userId");

create index if not exists "verification_identifier_idx" on "verification" ("identifier");

create index if not exists "oauthApplication_userId_idx" on "oauthApplication" ("userId");

create index if not exists "oauthAccessToken_clientId_idx" on "oauthAccessToken" ("clientId");

create index if not exists "oauthAccessToken_userId_idx" on "oauthAccessToken" ("userId");

create index if not exists "oauthConsent_clientId_idx" on "oauthConsent" ("clientId");

create index if not exists "oauthConsent_userId_idx" on "oauthConsent" ("userId");

create index if not exists "apikey_configId_idx" on "apikey" ("configId");

create index if not exists "apikey_referenceId_idx" on "apikey" ("referenceId");

create index if not exists "apikey_key_idx" on "apikey" ("key");