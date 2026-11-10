const cheerio = createCheerio();
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1';

let appConfig = {
    ver: 1,
    title: '233动漫',
    // 默认主域名
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

// 备用域名列表（来自网站底部的防走丢列表）
const backupSites = [
    'https://www.166dm.com',
    'https://www.661dm.com',
    'https://www.acg2day.com',
    'https://www.788dm.com',
    'https://www.jiandandm.com',
    'https://bgm1.cc'
];

async function getConfig() {
    return jsonify(appConfig);
}

// 处理图片：补全协议、去双斜杠
function formatCover(url) {
    if (!url) return '';
    let cover = url.trim();
    if (cover.startsWith('//')) cover = 'https:' + cover;
    if (!/^https?:\/\//i.test(cover)) {
        cover = appConfig.site + (cover.startsWith('/') ? '' : '/') + cover;
    }
    // 去除路径中的双斜杠
    return cover.replace(/([^:])\/{2,}/g, '$1/');
}

function parseCards($, cards) {
    $('a[href*="/anime/"]').each((_, element) => {
        const $a = $(element);
        const href = $a.attr('href');
        // 兼容 title 和内部文本
        const title = $a.attr('title') || $a.find('h4 a').attr('title') || $a.text().trim();
        
        if (!href || !title) return;

        // 抓取原图
        let rawCover = $a.attr('data-original') || $a.attr('data-src');
        if (!rawCover) {
            const style = $a.attr('style');
            if (style) {
                const match = style.match(/url\(['"]?(.*?)['"]?\)/);
                if (match) rawCover = match[1];
            }
        }
        if (!rawCover) {
            const $img = $a.find('img');
            if ($img.length) rawCover = $img.attr('data-original') || $img.attr('data-src') || $img.attr('src');
        }

        const cover = formatCover(rawCover);
        let remark = $a.find('span:last-child b').text().trim();

        // 去重
        let card = cards.find(c => c.vod_id === href);
        if (!card) {
            cards.push({
                vod_id: href,
                vod_name: title,
                vod_pic: cover,
                vod_remarks: remark,
                ext: { url: `${appConfig.site}${href}` }
            });
        } else {
            if (!card.vod_pic && cover) card.vod_pic = cover;
            if (!card.vod_remarks && remark) card.vod_remarks = remark;
        }
    });
    return cards;
}

async function getCards(ext) {
    ext = argsify(ext);
    let { id, page = 1 } = ext;
    let cards = [];

    // 构建测试列表：把主域名放最前面
    const testSites = [appConfig.site, ...backupSites];
    let success = false;

    // 遍历所有域名，直到成功找到包含动漫数据的网页
    for (let i = 0; i < testSites.length; i++) {
        let site = testSites[i];
        let url = page === 1 ? `${site}/type/${id}.html` : `${site}/type/${id}-${page}.html`;
        
        try {
            let res = await $fetch.get(url, { 
                headers: { 'User-Agent': UA, 'Referer': site + '/' },
                timeout: 5000 // 5秒超时，防止卡死
            });
            
            let data = res.data;
            
            // 如果返回的网页太短（比如反诈页面），或者没有 anime 标签，就跳过换下一个
            if (data.length > 5000 && data.includes('/anime/')) {
                const $ = cheerio.load(data);
                let testCards = parseCards($, []);
                
                // 如果真的解析出卡片了，说明这个域名完美可用！
                if (testCards.length > 0) {
                    appConfig.site = site; // 把当前可用域名存下来
                    cards = testCards;
                    success = true;
                    break; // 跳出循环
                }
            }
        } catch (e) {
            // 如果请求报错（SSL错误、连不上等），直接尝试下一个
            continue;
        }
    }

    // 如果所有域名全挂了，返回一个提示卡片
    if (!success) {
        return jsonify({ list: [{ 
            vod_id: "err", 
            vod_name: "所有域名均被拦截或失效", 
            vod_pic: "", 
            vod_remarks: "运营商网络问题", 
            ext: { url: "" } 
        }] });
    }

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
        if (rawText && lineId) lines.push({ name: rawText, lineId: lineId });
    });
    
    for (const line of lines) {
        let tracks = [];
        const container = $(`#playlist${line.lineId}`);
        container.find('a').each((_, el) => {
            const href = $(el).attr('href');
            const text = $(el).text().trim();
            if (href && text && !tracks.some(t => t.ext.url.endsWith(href))) {
                // 注意：这里的播放链接必须基于当前成功的 appConfig.site
                tracks.push({ name: text, pan: '', ext: { url: href.startsWith('http') ? href : `${appConfig.site}${href}` } });
            }
        });
        if (tracks.length > 0) groups.push({ title: line.name, tracks: tracks });
    }
    
    if (groups.length === 0) {
        let tracks = [];
        $('a[href*="/play/"]').each((_, el) => {
            const href = $(el).attr('href');
            const text = $(el).text().trim();
            if (href && text && !tracks.some(t => t.ext.url.endsWith(href))) {
                tracks.push({ name: text, pan: '', ext: { url: href.startsWith('http') ? href : `${appConfig.site}${href}` } });
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
    let isSniffing = false;

    try {
        const { data } = await $fetch.get(url, { headers: { 'User-Agent': UA, 'Referer': appConfig.site + '/' } });

        const directMatch = data.match(/https?:\/\/[^\s"'<>]+\.(?:m3u8|mp4)[^\s"'<>]*/i);
        if (directMatch && !directMatch[0].includes('tiktokcdn')) {
            playUrl = directMatch[0];
        }

        if (!playUrl) {
            const configMatch = data.match(/player_aaaa\s*=\s*({[\s\S]*?})\s*;?\s*<\/script>/);
            if (configMatch) {
                let jsonStr = configMatch[1].replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":');
                try {
                    const playerData = JSON.parse(jsonStr);
                    let vid = playerData.url || '';
                    if (vid.startsWith('%')) vid = decodeURIComponent(vid);
                    if (vid.includes('=') && !vid.startsWith('http')) vid = atob(vid);
                    
                    if (vid && !vid.startsWith('http')) {
                        playUrl = `https://art.v2player.top:8989/player/?url=${encodeURIComponent(vid)}&next=${encodeURIComponent(url)}&nid=1&h=${encodeURIComponent(appConfig.site)}`;
                        isSniffing = true;
                    } else if (vid.startsWith('http')) {
                        playUrl = vid;
                    }
                } catch (e) {}
            }
        }

        if (!playUrl) {
            playUrl = url;
            isSniffing = true;
        }

        if (playUrl) {
            return jsonify({ 
                urls: [playUrl], 
                headers: { 'User-Agent': UA, 'Referer': appConfig.site },
                extra: { sniff: isSniffing, ua: UA }
            });
        }
    } catch (err) {
        $print(`[233dm] Error: ${err.message}`);
    }
    return jsonify({ urls: [] });
}

async function search(ext) {
    ext = argsify(ext);
    let cards = [];
    let text = encodeURIComponent(ext.text);
    
    // 搜索也应用备用域名容错
    const testSites = [appConfig.site, ...backupSites];
    
    for (let site of testSites) {
        const url = `${site}/search/-------------.html?wd=${text}`;
        try {
            const { data } = await $fetch.get(url, { headers: { 'User-Agent': UA }, timeout: 5000 });
            if (data.length > 5000 && data.includes('/anime/')) {
                const $ = cheerio.load(data);
                let testCards = parseCards($, []);
                if (testCards.length > 0) {
                    appConfig.site = site;
                    cards = testCards;
                    break;
                }
            }
        } catch (e) {
            continue;
        }
    }
    
    return jsonify({ list: cards });
}
