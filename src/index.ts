import {Command, flags} from '@oclif/command'
import cli from 'cli-ux'
import * as path from 'path'

import {exec, measure, extractSize, humanize} from './utils'

class Emeasure extends Command {
  static description = 'Compare build stats between the current branch and master'

  static flags = {
    version: flags.version({char: 'v'}),
    help: flags.help({char: 'h'}),
  }

  async run() {
    const app = path.basename(process.cwd())
    const branch = await this.getBranch()

    cli.action.start(`Comparing '${branch}' to 'master'`)

    const branchStats = await this.measure(branch, app)
    const masterStats = await this.measure('master', app)
    const vendorJS = {
      item: 'vendor.js',
      before: humanize(masterStats.vendorJS),
      after: humanize(branchStats.vendorJS),
      delta: humanize(branchStats.vendorJS - masterStats.vendorJS),
    }
    const vendorCSS = {
      item: 'vendor.css',
      before: humanize(masterStats.vendorCSS),
      after: humanize(branchStats.vendorCSS),
      delta: humanize(branchStats.vendorCSS - masterStats.vendorCSS),
    }
    const appJS = {
      item: `${app}.js`,
      before: humanize(masterStats.appJS),
      after: humanize(branchStats.appJS),
      delta: humanize(branchStats.appJS - masterStats.appJS),
    }
    const appCSS = {
      item: `${app}.css`,
      before: humanize(masterStats.appCSS),
      after: humanize(branchStats.appCSS),
      delta: humanize(branchStats.appCSS - masterStats.appCSS),
    }
    const prodBuild = {
      item: 'Prod build',
      before: `~${masterStats.prodBuild} S`,
      after: `~${branchStats.prodBuild} S`,
      delta: `${branchStats.prodBuild - masterStats.prodBuild} S`,
    }
    const devBuild = {
      item: 'Dev build',
      before: `~${masterStats.devBuild} S`,
      after: `~${branchStats.devBuild} S`,
      delta: `${branchStats.devBuild - masterStats.devBuild} S`,
    }
    const data = [
      vendorJS,
      vendorCSS,
      appJS,
      appCSS,
      prodBuild,
      devBuild,
    ]

    cli.action.start('Cleaning up')

    exec(`git checkout ${branch}`)
    exec('yarn')

    cli.action.start(`Comparing '${branch}' to 'master'`)
    cli.action.stop()

    cli.table(data, {
      item: {},
      before: {},
      after: {},
      delta: {
        header: '±',
        get: ({delta}) => /^(-|0 )/.test(delta) ? delta : `+${delta}`,
      },
    })
  }

  async measure(branch: string, app: string): Promise<Stats> {
    cli.action.start(`Setting up ${branch}`)

    await exec(`git checkout ${branch}`)
    await exec('yarn')

    cli.action.start(`Measuring prod build of ${branch}`)
    const [prodBuild, {stdout: prodOutput}]  = await measure(() => exec('yarn run ember build -prod'))
    const vendorJS = extractSize(prodOutput, 'vendor', 'js')
    const vendorCSS = extractSize(prodOutput, 'vendor', 'css')
    const appJS = extractSize(prodOutput, app, 'js')
    const appCSS = extractSize(prodOutput, app, 'css')

    cli.action.start(`Measuring dev build of ${branch}`)
    const [devBuild] = await measure(() => exec('yarn run ember build -dev'))

    return {
      vendorJS,
      vendorCSS,
      appJS,
      appCSS,
      devBuild: Math.round(devBuild / 1000),
      prodBuild: Math.round(prodBuild / 1000),
    }
  }

  async getBranch() {
    const {stdout} = await exec('git status')
    const matches = stdout.match(/On branch (.+)/)

    if (!matches) {
      throw new Error('Could not determine branch')
    }

    return matches[1]
  }
}

type bytes = number;
type milliseconds = number;

type Stats = {
  vendorJS: bytes;
  vendorCSS: bytes;
  appJS: bytes;
  appCSS: bytes;
  devBuild: milliseconds;
  prodBuild: milliseconds;
}

export = Emeasure
