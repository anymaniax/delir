import chalk from 'chalk';
export const log = console.log; // tslint:disable-line:no-console

export const startMessage = ({
  name,
  version,
  description,
}: {
  name: string;
  version: string;
  description: string;
}) =>
  log(
    `🍻 Start ${chalk.cyan.bold(name)} ${chalk.green(`v${version}`)}${
      description ? ` - ${description}` : ''
    }`,
  );

export const createSuccessMessage = () =>
  log(`🎉 Your routes has been generated!`);
