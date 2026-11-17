import { useEffect, useState } from 'react';

export type RouteName = 'landing' | 'workspace' | 'evaluations' | 'how-it-works';

const HASH_TO_ROUTE: Record<string, RouteName> = {
  '': 'landing',
  '/': 'landing',
  '/workspace': 'workspace',
  '/evaluations': 'evaluations',
  '/how-it-works': 'how-it-works',
};

const ROUTE_TO_HASH: Record<RouteName, string> = {
  landing: '#/',
  workspace: '#/workspace',
  evaluations: '#/evaluations',
  'how-it-works': '#/how-it-works',
};

const ROUTE_TITLES: Record<RouteName, string> = {
  landing: 'SpecProof — proof for shipped work',
  workspace: 'Overview — SpecProof',
  evaluations: 'Evaluations — SpecProof',
  'how-it-works': 'How it works — SpecProof',
};

export function parseRoute(hash: string): RouteName {
  const path = (hash.replace(/^#/, '').split('?')[0] || '/') as string;
  return HASH_TO_ROUTE[path] ?? 'landing';
}

export function routeHref(route: RouteName): string {
  return ROUTE_TO_HASH[route];
}

export function routeTitle(route: RouteName): string {
  return ROUTE_TITLES[route];
}

export function navigateTo(route: RouteName): void {
  const href = routeHref(route);
  if (window.location.hash === href) return;
  window.location.hash = href;
}

export function useRoute(): RouteName {
  const [route, setRoute] = useState<RouteName>(() => parseRoute(window.location.hash));

  useEffect(() => {
    const handleHashChange = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return route;
}
