import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const fakeEndpoint = 'https://rannuan-settings-test.invalid'
const { version } = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))

test.use({ launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] } })

function category(page: Page, name: string) {
  return page.getByRole('navigation', { name: '设置分类' }).getByRole('button', { name, exact: true })
}

test.beforeEach(async ({ page }) => {
  await page.route(/https?:\/\/(?!127\.0\.0\.1:5201\/).*/, route => route.abort())
  await page.addInitScript(({ version, endpoint }) => {
    if (sessionStorage.getItem('settings-test-seeded')) return
    sessionStorage.setItem('settings-test-seeded', 'true')
    localStorage.setItem('ranNuan_startup_meta', JSON.stringify({ lastVersion: version }))
    localStorage.setItem('desktop-preferences', JSON.stringify({ state: { showSplash: false }, version: 0 }))
    localStorage.setItem('settings-store', JSON.stringify({
      state: { theme: 'dog-light', apiBaseUrl: endpoint, customApiUrl: endpoint + '/custom' },
      version: 0,
    }))
  }, { version, endpoint: fakeEndpoint })
  await page.goto('/settings')
  await expect(page.getByRole('heading', { name: '外观', exact: true })).toBeVisible()
})

test('finds settings at the default and minimum window widths and follows the system theme', async ({ page }, testInfo) => {
  await expect(page.getByRole('radio', { name: '狗狗奶油' })).toBeChecked()
  await page.screenshot({ path: testInfo.outputPath('appearance.png') })
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.getByRole('radio', { name: '跟随系统' }).check()
  await expect(page.locator('html')).toHaveClass(/\bdark\b/)
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(page.locator('html')).not.toHaveClass(/\bdark\b/)
  await page.reload()
  await expect(page.getByRole('radio', { name: '跟随系统' })).toBeChecked()
  await page.setViewportSize({ width: 900, height: 600 })
  await page.getByRole('radio', { name: '狗狗可可' }).check()
  const search = page.getByRole('searchbox', { name: '搜索设置' })
  await search.fill('无损')
  await search.press('Enter')
  await expect(page.getByRole('heading', { name: '音质', exact: true })).toBeFocused()
  await page.getByRole('combobox', { name: '默认音质' }).selectOption('lossless')
  await expect(page.getByRole('combobox', { name: '默认音质' })).toHaveValue('lossless')
  expect(await page.locator('main').evaluate(main => main.scrollWidth - main.clientWidth)).toBeLessThanOrEqual(1)
  expect(await page.locator('main').evaluate(main => main.parentElement?.scrollTop)).toBe(0)
  await expect(page.getByAltText('RanNuan', { exact: true })).toBeInViewport()
  await expect(page.getByRole('link', { name: '设置', exact: true })).toBeInViewport()
  await page.locator('main').evaluate(main => main.scrollTo(0, 0))
  await page.screenshot({ path: testInfo.outputPath('compact.png') })
})

test('reports valid, malformed and failed responses without exposing service addresses', async ({ page }) => {
  let response: unknown = { code: 200, banners: [] }
  let seen = 0
  await page.route(url => url.origin === fakeEndpoint && url.pathname === '/banner', async route => {
    seen++
    expect(new URL(route.request().url()).searchParams.has('cookie')).toBe(false)
    if (response === null) await route.abort()
    else await route.fulfill({ json: response, headers: { 'access-control-allow-origin': '*' } })
  })
  await category(page, '网络与音源').click()
  const settings = page.getByRole('region', { name: '网络与音源', exact: true })
  await expect(settings.getByRole('status')).toContainText('尚未检测')
  const button = settings.getByRole('button', { name: '检测连接' })
  await button.click()
  await expect(settings.getByRole('status')).toContainText('连接正常')
  await expect(settings.getByRole('status')).toContainText(/\d+ ms/)
  response = { code: 200 }
  await button.click()
  await expect(settings.getByRole('status')).toContainText('服务响应异常')
  response = null
  await button.click()
  await expect(settings.getByRole('status')).toContainText('连接失败')
  expect(seen).toBe(3)
  await expect(settings).not.toContainText(fakeEndpoint)
  await expect(settings.locator('input')).toHaveCount(0)
})

test('records search shortcuts and rejects assignments already in use', async ({ page }) => {
  await category(page, '快捷键').click()
  const modify = page.getByRole('button', { name: '修改打开全局搜索' })
  await modify.click()
  await page.keyboard.press('Control+Shift+S')
  await expect(page.getByText('此组合键已分配给另一项搜索操作。')).toBeVisible()
  await page.keyboard.press('Control+Shift+Y')
  await expect(page.getByText('快捷键已保存')).toBeVisible()
  const musicSearch = page.getByPlaceholder('搜索歌曲、歌手、专辑...')
  await page.keyboard.press('Control+K')
  await expect(musicSearch).toHaveCount(0)
  await page.keyboard.press('Control+Shift+Y')
  await expect(musicSearch).toBeFocused()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: '恢复默认快捷键' }).click()
  await page.keyboard.press('Control+K')
  await expect(musicSearch).toBeVisible()
})

// A 12-second PCM track keeps the audio clock and seeking real.
function makeAudio() {
  const pcmLength = 8000 * 12
  const audio = Buffer.alloc(44 + pcmLength, 128)
  audio.write('RIFF', 0)
  audio.writeUInt32LE(audio.length - 8, 4)
  audio.write('WAVEfmt ', 8)
  audio.writeUInt32LE(16, 16)
  audio.writeUInt16LE(1, 20)
  audio.writeUInt16LE(1, 22)
  audio.writeUInt32LE(8000, 24)
  audio.writeUInt32LE(8000, 28)
  audio.writeUInt16LE(1, 32)
  audio.writeUInt16LE(8, 34)
  audio.write('data', 36)
  audio.writeUInt32LE(pcmLength, 40)
  return audio
}

test('boot restores a saved position and starts playback only when enabled', async ({ page }) => {
  const audio = makeAudio()
  await page.route('**/settings-test.wav', route => route.fulfill({ contentType: 'audio/wav', body: audio }))
  await page.evaluate(() => {
    const song = { id: 9876, name: '会话恢复测试' }
    localStorage.setItem('rannuan-player-session', JSON.stringify({
      song, playList: [song], playListIndex: 0, playMode: 0, currentProgress: 4000,
      volume: 0.5, isMuted: false, playbackRate: 1, timestamp: Date.now(),
    }))
    localStorage.setItem('music_url_cache_9876', JSON.stringify({
      url: location.origin + '/settings-test.wav', source: 'pyncmd', timestamp: Date.now(),
    }))
  })
  await page.reload()
  await expect(page.getByText('00:12', { exact: true })).toBeVisible()
  await expect(page.getByTitle('播放', { exact: true })).toBeVisible()
  await expect(page.getByText('会话恢复测试', { exact: true })).toBeVisible()
  await expect(page.getByText('00:04', { exact: true })).toBeVisible()
  await category(page, '桌面体验').click()
  await page.getByRole('switch', { name: '启动后继续播放' }).click()
  await page.reload()
  await expect(page.getByTitle('暂停', { exact: true })).toBeVisible()
  await expect(page.getByText('00:05', { exact: true })).toBeVisible()
})

test('boot restores a local track from its stored audio data', async ({ page }) => {
  await category(page, '数据与存储').click()
  await expect(page.getByText('0 条', { exact: true })).toBeVisible()
  await page.evaluate(async data => {
    const song = { id: 'local-settings-test', name: '本地会话测试' }
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const open = indexedDB.open('RanNuanMusicDB', 2)
      open.onsuccess = () => resolve(open.result)
      open.onerror = () => reject(open.error)
    })
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('localfiles', 'readwrite')
      tx.objectStore('localfiles').put(new Uint8Array(data).buffer, song.id)
      tx.oncomplete = () => resolve()
      tx.onabort = () => reject(tx.error)
    })
    db.close()
    localStorage.setItem('rannuan-player-session', JSON.stringify({
      song, playList: [song], playListIndex: 0, playMode: 0, currentProgress: 4000,
      volume: 0.5, isMuted: false, playbackRate: 1, timestamp: Date.now(),
    }))
  }, [...makeAudio()])
  await page.reload()
  await expect(page.getByText('00:12', { exact: true })).toBeVisible()
  await expect(page.getByText('本地会话测试', { exact: true })).toBeVisible()
  await expect(page.getByText('00:04', { exact: true })).toBeVisible()
  await expect(page.getByTitle('播放', { exact: true })).toBeVisible()
})

test('backs up preferences and clears page caches while retaining local music', async ({ page }) => {
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open('RanNuanMusicDB', 2)
      open.onupgradeneeded = () => {
        const db = open.result
        db.createObjectStore('homepage', { keyPath: 'id' })
        db.createObjectStore('artist', { keyPath: 'id' })
        db.createObjectStore('localfiles')
      }
      open.onsuccess = () => {
        const db = open.result
        const tx = db.transaction(['homepage', 'artist', 'localfiles'], 'readwrite')
        tx.objectStore('homepage').put({ id: 'main', data: [], timestamp: Date.now() + 1000 })
        tx.objectStore('artist').put({ id: 'artist-1', data: {}, timestamp: Date.now() + 1000 })
        tx.objectStore('localfiles').put(new Uint8Array([9]).buffer, 'sample')
        tx.oncomplete = () => { db.close(); resolve() }
        tx.onabort = () => reject(tx.error)
      }
      open.onerror = () => reject(open.error)
    })
  })
  await category(page, '数据与存储').click()
  await expect(page.getByText('2 条 ·', { exact: false })).toBeVisible()
  await page.getByRole('switch', { name: '使用页面缓存' }).press('Space')
  await expect(page.getByRole('switch', { name: '使用页面缓存' })).not.toBeChecked()
  await page.getByRole('button', { name: '清理缓存' }).click()
  await page.getByRole('dialog').getByRole('button', { name: '清理缓存' }).click()
  await expect(page.getByText('0 条', { exact: true })).toBeVisible()
  expect(await page.evaluate(async () => new Promise(resolve => {
    const open = indexedDB.open('RanNuanMusicDB', 2)
    open.onsuccess = () => {
      const db = open.result
      const request = db.transaction('localfiles').objectStore('localfiles').count()
      request.onsuccess = () => { db.close(); resolve(request.result) }
    }
  }))).toBe(1)

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出', exact: true }).click()
  const download = await downloadPromise
  const backupText = await readFile(await download.path(), 'utf8')
  expect(backupText).not.toContain(fakeEndpoint)
  expect(backupText).not.toMatch(/apiBaseUrl|customApiUrl|lxmusicApiUrl|unblockServiceUrl|auth_token/)
  const backupInput = page.locator('input[type=file]')
  await backupInput.setInputFiles({ name: 'incorrect.json', mimeType: 'application/json', buffer: Buffer.from('{}') })
  await expect(page.getByText('无法导入设置')).toBeVisible()
  await page.getByRole('button', { name: '恢复默认', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: '恢复默认' }).click()
  await expect(page.getByRole('switch', { name: '使用页面缓存' })).toBeChecked()
  await backupInput.setInputFiles({ name: 'settings.json', mimeType: 'application/json', buffer: Buffer.from(backupText) })
  await page.getByRole('dialog').getByRole('button', { name: '导入设置' }).click()
  await expect(page.getByRole('switch', { name: '使用页面缓存' })).not.toBeChecked()
})
