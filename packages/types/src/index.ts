export type PromptVisibility = 'PUBLIC' | 'UNLISTED' | 'PRIVATE';

export type PlaceholderRoute =
  | '/'
  | '/login'
  | '/register'
  | '/explore'
  | '/search'
  | '/create'
  | '/saved'
  | '/collections'
  | '/notifications'
  | '/settings'
  | `/u/${string}`
  | `/p/${string}`;

export interface AppHealth {
  status: 'ok';
  service: 'web' | 'api';
  timestamp: string;
}
