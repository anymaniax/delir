
import type { ParsedUrlQueryInput } from 'querystring'
import { match } from "path-to-regexp";

type GeneratedRoute<
  TPath,
  TQuery extends ParsedUrlQueryInput | void = void
> = (
  TQuery extends void
    ? (query?: ParsedUrlQueryInput) => { pathname: TPath; query?: ParsedUrlQueryInput }
    : (query: TQuery) => { pathname: TPath; query: TQuery }
  ) & {
    matches: ReturnType<typeof match>;
  }


/**
 * Detail
 */
const DetailPath = "/[id]" as const;
const DetailMatcher = match(DetailPath.replace(/[(.*)]/, ':$1'));
const Detail:GeneratedRoute<typeof DetailPath, { id: string | number } & ParsedUrlQueryInput> = (query) => ({ pathname: DetailPath, query });
Detail.matches = () => DetailMatcher(window.location.pathname);

/**
 * Home
 */
const HomePath = "/" as const;
const HomeMatcher = match(HomePath.replace(/[(.*)]/, ':$1'));
const Home:GeneratedRoute<typeof HomePath> = (query) => ({ pathname: HomePath, query });
Home.matches = () => HomeMatcher(window.location.pathname);
export const Routes = {
  Detail,
  Home
};