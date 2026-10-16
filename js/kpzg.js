const cheerio = createCheerio()

const FETCH_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'

const COVER_IMAGE = 'https://ss-mpvolc.meipian.me/users/6998636/d037a1a39f554aa0bca1472bbf047bd5__jpg.heic~tplv-s1ctq42ewb-s2-cC-q:750:0:0:0:q80.jpg'

// ★ 修复1：优化播放请求头，移除可能导致播放器反复重试的 Range，改用PC端UA和专用Referer
const VIDEO_HEADERS = {
    'User-Agent': FETCH_UA,
    'Referer': 'http://tv.people.com.cn/',
    'Origin': 'http://tv.people.com.cn'
}

let appConfig = {
    ver: 1,
    title: '科普中国',
    site: 'http://kpzg.people.com.cn',
    tabs: [
        { name: '科普中国', ext: { id: '445570' } }
    ],
}

async function getConfig() {
    return JSON.stringify(appConfig)
}

// 自动识别最新年份，生成3个卡片
async function getCards(ext) {
    ext = JSON.parse(ext)
    let page = ext.page || 1
    const id = ext.id || '445570'

    if (page > 1) {
        return JSON.stringify({ list: [] })
    }

    let latestYear = new Date().getFullYear().toString()

    try {
        const { data } = await $fetch.get(`${appConfig.site}/GB/${id}/index.html`, { headers: { 'User-Agent': FETCH_UA } })
        const $ = cheerio.load(data)
        const firstDate = $('.ej_list_box ul.list_16 > li').first().find('em').text().trim()
        if (firstDate) {
            const match = firstDate.match(/(\d{4})/)
            if (match) latestYear = match[1]
        }
    } catch (e) {}

    const latestYearNum = parseInt(latestYear, 10)
    const years = [
        (latestYearNum).toString(),
        (latestYearNum - 1).toString(),
        (latestYearNum - 2).toString()
    ]

    const cards = years.map(year => ({
        vod_id: `kepu_${year}`,
        vod_name: `科普中国${year}`,
        vod_pic: COVER_IMAGE,
        vod_remarks: '连载中',
        ext: { id: id, year: year }
    }))

    return JSON.stringify({ list: cards })
}

// ★ 修复2：增加最大翻页限制，防止日期解析失败导致无限循环请求
async function getTracks(ext) {
    ext = JSON.parse(ext)
    const targetYear = ext.year || ''
    const baseUrl = `${appConfig.site}/GB/${ext.id}/`

    let tracks = []
    let page = 1
    let hasMore = true
    let stopFetch = false
    const MAX_PAGE = 15 // 限制最多抓取15页，防止死循环导致应用内存崩溃

    while (hasMore && !stopFetch && page <= MAX_PAGE) {
        let url = page === 1 ? `${baseUrl}index.html` : `${baseUrl}index${page}.html`

        try {
            const { data } = await $fetch.get(url, { headers: { 'User-Agent': FETCH_UA } })
            const $ = cheerio.load(data)
            const items = $('.ej_list_box ul.list_16 > li')

            if (items.length === 0) break

            items.each((_, element) => {
                const a = $(element).find('a')
                const href = a.attr('href')
                const title = a.text().trim()
                const date = $(element).find('em').text().trim()

                if (href && title) {
                    if (!targetYear || date.startsWith(targetYear)) {
                        tracks.push({
                            name: `【${date}】${title}`,
                            ext: { url: appConfig.site + href }
                        })
                    } else if (targetYear && date) {
                        const currentYear = date.substring(0, 4)
                        if (currentYear < targetYear) {
                            stopFetch = true
                        }
                    }
                }
            })

            if (!stopFetch) {
                const nextPageLink = $('.page_n a').filter((_, el) => {
                    return $(el).text().includes('下一页') || $(el).text().includes('下页')
                })
                if (nextPageLink.length === 0) {
                    hasMore = false
                } else {
                    page++
                }
            }
        } catch (e) {
            hasMore = false
        }
    }

    // 按日期降序排列（最新在最前面）
    tracks.sort((a, b) => {
        const dateA = a.name.match(/【(\d{4}-\d{2}-\d{2})】/)
        const dateB = b.name.match(/【(\d{4}-\d{2}-\d{2})】/)
        if (dateA && dateB) {
            return dateB[1].localeCompare(dateA[1])
        }
        return 0
    })

    return JSON.stringify({ list: [{ title: '选集', tracks: tracks }] })
}

// ★ 修复3：重写视频解析逻辑，精准过滤广告循环视频，完美支持 m3u8 和 JS 动态链接
async function getPlayinfo(ext) {
    ext = JSON.parse(ext)
    const url = ext.url

    try {
        const { data } = await $fetch.get(url, { headers: { 'User-Agent': FETCH_UA } })
        
        // 调试日志：如果这里打印出几百，说明抓取的是空壳页面
        console.log(`【调试】文章页面长度: ${data.length}`)

        let videoUrl = null

        const patterns = [
            // 1. 优先匹配 JS 变量中的真实播放地址（很多现代网页用 JS 赋值，能直接绕开顶部的广告视频）
            /(?:video_url|videoUrl|playUrl|videoSrc)\s*[:=]\s*["']([^"']+\.(?:mp4|m3u8)[^"']*)["']/i,
            // 2. 匹配带有明确 class 的正文视频（精准定位正文）
            /<div[^>]*class=["'][^"']*(?:video|player)[^"']*["'][^>]*>[\s\S]*?<video[^>]+src=["']([^"']+\.(?:mp4|m3u8)[^"']*)["']/i,
            /<div[^>]*class=["'][^"']*(?:video|player)[^"']*["'][^>]*>[\s\S]*?<source[^>]+src=["']([^"']+\.(?:mp4|m3u8)[^"']*)["']/i,
            // 3. 兜底：全局搜 mp4 或 m3u8
            /<video[^>]+src=["']([^"']+\.(?:mp4|m3u8)[^"']*)["']/i,
            /<source[^>]+src=["']([^"']+\.(?:mp4|m3u8)[^"']*)["']/i,
            /(https?:\/\/[^\s"'\\]+\.(?:mp4|m3u8)[^\s"'\\]*)/i
        ]

        for (const pattern of patterns) {
            const match = data.match(pattern)
            if (match && match[1]) {
                videoUrl = match[1]
                break
            }
        }

        if (videoUrl) {
            videoUrl = videoUrl.replace(/\\/g, '') // 清除转义符
            console.log("✅ 成功提取视频真实链接:", videoUrl)
            
            return JSON.stringify({
                urls: [videoUrl],
                headers: VIDEO_HEADERS
            })
        } else {
            // 部分文章视频嵌套在 iframe 里
            const iframeMatch = data.match(/<iframe[^>]+src=["']([^"']+)["']/i)
            if (iframeMatch && iframeMatch[1]) {
                console.log("⚠️ 发现 iframe 嵌套视频源，需要二次解析:", iframeMatch[1])
            }
        }

    } catch (e) {
        console.log("解析视频异常:", e)
    }

    return JSON.stringify({ urls: [], headers: { 'User-Agent': FETCH_UA } })
}

async function search(ext) {
    return JSON.stringify({ list: [] })
}
