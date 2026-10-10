// 河北广播电视台 “冀时新闻” TVBox源（静态分类 + 最高画质 + 修正封面 + 统一接口）
// 数据源：https://console.cmc.hebtv.com / https://api.cmc.hebrts.cn

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';
const PAGE_SIZE = 10;

let appConfig = {
    ver: 1,
    title: '河北广播电视台',
    site: 'https://console.cmc.hebtv.com',
    tabs: [
        { name: '大汉中山', ext: { id: '35920', apiType: 'getArticleList' } },
        { name: '磁州窑', ext: { id: '38626', apiType: 'getArticleList' } },
        { name: '嘿，这就是诗经', ext: { id: '38256', apiType: 'getArticleList' } },
        { name: '雄安红色往事', ext: { id: '33326', apiType: 'getArticleList' } },
        { name: '穿越经典之行走美丽河北', ext: { id: '35399', apiType: 'getArticleList' } },
        { name: '燕赵传奇·成语故事', ext: { id: '35813', apiType: 'getArticleList' } },
        { name: '行走的博物馆', ext: { id: '35914', apiType: 'getArticleList' } },
        { name: '万里长城', ext: { id: '35396', apiType: 'getArticleList' } },
        { name: '穿越经典之揭秘清陵', ext: { id: '35496', apiType: 'getArticleList' } },
        { name: '铭记', ext: { id: '35403', apiType: 'getArticleList' } },
        // 修复：王厝时代也改用 getArticleList 接口，不再单独走 findPage
        { name: '王厝时代', ext: { id: '33265', apiType: 'getArticleList' } }
    ]
};

async function getConfig() {
    return JSON.stringify(appConfig);
}

// ---------- 获取列表 ----------
async function getCards(ext) {
    ext = JSON.parse(ext);
    let catalogId = ext.id;
    let page = ext.page || 1;
    let apiType = ext.apiType || 'getArticleList';

    const headers = {
        'User-Agent': UA,
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Origin': 'https://web.cmc.hebrts.cn',
        'Referer': 'https://web.cmc.hebrts.cn/'
    };

    // 统一走 getArticleList 接口（去掉了 findPage 分支）
    let apiUrl = `https://console.cmc.hebtv.com/scms/api/com/article/getArticleList?siteId=1&catalogId=${catalogId}&page=${page}&pageSize=${PAGE_SIZE}`;

    let list = [];
    try {
        const { data } = await $fetch.get(apiUrl, { headers });
        const json = typeof data === 'string' ? JSON.parse(data) : data;

        // 兼容不同的数据格式
        let items = (json.returnData && json.returnData.news) || [];
        if (items.length === 0 && json.data && json.data.pageRecords) {
            items = json.data.pageRecords;
        }
        if (items.length === 0 && json.data && json.data.news) {
            items = json.data.news;
        }

        list = items.map(item => {
            let playUrl = '';
            let vod_pic = '';

            // ---------- 封面提取：优先 pic 域名，避免防盗链 ----------
            if (item.appCustomParams) {
                try {
                    const params = typeof item.appCustomParams === 'string'
                        ? JSON.parse(item.appCustomParams)
                        : item.appCustomParams;
                    if (params.customStyle && params.customStyle.imgPath && params.customStyle.imgPath[0]) {
                        vod_pic = params.customStyle.imgPath[0];
                    }
                } catch (e) {}
            }
            if (!vod_pic && item.video && item.video[0] && item.video[0].poster) {
                vod_pic = item.video[0].poster;
            }
            if (!vod_pic && item.logo) {
                vod_pic = item.logo;
            }
            if (vod_pic && vod_pic.includes('web.cmc.hebrts.cn')) {
                vod_pic = vod_pic.replace('web.cmc.hebrts.cn', 'pic.cmc.hebrts.cn');
            }

            // ---------- 播放地址：最高画质 ----------
            const video = (item.video && item.video[0]) || {};
            const formats = video.formats || [];
            if (formats.length > 0) {
                const getWeight = (f) => {
                    const title = (f.title || '').toLowerCase();
                    const url = (f.url || '').toLowerCase();
                    if (title.includes('超清') || url.includes('1080')) return 3;
                    if (title.includes('高清') || url.includes('720')) return 2;
                    if (title.includes('标清') || url.includes('360')) return 1;
                    return 0;
                };
                formats.sort((a, b) => getWeight(b) - getWeight(a));
                playUrl = formats[0].url;
            }
            if (!playUrl && item.content) {
                const mp4Matches = item.content.match(/https?:\/\/[^"'\s]+\.mp4/g);
                if (mp4Matches) {
                    const p1080 = mp4Matches.find(u => u.includes('1080p'));
                    const p720  = mp4Matches.find(u => u.includes('720p'));
                    playUrl = p1080 || p720 || mp4Matches[0];
                }
            }

            return {
                vod_id: String(item.id),
                vod_name: item.title || '',
                vod_pic: vod_pic,
                vod_remarks: item.prop4 || item.author || '视频',
                vod_content: item.description || item.summary || '',
                ext: {
                    id: item.id,
                    url: playUrl
                }
            };
        });
    } catch (e) {
        console.error('获取列表失败:', apiUrl, e);
    }

    return JSON.stringify({ list, filter: [] });
}

// ---------- 获取播放列表 ----------
async function getTracks(ext) {
    ext = JSON.parse(ext);
    return JSON.stringify({
        list: [{
            title: '默认线路',
            tracks: [{
                name: '播放',
                ext: { id: ext.id, url: ext.url }
            }]
        }]
    });
}

// ---------- 获取播放地址 ----------
async function getPlayinfo(ext) {
    ext = JSON.parse(ext);
    if (!ext.url) return JSON.stringify({ urls: [] });

    let playUrl = ext.url;
    if (playUrl.startsWith('//')) {
        playUrl = 'https:' + playUrl;
    } else if (playUrl.startsWith('/')) {
        playUrl = 'https://console.cmc.hebtv.com' + playUrl;
    }

    return JSON.stringify({
        urls: [playUrl],
        headers: [
            { 'User-Agent': UA },
            { 'Referer': 'https://web.cmc.hebrts.cn/' }
        ]
    });
}

// ---------- 搜索（暂不实现） ----------
async function search(ext) {
    return JSON.stringify({ list: [] });
}
