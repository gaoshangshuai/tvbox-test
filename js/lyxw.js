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
        { name: '栏目点播', ext: { id: 'segment' }, ui: 1 }
    ],
};

async function getConfig() { return jsonify(appConfig); }

// ================== 首页 ==================
async function getCards(ext) {
    ext = argsify(ext) || {};
    var pg = ext.pg || ext.page || 1;
    var cards = [];

    if (pg > 1) return jsonify({ list: [] });
    var tabId = ext.id || 'live';

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
    }
    return jsonify({ list: cards, page: pg });
}

// ================== 详情页：并发抓取 + 智能按月份分组 ==================
async function getTracks(ext) {
    ext = argsify(ext) || {};
    
    if (ext.type === 'live') {
        return jsonify({ 
            list: [{ title: '直播', tracks: [{ name: '点击播放', pan: '', ext: { url: ext.url } }] }] 
        });
    } 
    
    if (ext.type === 'segment') {
        const channelId = ext.id;
        const baseUrl = `${SITE}/channel/${channelId}`;
        const cheerio = createCheerio();
        
        // 并发抓取前 50 页
        const maxPagesToFetch = 50; 
        let promises = [];

        for (let page = 1; page <= maxPagesToFetch; page++) {
            const pageUrl = page === 1 ? baseUrl : `${baseUrl}/${page}`;
            
            promises.push((async () => {
                try {
                    const response = await $fetch.get(pageUrl, { headers: HEADERS });
                    const $ = cheerio.load(response.data);
                    let pageTracks = [];
                    
                    $('.video-item').each((i, el) => {
                        const title = $(el).find('.top-title').text().trim();
                        const playUrl = $(el).find('.plainText').text().trim().replace(/\s+/g, "");
                        if (title && playUrl && playUrl.startsWith('http')) {
                            pageTracks.push({ name: title, ext: { url: playUrl } });
                        }
                    });
                    return pageTracks;
                } catch (err) {
                    return []; 
                }
            })());
        }

        const results = await Promise.all(promises);
        let allTracks = [];
        results.forEach(pageTracks => {
            allTracks = allTracks.concat(pageTracks);
        });

        // 去重
        const uniqueTracks = [];
        const seenUrls = new Set();
        allTracks.forEach(t => {
            if (!seenUrls.has(t.ext.url)) {
                seenUrls.add(t.ext.url);
                uniqueTracks.push(t);
            }
        });

        // 【核心修复】增强版日期提取，兼容带横杠和纯数字格式
        const monthGroups = {};

        uniqueTracks.forEach(t => {
            let groupName = "其他往期";
            let year = "", month = "";

            // 尝试匹配 2026-10 格式
            let match1 = t.name.match(/(20\d{2})[-\/](\d{2})/);
            if (match1) {
                year = match1[1];
                month = match1[2];
            } else {
                // 尝试匹配 20261014 这种紧凑格式
                let match2 = t.name.match(/(20\d{2})(\d{2})\d{2}/);
                if (match2) {
                    year = match2[1];
                    month = match2[2];
                }
            }

            if (year && month) {
                groupName = `${year}年${month}月`;
            }

            if (!monthGroups[groupName]) {
                monthGroups[groupName] = [];
            }
            monthGroups[groupName].push(t);
        });

        // 整理结果并按月份倒序排列
        const resultList = [];
        const sortedMonths = Object.keys(monthGroups).filter(k => k !== '其他往期').sort().reverse(); 

        sortedMonths.forEach(month => {
            resultList.push({
                title: month,
                tracks: monthGroups[month]
            });
        });

        // 如果有没匹配出日期的，放在最后
        if (monthGroups['其他往期'] && monthGroups['其他往期'].length > 0) {
            resultList.push({
                title: '其他往期',
                tracks: monthGroups['其他往期']
            });
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
    
    return jsonify({
        urls: [ext.url],
        headers: { 'User-Agent': UA, 'Referer': SITE + '/' },
    });
}

async function search(ext) { return jsonify({ list: [] }); }
