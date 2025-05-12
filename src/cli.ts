import { existsSync } from 'node:fs';
import { type ArgDef, runMain as _runMain, defineCommand } from 'citty';
import consola, { type SelectPromptOptions } from 'consola';
import { colors } from 'consola/utils';
import { type DownloadTemplateResult, downloadTemplate } from 'giget';
import { type PackageManagerName, installDependencies } from 'nypm';
import { relative, resolve } from 'pathe';
import { hasTTY } from 'std-env';
import { x } from 'tinyexec';
import { description, name, version } from '../package.json';

const DEFAULT_REGISTRY = 'gh:XeicuLy/create-xeiculy-nuxt-app/templates' as const;
const DEFAULT_TEMPLATE_NAME = 'nuxt3' as const;

const packageManager: Record<PackageManagerName, undefined> = {
  npm: undefined,
  yarn: undefined,
  pnpm: undefined,
  bun: undefined,
  deno: undefined,
};

const packageManagerOptions = Object.keys(packageManager) as PackageManagerName[];

const mainCommand = defineCommand({
  meta: {
    name,
    version,
    description,
  },
  args: {
    cwd: {
      type: 'string',
      description: 'Specify the working directory',
      valueHint: 'directory',
      default: '.',
    },
    dir: {
      type: 'positional',
      description: 'Project directory',
      default: '',
    },
    template: {
      type: 'string',
      alias: 't',
      description: 'Template name',
    },
    install: {
      type: 'boolean',
      description: 'Install dependencies',
    },
    gitInit: {
      type: 'boolean',
      description: 'Initialize git repository',
    },
    packageManager: {
      type: 'string',
      description: 'Package manager choice (npm, pnpm, yarn, bun, deno)',
    },
  } as const satisfies Record<string, ArgDef>,
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: <explanation>
  run: async ({ args }) => {
    if (hasTTY) {
      process.stdout.write('Loading...\n');
    }

    consola.info(colors.bold('Hello XeicuLy Template App!'));

    if (args.dir === '') {
      args.dir = await consola
        .prompt('Where would you like to create your project?', {
          placeholder: './my-project',
          type: 'text',
          default: './my-project',
          cancel: 'reject',
        })
        .catch(() => process.exit(1));
    }

    const cwd = resolve(args.cwd);
    const templateDownloadPath = resolve(cwd, args.dir);
    consola.info(
      `Creating a new project in ${colors.cyan(relative(cwd, templateDownloadPath) || templateDownloadPath)}.`,
    );

    args.template = await consola
      .prompt('Choose a template', {
        type: 'select',
        options: [{ label: 'Nuxt3', value: 'nuxt3' }],
        cancel: 'reject',
      })
      .catch(() => process.exit(1));

    const templateName = args.template || DEFAULT_TEMPLATE_NAME;

    if (typeof templateName !== 'string') {
      consola.error('Please specify a template name.');
      process.exit(1);
    }

    const shouldVerify = existsSync(templateDownloadPath);

    if (shouldVerify) {
      consola.error(
        `The directory ${colors.cyan(relative(cwd, templateDownloadPath) || templateDownloadPath)} already exists. Please choose a different directory.`,
      );
      process.exit(1);
    }

    let template: DownloadTemplateResult;

    try {
      template = await downloadTemplate(`${DEFAULT_REGISTRY}/${templateName}`, {
        dir: templateDownloadPath,
      });
    } catch (error) {
      consola.error((error as Error).toString());
      process.exit(1);
    }

    const detectCurrentPackageManager = () => {
      const userAgent = process.env.npm_config_user_agent;
      if (!userAgent) {
        return;
      }
      const [name] = userAgent.split('/');
      if (packageManagerOptions.includes(name as PackageManagerName)) {
        return name as PackageManagerName;
      }
    };

    const currentPackageManager = detectCurrentPackageManager();

    const packageManagerArg = args.packageManager as PackageManagerName;
    const packageManagerSelectOptions = packageManagerOptions.map(
      (packageManager) =>
        ({
          label: packageManager,
          value: packageManager,
          hint: currentPackageManager === packageManager ? 'current' : undefined,
        }) satisfies SelectPromptOptions['options'][number],
    );
    const selectedPackageManager = packageManagerOptions.includes(packageManagerArg)
      ? packageManagerArg
      : await consola
          .prompt('Which package manager would you like to use?', {
            type: 'select',
            options: packageManagerSelectOptions,
            initial: currentPackageManager,
            cancel: 'reject',
          })
          .catch(() => process.exit(1));

    if (args.install === false) {
      consola.info('Skipping dependency installation.');
    } else {
      consola.start('Installing dependencies...');

      try {
        await installDependencies({
          cwd: template.dir,
          packageManager: {
            name: selectedPackageManager,
            command: selectedPackageManager,
          },
        });
      } catch (error) {
        consola.error((error as Error).toString());
        process.exit(1);
      }

      consola.success('Installation completed.');
    }

    if (args.gitInit === undefined) {
      args.gitInit = await consola
        .prompt('Initialize git repository?', {
          type: 'confirm',
          cancel: 'reject',
        })
        .catch(() => process.exit(1));
    }

    if (args.gitInit) {
      consola.info('Initializing git repository...\n');

      try {
        await x('git', ['init', template.dir], {
          throwOnError: true,
          nodeOptions: {
            stdio: 'inherit',
          },
        });
      } catch (err) {
        consola.warn(`Failed to initialize git repository: ${err}`);
      }
    }

    consola.log(`\n✨ Starter project has been created with the \`${template.source}\` template.`);
  },
});

export const runMain = () => _runMain(mainCommand);
