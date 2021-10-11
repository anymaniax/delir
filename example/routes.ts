import type { ParsedUrlQueryInput } from 'querystring'
import type { UrlObject } from 'url';
export interface Routes {
  Detail(query: { id: string | number } & ParsedUrlQueryInput): UrlObject;
  Home(query?: ParsedUrlQueryInput): UrlObject;
}

export const Routes: Routes = {
  Detail: (query) => ({ pathname: "/[id]", query }),
  Home: (query) => ({ pathname: "/", query })
}