import path from 'node:path';
import { type ArgDef, runMain as _runMain, defineCommand } from 'citty';
import { consola } from 'consola';
import { downloadTemplate } from 'giget';
import { readPackageJSON, writePackageJSON } from 'pkg-types';
import { description, name, version } from '../package.json';

const mainCommand = defineCommand({
  meta: {
    name,
    version,
    description,
  },
  args: {
    name: {
      type: 'string',
      alias: 'n',
      description: 'プロジェクト名',
      valueHint: 'project-name',
      required: false,
    },
    template: {
      type: 'string',
      alias: 't',
      description: 'テンプレート名',
      valueHint: 'template-name',
      required: false,
    },
    install: {
      type: 'boolean',
      alias: 'i',
      description: '依存関係をインストールしますか？',
      required: false,
    },
  } as const satisfies Record<string, ArgDef>,
  run: async ({ args }) => {
    const settings = {
      projectName: args.name,
      templateName: args.template,
      install: args.install,
    };

    settings.projectName ??= await consola.prompt('プロジェクト名を入力してください', {
      type: 'text',
      default: 'xeiculy-app',
      placeholder: 'xeiculy-app',
    });

    settings.templateName ??= await consola.prompt('テンプレートを選択してください', {
      type: 'select',
      options: [{ label: 'Nuxt3', value: 'nuxt3' }],
    });

    settings.install ??= await consola.prompt('依存関係をinstallしますか？', {
      type: 'confirm',
      initial: false,
    });

    const { projectName, templateName, install } = settings;

    const githubRepoUrlBase = 'gh:XeicuLy/create-xeiculy-nuxt-app/templates';
    const { dir: appDir } = await downloadTemplate(`${githubRepoUrlBase}/${templateName}`, {
      dir: projectName,
      install,
    });
    const packageJson = await readPackageJSON(appDir);
    if (packageJson.name) {
      packageJson.name = projectName;
      const jsonPath = path.resolve(appDir, 'package.json');
      await writePackageJSON(jsonPath, packageJson);
    }

    consola.log('\n');
    consola.success('Done!✨');
    consola.log(`cd ${projectName}`);
  },
});

export const runMain = () => _runMain(mainCommand);
