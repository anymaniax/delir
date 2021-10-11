#!/usr/bin/env node
import { cac } from 'cac';
import pkg from '../../package.json';
import { saveRouteManifest } from '../generator';
import { startMessage } from '../utils/messages';

const cli = cac('delir');

startMessage({
  name: pkg.name,
  version: pkg.version,
  description: pkg.description,
});

cli.version(pkg.version);

cli
  .command('[output]', 'generate routes for your next application', {
    ignoreOptionDefaultValue: true,
  })
  .option('-w, --workspace <path>', 'next project directory')
  .action(async (paths, cmd) => {
    saveRouteManifest({ ...cmd, output: paths });
  });

cli.help();

cli.parse(process.argv);
