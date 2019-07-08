import * as fs from 'fs'
import * as path from 'path'

import { prompt } from 'enquirer'
import * as Octokit from '@octokit/rest'

import * as parseGithubUrl from 'parse-github-url'

const getFiles = async (basePath: string) => {
  const fileNames = fs
    .readdirSync(basePath)
    .filter(file => fs.statSync(path.join(basePath + file)).isFile())
  return fileNames.map(fileName => {
    const content = fs.readFileSync(path.join(basePath + fileName), 'utf-8')
    return {
      name: fileName,
      content,
    }
  })
}

const main = async () => {
  const response = (await prompt([
    {
      type: 'input',
      name: 'username',
      message: 'What is your username?',
    },
    {
      type: 'password',
      name: 'password',
      message: 'What is your password?',
    },
  ])) as {
    username: string
    password: string
  }
  const octokit = await new Octokit({
    auth: {
      username: response.username,
      password: response.password,
      async on2fa() {
        const response = (await prompt({
          type: 'input',
          name: 'twoFactorCode',
          message: 'What is your two-factor code?',
        })) as {
          twoFactorCode: string
        }
        return response.twoFactorCode
      },
    },
  })
  const response2 = (await prompt([
    {
      type: 'input',
      name: 'url',
      message: 'What is repository url?',
    },
  ])) as {
    url: string
  }
  const reposInfo = parseGithubUrl(response2.url)
  if (!reposInfo || !reposInfo.owner || !reposInfo.name) return
  await octokit.repos.get({
    owner: reposInfo.owner,
    repo: reposInfo.name,
  })
  const { data: milestone } = await octokit.issues
    .createMilestone({
      owner: reposInfo.owner,
      repo: reposInfo.name,
      title: 'テスト',
      description: 'テスト用マイルストーン',
    })
    .catch(async _ => {
      return await octokit.issues.getMilestone({
        owner: reposInfo.owner!,
        repo: reposInfo.name!,
        milestone_number: 1,
      })
    })
  const files = await getFiles('./issues/')
  for (let file of files) {
    await octokit.issues
      .create({
        owner: reposInfo.owner,
        repo: reposInfo.name,
        title: file.name,
        body: file.content,
        milestone: milestone.number,
      })
      .catch(console.log)
  }
}
;(async () => {
  console.log(main.name)
  // const basePath = 'issues/'
  // const files = await getFiles(basePath)
  // files.forEach(f => console.log(f))
  await main()
})()
