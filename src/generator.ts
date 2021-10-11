import chalk from 'chalk';
import { outputFile, promises, readFile } from 'fs-extra';
import { extname, join } from 'upath';
import { createSuccessMessage, log } from './utils/messages';

export const topLevelFoldersThatMayContainPages = ['pages'];

export function getIsPageFile(filePathFromAppRoot: string) {
  return /[\\/]pages[\\/]/.test(filePathFromAppRoot);
}

export async function recursiveFindPages(
  dir: string,
  filter: RegExp,
  ignore?: RegExp,
  arr: string[] = [],
  rootDir: string = dir,
): Promise<string[]> {
  let folders = await promises.readdir(dir);

  if (dir === rootDir) {
    folders = folders.filter((folder) =>
      topLevelFoldersThatMayContainPages.includes(folder),
    );
  }

  await Promise.all(
    folders.map(async (part: string) => {
      const absolutePath = join(dir, part);
      if (ignore && ignore.test(part)) return;

      const pathStat = await promises.stat(absolutePath);

      if (pathStat.isDirectory()) {
        await recursiveFindPages(absolutePath, filter, ignore, arr, rootDir);
        return;
      }

      if (!filter.test(part)) {
        return;
      }

      const relativeFromRoot = absolutePath.replace(rootDir, '');
      if (getIsPageFile(relativeFromRoot)) {
        arr.push(relativeFromRoot);
        return;
      }
    }),
  );

  return arr.sort();
}

export function buildPageExtensionRegex(pageExtensions: string[]) {
  return new RegExp(`(?<!\\.test|\\.spec)\\.(?:${pageExtensions.join('|')})$`);
}

export function collectPages(
  directory: string,
  pageExtensions: string[],
): Promise<string[]> {
  return recursiveFindPages(directory, buildPageExtensionRegex(pageExtensions));
}

export function convertPageFilePathToRoutePath(
  filePath: string,
  pageExtensions: string[],
) {
  return filePath
    .replace(/^.*?[\\/]pages[\\/]/, '/')
    .replace(new RegExp(`\\.+(${pageExtensions.join('|')})$`), '');
}

type PagesMapping = {
  [page: string]: string;
};

export function createPagesMapping(
  pagePaths: string[],
  pageExtensions: string[],
): PagesMapping {
  const previousPages: PagesMapping = {};
  const pages: PagesMapping = pagePaths.reduce(
    (result: PagesMapping, pagePath): PagesMapping => {
      let page = `${convertPageFilePathToRoutePath(
        pagePath,
        pageExtensions,
      ).replace(/\\/g, '/')}`.replace(/\/index$/, '');

      let pageKey = page === '' ? '/' : page;

      if (pageKey in result) {
        console.warn(
          `Duplicate page detected. ${chalk.cyan(
            previousPages[pageKey],
          )} and ${chalk.cyan(pagePath)} both resolve to ${chalk.cyan(
            pageKey,
          )}.`,
        );
      } else {
        previousPages[pageKey] = pagePath;
      }
      result[pageKey] = pagePath.replace(/\\/g, '/');
      return result;
    },
    {},
  );

  pages['/_app'] = pages['/_app'] || 'next/dist/pages/_app';
  pages['/_error'] = pages['/_error'] || 'next/dist/pages/_error';
  pages['/_document'] = pages['/_document'] || 'next/dist/pages/_document';

  return pages;
}

export type RouteCacheEntry = {
  filePath: string;
  route: string;
};

export type Config = {
  output?: string;
  workspace?: string;
  extensions?: string[];
};

const apiPathRegex = /([\\/]api[\\/])/;

export async function collectAllRoutes(config: Config) {
  const { extensions = ['js', 'ts', 'tsx', 'jsx'], workspace = process.cwd() } =
    config;
  const routeFiles = await collectPages(workspace, extensions);
  const rawRouteMappings = createPagesMapping(routeFiles, extensions);
  const routes: RouteCacheEntry[] = [];
  for (const [route, filePath] of Object.entries(rawRouteMappings)) {
    if (
      ['/_app', '/_document', '/_error'].includes(route) ||
      apiPathRegex.test(filePath)
    )
      continue;

    routes.push({
      filePath,
      route,
    });
  }
  return routes;
}

type Parameter = {
  name: string;
  optional: boolean;
};

interface RouteManifestEntry {
  name: string;
  parameters: Parameter[];
  multipleParameters: Parameter[];
  mdx?: boolean;
}

const squareBracketsRegex = /\[\[.*?\]\]|\[.*?\]/g;

function removeSquareBracketsFromSegments(value: string): string;

function removeSquareBracketsFromSegments(value: string[]): string[];

function removeSquareBracketsFromSegments(
  value: string | string[],
): string | string[] {
  if (typeof value === 'string') {
    return value.replace('[', '').replace(']', '');
  }
  return value.map((val) => val.replace('[', '').replace(']', ''));
}

// from https://github.com/angus-c/just/blob/master/packages/array-partition/index.js
function partition(arr: any[], predicate: (value: any) => boolean) {
  if (!Array.isArray(arr)) {
    throw new Error('expected first argument to be an array');
  }
  if (typeof predicate != 'function') {
    throw new Error('expected second argument to be a function');
  }
  var first = [];
  var second = [];
  var length = arr.length;
  for (var i = 0; i < length; i++) {
    var nextValue = arr[i];
    if (predicate(nextValue)) {
      first.push(nextValue);
    } else {
      second.push(nextValue);
    }
  }
  return [first, second];
}

export function parseParametersFromRoute(
  path: string,
): Pick<RouteManifestEntry, 'parameters' | 'multipleParameters'> {
  const parameteredSegments = path.match(squareBracketsRegex) ?? [];
  const withoutBrackets = removeSquareBracketsFromSegments(parameteredSegments);

  const [multipleParameters, parameters] = partition(withoutBrackets, (p) =>
    p.includes('...'),
  );

  return {
    parameters: parameters.map((value) => {
      const containsSquareBrackets = squareBracketsRegex.test(value);
      if (containsSquareBrackets) {
        return {
          name: removeSquareBracketsFromSegments(value),
          optional: true,
        };
      }

      return {
        name: value,
        optional: false,
      };
    }),
    multipleParameters: multipleParameters.map((param) => {
      const withoutEllipsis = param.replace('...', '');
      const containsSquareBrackets = squareBracketsRegex.test(withoutEllipsis);

      if (containsSquareBrackets) {
        return {
          name: removeSquareBracketsFromSegments(withoutEllipsis),
          optional: true,
        };
      }

      return {
        name: withoutEllipsis,
        optional: false,
      };
    }),
  };
}

const pascalCase = (value: string): string => {
  const val = value.replace(/[-_\s/.]+(.)?/g, (_match, chr) =>
    chr ? chr.toUpperCase() : '',
  );
  return val.substr(0, 1).toUpperCase() + val.substr(1);
};

export function parseDefaultExportName(contents: string): string | null {
  const result = contents.match(
    /export\s+default(?:\s+(?:const|let|class|var|function))?\s+(\w+)/,
  );
  if (!result) {
    return null;
  }

  return result[1] ?? null;
}

function dedupeBy<T, K>(arr: T[], by: (v: T) => K): T[] {
  const allKeys = arr.map(by);
  return arr.filter((v, index) => {
    const key = by(v);
    const first = allKeys.indexOf(key);
    const last = allKeys.lastIndexOf(key);

    if (first !== last && first !== index) {
      const { 0: firstPath } = arr[first] as any;
      const { 0: lastPath } = arr[last] as any;
      const message = `The page component is named "${key}" on both the ${firstPath} and ${lastPath} routes. The page component must have a unique name across all routes, so change the component name on one of those routes to avoid conflict.`;

      throw Error(message);
    }

    return true;
  });
}

export function generateManifest(
  routes: Record<string, RouteManifestEntry>,
  onlyJs: boolean,
): {
  implementation: string;
  declaration: string;
} {
  const routesWithoutDuplicates = dedupeBy(
    Object.entries(routes),
    ([_path, { name }]) => name,
  );

  const implementationLines = routesWithoutDuplicates.map(
    ([path, { name }]) =>
      `${name}: (query) => ({ pathname: "${path}", query })`,
  );

  const declarationLines = routesWithoutDuplicates.map(
    ([_path, { name, parameters, multipleParameters }]) => {
      if (parameters.length === 0 && multipleParameters.length === 0) {
        return `${name}(query?: ParsedUrlQueryInput): UrlObject`;
      }

      return `${name}(query: { ${[
        ...parameters.map(
          (param) =>
            param.name + (param.optional ? '?' : '') + ': string | number',
        ),
        ...multipleParameters.map(
          (param) =>
            param.name + (param.optional ? '?' : '') + ': (string | number)[]',
        ),
      ].join('; ')} } & ParsedUrlQueryInput): UrlObject`;
    },
  );

  const declarationEnding = declarationLines.length > 0 ? ';' : '';

  return {
    implementation:
      `export const Routes${!onlyJs ? ': Routes' : ''} = {\n` +
      implementationLines.map((line) => '  ' + line).join(',\n') +
      '\n}',
    declaration: `
import type { ParsedUrlQueryInput } from 'querystring'
import type { UrlObject } from 'url';
export interface Routes {
${declarationLines.map((line) => '  ' + line).join(';\n') + declarationEnding}
}`.trim(),
  };
}

export async function saveRouteManifest(config: Config) {
  const { output: outputPath } = config;

  if (!outputPath) {
    log(chalk.red(`🛑 Output path required`));
    process.exit(0);
  }

  const originalExt = extname(outputPath);

  const allRoutes = await collectAllRoutes(config);
  const routes: Record<string, RouteManifestEntry> = {};

  if (!allRoutes.length) {
    log(chalk.red(`🛑  No routes found`));
    process.exit(0);
  }

  const onlyJsFile = !allRoutes.some(({ filePath }) => {
    const pathExt = extname(filePath);
    return pathExt === '.tsx' || pathExt === '.ts';
  });

  let ext = originalExt || (onlyJsFile ? '.js' : '.ts');

  for (let { filePath, route } of allRoutes) {
    if (/\.mdx$/.test(filePath)) {
      routes[route] = {
        ...parseParametersFromRoute(route),
        name: route === '/' ? 'Index' : pascalCase(route),
        mdx: true,
      };
    } else {
      const fileContents = await readFile(filePath, {
        encoding: 'utf-8',
      });

      const defaultExportName = parseDefaultExportName(fileContents);
      if (!defaultExportName) continue;

      routes[route] = {
        ...parseParametersFromRoute(route),
        name: defaultExportName,
      };
    }
  }

  const { declaration, implementation } = generateManifest(
    routes,
    ext === '.js',
  );

  let output = '';

  if (ext === '.ts') {
    output += declaration;
    output += '\n\n';
  }

  output += implementation;

  await outputFile(originalExt ? outputPath : `${outputPath}${ext}`, output, {
    encoding: 'utf-8',
  });

  createSuccessMessage();
}
