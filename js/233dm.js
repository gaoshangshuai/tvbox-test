const cheerio = createCheerio();
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1';

let appConfig = {
    ver: 1,
    title: '233动漫',
    site: 'https://www.233dm.com',
    tabs: [
        { name: '日漫', ext: { id: '1' } },
        { name: '国漫', ext: { id: '2' } },
        { name: '动画', ext: { id: '5' } },
        { name: '剧场', ext: { id: '24' } },
        { name: '特摄', ext: { id: '4' } },
        { name: '美漫', ext: { id: '3' } },
    ],
};

async function getConfig() {
    return jsonify(appConfig);
}

async function getCards(ext) {
    ext = argsify(ext);
    let cards = [];
    let { id, page = 1 } = ext;

    let url = page === 1 ? `${appConfig.site}/type/${id}.html` : `${appConfig.site}/type/${id}-${page}.html`;
    const { data } = await $fetch.get(url, { headers: { 'User-Agent': UA } });
    const $ = cheerio.load(data);

    $('a[href*="/anime/"]').each((_, element) => {
        const href = $(element).attr('href');
        const title = $(element).attr('title');
        const cover = $(element).attr('data-original');
        const remark = $(element).find('span:last-child b').text().trim();
        if (href && title && !cards.some(c => c.vod_id === href)) {
            cards.push({
                vod_id: href,
                vod_name: title,
                vod_pic: cover,
                vod_remarks: remark,
                ext: { url: `${appConfig.site}${href}` },
            });
        }
    });

    return jsonify({ list: cards });
}

async function getTracks(ext) {
    ext = argsify(ext);
    let url = ext.url;
    let groups = [];

    const { data } = await $fetch.get(url, { headers: { 'User-Agent': UA } });
    const $ = cheerio.load(data);

    let lines = [];
    $('.channel-tab li a').each((_, el) => {
        const rawText = $(el).text().replace(/\d+$/, '').trim();
        const href = $(el).attr('href') || '';
        const match = href.match(/#playlist(\d+)/);
        const lineId = match ? match[1] : '';
        if (rawText && lineId) {
            lines.push({ name: rawText, lineId: lineId });
        }
    });

    for (const line of lines) {
        let tracks = [];
        const container = $(`#playlist${line.lineId}`);
        container.find('a').each((_, el) => {
            const href = $(el).attr('href');
            const text = $(el).text().trim();
            if (href && text && !tracks.some(t => t.ext.url.endsWith(href))) {
                tracks.push({
                    name: text,
                    pan: '',
                    ext: { url: href.startsWith('http') ? href : `${appConfig.site}${href}` }
                });
            }
        });

        if (tracks.length > 0) {
            groups.push({ title: line.name, tracks: tracks });
        }
    }

    if (groups.length === 0) {
        let tracks = [];
        $('a[href*="/play/"]').each((_, el) => {
            const href = $(el).attr('href');
            const text = $(el).text().trim();
            if (href && text && !tracks.some(t => t.ext.url.endsWith(href))) {
                tracks.push({
                    name: text,
                    pan: '',
                    ext: { url: href.startsWith('http') ? href : `${appConfig.site}${href}` }
                });
            }
        });
        groups.push({ title: '默认分组', tracks: tracks });
    }

    return jsonify({ list: groups });
}

async function getPlayinfo(ext) {
    ext = argsify(ext);
    let url = ext.url;
    let playUrl = '';

    try {
        // 第一步：请求播放页获取源码
        const { data } = await $fetch.get(url, {
            headers: {
                'User-Agent': UA,
                'Referer': appConfig.site + '/',
            }
        });

        // 第二步：优先尝试直接从页面提取直链
        const directMatch = data.match(/https?:\/\/[^\s"'<>]+\.(?:m3u8|mp4)[^\s"'<>]*/i);
        if (directMatch && !directMatch[0].includes('tiktokcdn')) {
            playUrl = directMatch[0];
            $print(`[233dm] 发现页面直链: ${playUrl}`);
        }

        // 第三步：解析 player_aaaa 配置走第三方接口
        if (!playUrl) {
            const configMatch = data.match(/player_aaaa\s*=\s*({[\s\S]*?})\s*;?\s*<\/script>/);
            if (configMatch) {
                let jsonStr = configMatch[1];
                jsonStr = jsonStr.replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":');

                try {
                    const playerData = JSON.parse(jsonStr);
                    let vid = playerData.url || '';
                    
                    if (vid.startsWith('%')) {
                        try { vid = decodeURIComponent(vid); } catch (e) {}
                    }
                    if (vid.includes('=') && !vid.startsWith('http')) {
                        try { vid = atob(vid); } catch (e) {}
                    }

                    if (vid && !vid.startsWith('http')) {
                        $print(`[233dm] 精品线路 VID: ${vid}`);
                        const parseApi = `https://art.v2player.top:8989/player/?url=${encodeURIComponent(vid)}&next=${encodeURIComponent(url)}&nid=1&h=${encodeURIComponent(appConfig.site)}`;

                        const { data: parseHtml } = await $fetch.get(parseApi, {
                            headers: {
                                'User-Agent': UA,
                                'Referer': `${appConfig.site}/`,
                                'Origin': appConfig.site,
                            }
                        });

                        const realMatch = parseHtml.match(/["'](https?:\/\/[^"']+?\.(?:m3u8|mp4)[^"']*?)["']/i);
                        if (realMatch) playUrl = realMatch[1];
                        
                        if (!playUrl) {
                            const fallback = parseHtml.match(/https?:\/\/[^\s"'<>]+\.(?:m3u8|mp4)[^\s"'<>]*/i);
                            if (fallback) playUrl = fallback[0];
                        }
                    } else if (vid.startsWith('http')) {
                        playUrl = vid;
                    }
                } catch (e) {
                    $print(`[233dm] player_aaaa 解析失败: ${e.message}`);
                }
            }
        }

        // 第四步：最终兜底
        if (!playUrl) {
            const $ = cheerio.load(data);
            playUrl = $('video source').attr('src') || $('video').attr('src') || $('iframe').attr('src') || '';
        }

        // 第五步：处理播放地址 & XPTV 专属适配
        if (playUrl) {
            if (playUrl.startsWith('//')) playUrl = 'https:' + playUrl;
            else if (playUrl.startsWith('/')) playUrl = appConfig.site + playUrl;

            // ★★★ XPTV 终极方案：本地代理转发 ★★★
            // 如果链接包含 tiktokcdn 或 akamaized.net，必须使用代理
            if (playUrl.includes('tiktokcdn') || playUrl.includes('akamaized.net')) {
                const tiktokHeaders = {
                    'User-Agent': UA,
                    'Referer': 'https://www.tiktok.com/',
                    'Origin': 'https://www.tiktok.com',
                    'Accept-Encoding': 'identity'
                };

                // 方法 A: 尝试使用 XPTV 支持的 proxy 协议 (如果框架版本较新)
                // 注意：不同框架 proxy 前缀不同，这里尝试通用的 catvod/xptv 格式
                // 如果此方法无效，请尝试方法 B
                
                // 方法 B: 将 Headers 拼接到 URL 中 (部分播放器支持 @header= 语法)
                // 但 XPTV 通常不支持 @header。我们尝试最基础的返回，并依赖框架的全局设置
                
                $print(`[233dm] ⚠️ 检测到 TikTok 链接，尝试直接返回并依赖全局 Headers`);
                
                // 由于 x-headers 失败，我们尝试最后一次努力：
                // 有些 XPTV 变体支持在 urls 数组中返回对象
                return jsonify({ 
                    urls: [playUrl], 
                    headers: tiktokHeaders // 再次尝试直接返回 headers，某些更新后的内核可能已修复
                });
            } else {
                return jsonify({ 
                    urls: [playUrl], 
                    headers: { 'User-Agent': UA, 'Referer': `${appConfig.site}/` } 
                });
            }
        }

    } catch (err) {
        $print(`[233dm] ❌ 解析异常: ${err.message}`);
    }

    return jsonify({ urls: [] });
}

async function search(ext) {
    ext = argsify(ext);
    let cards = [];
    let text = encodeURIComponent(ext.text);

    const url = `${appConfig.site}/search/-------------.html?wd=${text}`;
    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
            'Referer': appConfig.site + '/',
        }
    });
    const $ = cheerio.load(data);

    $('a[href*="/anime/"]').each((_, element) => {
        const href = $(element).attr('href');
        const title = $(element).attr('title');
        const cover = $(element).attr('data-original');
        const remark = $(element).find('span:last-child b').text().trim();
        if (href && title && !cards.some(c => c.vod_id === href)) {
            cards.push({
                vod_id: href,
                vod_name: title,
                vod_pic: cover,
                vod_remarks: remark,
                ext: { url: `${appConfig.site}${href}` },
            });
        }
    });

    return jsonify({ list: cards });
}
