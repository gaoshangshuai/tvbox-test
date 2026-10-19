const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1';
const SITE = 'https://www.lytv.com.cn';
const HEADERS = {
    'User-Agent': UA,
    Referer: SITE + '/'
};

// ================== 1. 直播海报 ==================
const IMG_NEWS = "http://tv.haoqu99.com/d/file/2016/1016/ff9d6c28b4d33f8e2307c6e0948dbd61.jpg";
const IMG_SCI = "http://tv.haoqu99.com/d/file/2016/1016/b744c5bdeba1e543025a28d0d95aaa1f.jpg";
const IMG_CULT = "http://tv.haoqu99.com/d/file/2016/1016/8de48449ec75d1b2f1023a6efab52aa8.jpg";

// ================== 2. 点播海报 ==================
const IMG_VOD_1 = "https://static.lytv.com.cn/upload/lytvcms/2026/10/16/RcLZo2pVhPOVTGYK.png";
const IMG_VOD_2 = "https://static.lytv.com.cn/upload/lytvcms/2026/10/15/4kOVp6maJFPjL7ji.jpg";

// ================== 数据定义 ==================
const LIVE_CHANNELS = [
    { name: "洛阳新闻综合", url: "https://live.lytv.com.cn/live/LYTV1.m3u8", pic: IMG_NEWS },
    { name: "洛阳科教频道", url: "https://live.lytv.com.cn/live/LYTV2.m3u8", pic: IMG_SCI },
    { name: "洛阳文旅频道", url: "https://live.lytv.com.cn/live/LYTV3.m3u8", pic: IMG_CULT }
];

const SEGMENT_VODS = [
    { name: "洛阳新闻联播", id: "lyxwlb", pic: IMG_VOD_1 },
    { name: "行风热线", id: "hfrxeSU3", pic: IMG_VOD_2 }
];

// ================== 应用配置 ==================
var appConfig = {
    ver: 1,
    title: '洛阳广播电视台',
    site: SITE,
    ext: {
        "landscape": true,
        "isLandscape": true
    },
    tabs: [
        { name: '电视直播', ext: { id: 'live' }, ui: 1 },
        { name: '栏目点播', ext: { id: 'segment' }, ui: 1 },
        { name: '视频点播', ext: { id: 'shortplay' }, ui: 1 }
    ],
};

async function getConfig() { return jsonify(appConfig); }

// ================== 首页 ==================
async function getCards(ext) {
    ext = argsify(ext) || {};
    var pg = ext.pg || ext.page || 1;
    var cards = [];
    var tabId = ext.id || 'live';

    // 所有 Tab 仅展示第一页（视频点播全量合并）
    if (pg > 1) return jsonify({ list: [] });

    if (tabId === 'live') {
        for (var i = 0; i < LIVE_CHANNELS.length; i++) {
            var ch = LIVE_CHANNELS[i];
            cards.push({
                vod_id: 'live_' + i,
                vod_name: ch.name,
                vod_pic: ch.pic,
                vod_remarks: '直播中',
                style: { type: "rect", ratio: 1.777 },
                ext: { type: 'live', url: ch.url }
            });
        }
    } else if (tabId === 'segment') {
        for (var j = 0; j < SEGMENT_VODS.length; j++) {
            var v = SEGMENT_VODS[j];
            cards.push({
                vod_id: 'seg_' + j,
                vod_name: v.name,
                vod_pic: v.pic,
                vod_remarks: '栏目点播',
                style: { type: "rect", ratio: 1.777 },
                ext: { type: 'segment', id: v.id }
            });
        }
    } else if (tabId === 'shortplay') {
        // ===== 视频点播 Tab：并发抓取短剧、纪录片、综艺的真实内容 =====
        const cheerio = createCheerio();
        const urls = [
            `${SITE}/channel/shortplay`,  // 短剧内容
            `${SITE}/channel/jilupian`,   // 纪录片内容
            `${SITE}/channel/zy`          // 综艺内容
        ];

        let promises = urls.map(url => (async () => {
            try {
                const response = await $fetch.get(url, { headers: HEADERS });
                const $ = cheerio.load(response.data);
                let pageCards = [];
                
                // 只提取 col-lg-4（具体视频卡片），不提取 col-lg-2（分类按钮）
                $('a.col-lg-4').each((i, el) => {
                    const href = ($(el).attr('href') || '').trim();
                    const name = $(el).find('.top-title').text().trim();
                    const pic = $(el).find('img').attr('src') || '';

                    if (name && href.indexOf('/channel/') !== -1) {
                        let cid = href.split('/channel/')[1] || '';
                        cid = cid.split('?')[0].split('/')[0];
                        
                        pageCards.push({
                            vod_id: 'sp_' + cid, // 用路径ID去重
                            vod_name: name,
                            vod_pic: pic,
                            vod_remarks: '视频点播',
                            style: { type: "rect", ratio: 1.777 },
                            ext: { type: 'channel', id: cid }
                        });
                    }
                });
                return pageCards;
            } catch (e) {
                return [];
            }
        })());

        const results = await Promise.all(promises);
        const seen = new Set();
        results.forEach(arr => {
            arr.forEach(c => {
                if (!seen.has(c.vod_id)) {
                    seen.add(c.vod_id);
                    cards.push(c);
                }
            });
        });
    }

    return jsonify({ list: cards, page: pg });
}

// ================== 详情页 ==================
async function getTracks(ext) {
    ext = argsify(ext) || {};
    
    if (ext.type === 'live') {
        return jsonify({ 
            list: [{ title: '直播', tracks: [{ name: '点击播放', pan: '', ext: { url: ext.url } }] }] 
        });
    } 
    
    if (ext.type === 'segment' || ext.type === 'channel') {
        const channelId = ext.id;
        const baseUrl = `${SITE}/channel/${channelId}`;
        const cheerio = createCheerio();
        
        let allTracks = [];
        
        try {
            // 先抓第一页
            const firstRes = await $fetch.get(baseUrl, { headers: HEADERS });
            const firstHtml = firstRes.data;
            const $first = cheerio.load(firstHtml);
            
            // 解析最大页码
            let maxPage = 1;
            $first('.pagination a.page-link').each((i, el) => {
                const text = $first(el).text().trim();
                const num = parseInt(text);
                if (!isNaN(num) && num > maxPage) maxPage = num;
                const href = $first(el).attr('href');
                if (href) {
                    const match = href.match(/\/(\d+)$/);
                    if (match) {
                        const p = parseInt(match[1]);
                        if (p > maxPage) maxPage = p;
                    }
                }
            });
            
            maxPage = Math.min(maxPage, 50); // 限制并发
            
            let promises = [];
            for (let page = 1; page <= maxPage; page++) {
                const pageUrl = page === 1 ? baseUrl : `${baseUrl}/${page}`;
                
                promises.push((async () => {
                    try {
                        let html = '';
                        if (page === 1) {
                            html = firstHtml;
                        } else {
                            const res = await $fetch.get(pageUrl, { headers: HEADERS });
                            html = res.data;
                        }
                        
                        const $ = cheerio.load(html);
                        let pageTracks = [];
                        
                        // 1. 提取常规 video-item 列表
                        $('.video-item').each((i, el) => {
                            const title = $(el).find('.top-title').text().trim();
                            let playUrl = $(el).find('.plainText').text().trim().replace(/\s+/g, "");
                            
                            if (!playUrl) {
                                playUrl = $(el).find('a').attr('data-url') || $(el).find('a').attr('href') || $(el).attr('data-url') || "";
                            }
                            
                            if (playUrl && !playUrl.startsWith('http') && (playUrl.includes('.m3u8') || playUrl.includes('.mp4'))) {
                                if (playUrl.startsWith('//')) playUrl = 'https:' + playUrl;
                                else if (playUrl.startsWith('/')) playUrl = SITE + playUrl;
                            }
    
                            if (title && playUrl && (playUrl.includes('.m3u8') || playUrl.includes('.mp4'))) {
                                pageTracks.push({ name: title, ext: { url: playUrl } });
                            }
                        });
                        
                        // 2. 正则兜底提取（防止页面结构改变导致解析失败）
                        if (pageTracks.length === 0) {
                            const regex = /https?:\/\/[^\s"'<>\\]+\.(m3u8|mp4)/g;
                            const matches = html.match(regex);
                            if (matches) {
                                const uniqueMatches = [...new Set(matches)];
                                uniqueMatches.forEach((url, idx) => {
                                    pageTracks.push({ name: `视频 ${idx + 1}`, ext: { url: url } });
                                });
                            }
                        }
                        
                        return pageTracks;
                    } catch (err) {
                        return [];
                    }
                })());
            }
            
            const results = await Promise.all(promises);
            results.forEach(pageTracks => {
                allTracks = allTracks.concat(pageTracks);
            });
        } catch (e) {
            return jsonify({ list: [{ title: '列表', tracks: [{ name: '获取失败', pan: '', ext: { url: '' } }] }] });
        }

        // 去重
        const uniqueTracks = [];
        const seenUrls = new Set();
        allTracks.forEach(t => {
            if (!seenUrls.has(t.ext.url)) {
                seenUrls.add(t.ext.url);
                uniqueTracks.push(t);
            }
        });

        // 日期分组
        const monthGroups = {};
        uniqueTracks.forEach(t => {
            let groupName = "其他往期";
            let year = "", month = "";

            let match1 = t.name.match(/(20\d{2})[-\/](\d{2})/);
            if (match1) {
                year = match1[1];
                month = match1[2];
            } else {
                let match2 = t.name.match(/(20\d{2})(\d{2})\d{2}/);
                if (match2) {
                    year = match2[1];
                    month = match2[2];
                }
            }

            if (year && month) groupName = `${year}年${month}月`;
            if (!monthGroups[groupName]) monthGroups[groupName] = [];
            monthGroups[groupName].push(t);
        });

        // 整理并排序
        const resultList = [];
        const sortedMonths = Object.keys(monthGroups).filter(k => k !== '其他往期').sort().reverse(); 

        sortedMonths.forEach(month => {
            resultList.push({ title: month, tracks: monthGroups[month] });
        });

        if (monthGroups['其他往期'] && monthGroups['其他往期'].length > 0) {
            resultList.push({ title: '其他往期', tracks: monthGroups['其他往期'] });
        }

        if (resultList.length > 0) {
            return jsonify({ list: resultList });
        }
    }

    return jsonify({ list: [{ title: '列表', tracks: [{ name: '暂无内容', pan: '', ext: { url: '' } }] }] });
}

// ================== 播放信息 ==================
async function getPlayinfo(ext) {
    ext = argsify(ext) || {};
    if (!ext.url) return jsonify({ urls: [] });
    
    // 必须带上 Referer，否则 m3u8 的 ts 切片文件会 403
    return jsonify({
        urls: [ext.url],
        headers: { 
            'User-Agent': UA, 
            'Referer': SITE + '/' 
        },
    });
}

async function search(ext) { return jsonify({ list: [] }); }
