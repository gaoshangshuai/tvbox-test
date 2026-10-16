const cheerio = createCheerio()

const FETCH_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'

const COVER_IMAGE = 'https://ss-mpvolc.meipian.me/users/6998636/d037a1a39f554aa0bca1472bbf047bd5__jpg.heic~tplv-s1ctq42ewb-s2-cC-q:750:0:0:0:q80.jpg'

const VIDEO_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1',
    'Referer': 'http://kpzg.people.com.cn/',
    'Origin': 'http://kpzg.people.com.cn',
    'Range': 'bytes=0-'
}

let appConfig = {
    ver: 1,
    title: '科普中国',
    site: 'http://kpzg.people.com.cn',
    tabs: [
        { name: '科普中国2026', ext: { id: '445570', year: '2026' } },
        { name: '科普中国2025', ext: { id: '445570', year: '2025' } },
        { name: '科普中国2024', ext: { id: '445570', year: '2024' } },
    ],
}

async function getConfig() {
    return JSON.stringify(appConfig)
}

// ★ 第一步：首页只返回一个封面卡片（像电视剧一样）
async function getCards(ext) {
    ext = JSON.parse(ext)
    const year = ext.year || ''

    return JSON.stringify({
        list: [{
            vod_id: 'kepu_' + year,
            vod_name: '科普中国' + year,
            vod_pic: COVER_IMAGE,
            vod_remarks: '连载中',
            ext: { id: ext.id, year: year }
        }]
    })
}

// ★ 第二步：点进去后，把该年份的文章变成一集一集的剧集
async function getTracks(ext) {
    ext = JSON.parse(ext)
    const targetYear = ext.year || ''
    const baseUrl = `${appConfig.site}/GB/${ext.id}/`

    let tracks = []
    let page = 1
    let hasMore = true
    let stopFetch = false

    while (hasMore && !stopFetch) {
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
                    // 年份匹配就加进剧集列表
                    if (!targetYear || date.startsWith(targetYear)) {
                        tracks.push({
                            name: `【${date}】${title}`,
                            ext: { url: appConfig.site + href }
                        })
                    } else if (targetYear && date) {
                        // 遇到比目标年份更早的文章就停
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

    // 反转，让最新的排在最前面
    tracks.reverse()

    return JSON.stringify({ list: [{ title: '选集', tracks: tracks }] })
}

// ★ 第三步：播放逻辑（保持之前验证过的，确保不黑屏）
async function getPlayinfo(ext) {
    ext = JSON.parse(ext)
    const url = ext.url

    const { data } = await $fetch.get(url, { headers: { 'User-Agent': FETCH_UA } })

    let videoUrl = null

    const patterns = [
        /src:\s*['"]([^'"]+\.mp4)['"]/,
        /<video[^>]+src=["']([^"']+\.mp4)["']/,
        /https?:\/\/video\.people\.cn\/[^\s"'\\]+\.mp4/
    ]

    for (const pattern of patterns) {
        const match = data.match(pattern)
        if (match) {
            videoUrl = match[1] || match[0]
            break
        }
    }

    if (videoUrl) {
        videoUrl = videoUrl.replace(/\\/g, '')
        return JSON.stringify({
            urls: [videoUrl],
            headers: VIDEO_HEADERS
        })
    }

    return JSON.stringify({ urls: [], headers: { 'User-Agent': FETCH_UA } })
}

async function search(ext) {
    return JSON.stringify({ list: [] })
}
