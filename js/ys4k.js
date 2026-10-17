const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'

let $config = argsify($config_str)
let appConfig = {
    ver: 1,
    title: '央视4K',
    site: $config.site || 'https://tv.cctv.com',
    tabs: [
        { name: '电视剧', ext: { id: 'tv' } },
        { name: '纪录片', ext: { id: 'doc' } },
        { name: '特别节目', ext: { id: 'other' } }
    ],
}
const CID_4K = 'CHAL1558416868484111'
const SERVICE_ID = 'cctv4k'
const REFERER = 'https://tv.cctv.com/'

async function getConfig() {
    return JSON.stringify(appConfig)
}

// ================== 列表 ==================
async function getCards(ext) {
    ext = JSON.parse(ext)
    let cards = []
    // 如果播放器支持翻页，会传 page，否则默认1
    const page = ext.page || 1
    const currentTab = ext.id || 'tv'

    // ★ 核心修改：将 n 从 30 扩大到 100，一次性拉取更多内容
    const url = `https://api.cntv.cn/NewVideo/getLastVideoList4K?serviceId=${SERVICE_ID}&cid=${CID_4K}&p=${page}&n=100&t=jsonp&cb=Callback`
    
    try {
        const { data } = await $fetch.get(url, { headers: getHeader() })
        const json = JSON.parse(data.replace(/^[^(]*\(/, '').replace(/\)\s*;?\s*$/, ''))
        
        if (!json || !json.data || !json.data.list) {
            return JSON.stringify({ list: [] })
        }

        json.data.list.forEach((item) => {
            try {
                const video = item.last_video || {}
                // 严格防崩溃：没有 id 的直接跳过
                if (!item.id && !video.id) return
                
                const name = (item.title || video.title || '').replace(/\s*4K\s*$/i, '').trim()
                if (!name) return

                const text = ((item.fc || '') + name + (video.title || '')).toLowerCase()

                // 1. 识别纪录片
                const docKeywords = ['纪录', '纪实', '探索', '发现', '人文', '自然', '历史', '科普', '地理', '档案', '风云', '大国', '重生', '长征', '航拍', '传记', '经典']
                const isDoc = docKeywords.some(k => text.includes(k))

                // 2. 识别其他类
                const otherKeywords = ['动画', '动漫', '少儿', '综艺', '晚会', '盛典', '访谈', '特别节目', '微电影', '音乐', '公开课', '体育', '新闻', '农业']
                const isOther = otherKeywords.some(k => text.includes(k))

                // 3. 分类匹配
                let matchTab = false
                if (currentTab === 'doc') {
                    matchTab = isDoc
                } else if (currentTab === 'other') {
                    matchTab = isOther
                } else if (currentTab === 'tv') {
                    matchTab = !isDoc && !isOther
                }

                if (matchTab) {
                    cards.push({
                        vod_id: item.id || video.id,
                        vod_name: name,
                        vod_pic: video.image || item.image || '',
                        vod_remarks: item.fc || '',
                        vod_duration: item.ep_count ? `共${item.ep_count}集` : '',
                        ext: {
                            id: item.id || '',
                            ep_count: parseInt(item.ep_count) || 1,
                            last_guid: video.guid || '',
                            last_url: video.url || '',
                            last_title: video.title || '',
                            url: video.url || ''
                        },
                    })
                }
            } catch (err) {
                // 单个节目报错不影响整体加载
            }
        })
    } catch (e) {}

    return JSON.stringify({ list: cards })
}

// ================== 剧集列表 ==================
async function getTracks(ext) {
    ext = JSON.parse(ext)
    let tracks = []

    if (ext.id) {
        const url = `https://api.cntv.cn/NewVideo/getVideoListByAlbumIdNew?id=${ext.id}&serviceId=${SERVICE_ID}&p=1&n=1000&sort=asc&t=jsonp&cb=Callback`
        try {
            const { data } = await $fetch.get(url, { headers: getHeader() })
            const json = JSON.parse(data.replace(/^[^(]*\(/, '').replace(/\)\s*;?\s*$/, ''))
            const list = (json.data && json.data.list) || []
            list.forEach((e, i) => {
                const g = e.guid || e.videoCenterId || e.pid || ''
                if (g) {
                    tracks.push({
                        name: e.title || `第${i + 1}集`,
                        ext: { guid: g, url: e.url, title: e.title },
                    })
                }
            })
        } catch (e) {}
    }

    if (tracks.length <= 1 && ext.url) {
        try {
            const { data: html } = await $fetch.get(ext.url, { headers: getHeader() })
            const listMatch = html.match(/<ul\s+id="prolist"[^>]*>([\s\S]*?)<\/ul>/i)
            
            if (listMatch) {
                const liRegex = /<a\s+href="([^"]+)"[^>]*title="([^"]+)"[^>]*>/gi
                let match
                let tempTracks = []
                while ((match = liRegex.exec(listMatch[1])) !== null) {
                    let link = match[1]
                    let title = match[2]
                    if (link.startsWith('//')) link = 'https:' + link
                    let guidMatch = link.match(/(VIDE[a-zA-Z0-9]+)\.shtml/)
                    let guid = guidMatch ? guidMatch[1] : link
                    tempTracks.push({
                        name: title,
                        ext: { guid: guid, url: link, title: title },
                    })
                }
                if (tempTracks.length > 0) {
                    tracks = tempTracks
                }
            }
        } catch (e) {}
    }

    if (tracks.length === 0 && ext.last_guid) {
        tracks.push({
            name: ext.last_title || '超清 4K',
            ext: { guid: ext.last_guid, url: ext.last_url, title: ext.last_title },
        })
    }
    
    return JSON.stringify({ list: [{ title: '默认分组', tracks }] })
}

// ================== 播放地址 ==================
async function getPlayinfo(ext) {
    ext = JSON.parse(ext)
    const { guid, url } = ext
    const urls = []
    const seen = new Set()

    const add = (u) => {
        if (!u || typeof u !== 'string') return
        let raw = u.replace(/\\\//g, '/').replace(/\\/g, '')
        if (!raw.startsWith('http')) return
        if (/\.v\.cntv\.cn\/asp\/h5e\/hls\//i.test(raw)) {
            raw = raw.replace(
                /\/\/[^\/]+\.v\.cntv\.cn\/asp\/h5e\/hls\//i,
                '//hls.cntv.lxdns.com/asp/hls/'
            )
        }
        if (!seen.has(raw)) {
            seen.add(raw)
            urls.push(raw)
        }
    }

    if (guid && guid.length === 32) {
        add(`https://hls.cntv.lxdns.com/asp/hls/4000/0303000a/3/default/${guid}/4000.m3u8`)
        add(`https://hls.cntv.lxdns.com/asp/hls/2000/0303000a/3/default/${guid}/2000.m3u8`)
        add(`https://hls.cntv.lxdns.com/asp/hls/1200/0303000a/3/default/${guid}/1200.m3u8`)
    }

    if (guid) {
        try {
            const apiUrl = `https://vdn.apps.cntv.cn/api/getHttpVideoInfo.do?pid=${guid}`
            const { data } = await $fetch.get(apiUrl, { headers: getHeader() })
            const str = typeof data === 'string' ? data : JSON.stringify(data)
            const found = str.match(/https?:\\?\/\\?\/[^"'\s]+?\.m3u8/gi) || []
            found.forEach(add)
        } catch (e) {}
    }

    if (url) {
        try {
            const { data: html } = await $fetch.get(url, { headers: { 'User-Agent': UA, Referer: REFERER } })
            const found = html.match(/https?:\\?\/\\?\/[^"'\s]+?\.m3u8/gi) || []
            found.forEach(add)
        } catch (e) {}
    }

    return JSON.stringify({ urls })
}

// ================== 搜索 ==================
async function search(ext) {
    ext = JSON.parse(ext)
    const cards = []
    const text = ext.text
    const page = ext.page || 1
    const url = `https://search.cctv.com/search.php?qtext=${encodeURIComponent(text)}&type=video&sort=relevance&page=${page}`
    const { data: html } = await $fetch.get(url, { headers: { 'User-Agent': UA, Referer: REFERER } })
    const blocks = html.split(/<li[\s>]/i).slice(1)
    blocks.forEach((block) => {
        const m = block.match(/href="([^"]+\.shtml)"/i)
        if (!m) return
        let vUrl = m[1]
        if (vUrl.startsWith('//')) vUrl = 'https:' + vUrl
        if (!/^https?:/.test(vUrl)) vUrl = 'https://tv.cctv.com' + vUrl
        const t = block.match(/<a[^>]*title="([^"]+)"/i)
        if (!t) return
        const im = block.match(/<img[^>]*src="([^"]+)"/i)
        let pic = im ? im[1] : ''
        if (pic.startsWith('//')) pic = 'https:' + pic
        const idm = vUrl.match(/(VIDE[a-zA-Z0-9]+)\.shtml/)
        const vid = idm ? idm[1] : vUrl
        cards.push({
            vod_id: vid,
            vod_name: t[1].replace(/<[^>]+>/g, '').trim(),
            vod_pic: pic,
            vod_remarks: '',
            ext: { 
                id: vid, 
                url: vUrl,
                last_guid: vid,
                last_url: vUrl,
                last_title: t[1]
            },
        })
    })
    return JSON.stringify({ list: cards })
}

function getHeader() {
    return { 'User-Agent': UA, Referer: REFERER, Accept: '*/*', 'Accept-Language': 'zh-CN,zh;q=0.9' }
}
