// 河南广播电视台（大象新闻）TVBox 解析 - 终极完美全量版
// 列表接口：https://pubmod.hntv.tv/mobile/cms/articles
// 合集接口：https://pubmod.hntv.tv/mobile/cms/origins
// 特性：自动抓取合集的全部期数并分集，支持MP4直链和M3U8直播回放

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';
const PAGE_SIZE = 36;
const BASE_URL = 'https://pubmod.hntv.tv';
const REFERER = 'https://static.hntv.tv/';

let appConfig = {
    ver: 1,
    title: '大象新闻',
    site: 'https://static.hntv.tv',
    tabs: [
        { name: '综艺', ext: { id: '1563699292857946113' } },
        { name: '王牌栏目', ext: { id: '1876440581130223617' } }
    ]
};

async function getConfig() {
    return JSON.stringify(appConfig);
}

function chineseToNumber(chinese) {
    const map = { '零':0, '一':1, '二':2, '三':3, '四':4, '五':5, '六':6, '七':7, '八':8, '九':9, '十':10, '百':100, '千':1000 };
    if (!chinese) return NaN;
    if (/^\d+$/.test(chinese)) return parseInt(chinese);
    let result = 0, temp = 0, hasDigit = false;
    for (let i = 0; i < chinese.length; i++) {
        const num = map[chinese[i]];
        if (num === undefined) return NaN;
        if (num === 10 || num === 100 || num === 1000) {
            if (temp === 0) temp = 1;
            result += temp * num;
            temp = 0;
        } else {
            temp = num;
        }
        hasDigit = true;
    }
    return hasDigit ? result + temp : NaN;
}

function extractEpisodeNumber(title) {
    if (!title) return 99999;
    // 匹配 "第X期"、"第X集"、"X." 等常见格式
    const match = title.match(/第\s*([0-9]+|[零一二三四五六七八九十百千]+)\s*[集话期]/);
    if (match && match[1]) {
        const num = chineseToNumber(match[1]);
        if (!isNaN(num)) return num;
    }
    // 匹配开头的数字，比如 "20260101..." 等日期格式
    const matchDate = title.match(/^(\d{8})/);
    if (matchDate && matchDate[1]) {
        return parseInt(matchDate[1]);
    }
    // 匹配纯数字结尾
    const match3 = title.match(/(\d+)\s*$/);
    if (match3 && match3[1]) return parseInt(match3[1]);
    
    return 99999;
}

// 从各种奇葩的字段里提取播放地址的通用函数
function extractPlayUrl(item) {
    if (!item) return '';
    // 1. 带有 streams 流地址的 (优先选原画 HLS m3u8)
    if (item.streams && item.streams.length > 0) {
        const s = item.streams[0];
        return s.adr_original || s.adr_1080 || s.adr_720 || '';
    }
    // 2. 直接是视频附件的 (MP4)
    if (item.articleAttachmentsList && item.articleAttachmentsList.length > 0) {
        const v = item.articleAttachmentsList.find(a => a.category === 'VIDEO') || item.articleAttachmentsList[0];
        if (v && v.url) return v.url;
    }
    // 3. 视频封面预览的 MP4
    if (item.videoCoverDTO && item.videoCoverDTO.url) {
        return item.videoCoverDTO.url;
    }
    return '';
}

// 获取列表
async function getCards(ext) {
    ext = JSON.parse(ext);
    const page = ext.page || 1;
    const channelId = ext.id || '1563699292857946113';

    const url = `${BASE_URL}/mobile/cms/articles?channelId=${channelId}&tenantId=DXNews&pageNo=${page}&pageSize=${PAGE_SIZE}`;
    const headers = {
        'User-Agent': UA,
        'Accept': 'application/json, text/plain, */*',
        'Origin': 'https://static.hntv.tv',
        'Referer': REFERER
    };

    let list = [];
    try {
        const { data } = await $fetch.get(url, { headers });
        const json = typeof data === 'string' ? JSON.parse(data) : data;

        if (json.code === 0 && json.result && json.result.content) {
            list = json.result.content.map(item => {
                let picUrl = '';
                if (item.coverImagesList && item.coverImagesList.length > 0) {
                    const cover = item.coverImagesList.find(c => c.coverBool) || item.coverImagesList[0];
                    picUrl = cover.url || '';
                }
                if (!picUrl && item.thumbnail) picUrl = item.thumbnail;

                const detailId = item.realArticleId || item.id || '';
                let playUrl = extractPlayUrl(item);
                const originName = item.articleOriginName || item.title;

                const extData = {
                    id: detailId,
                    playUrl: playUrl,
                    originName: originName,
                    title: item.title
                };

                return {
                    vod_id: JSON.stringify(extData), 
                    vod_name: item.title || '',
                    vod_pic: picUrl,
                    vod_remarks: playUrl ? '【单集可播放】' : '【合集可多选】', 
                    vod_content: item.summary || '',
                    ext: extData
                };
            });
        }
    } catch (e) {
        console.error('获取列表失败:', e);
    }

    return JSON.stringify({ list, filter: [] });
}

// 获取分集列表（核心：循环翻页抓取合集所有期数）
async function getTracks(ext) {
    let e = {};
    try {
        e = typeof ext === 'string' ? JSON.parse(ext) : ext;
    } catch (err) {
        e = { id: ext };
    }

    let tracks = [];

    // 情况1：如果是自带直链的单集视频
    if (e.playUrl) {
        tracks.push({
            name: e.title || '播放',
            ext: { id: e.id, url: e.playUrl }
        });
    } 
    // 情况2：无直链，说明是合集（如梨园春），循环抓取所有期数
    else if (e.originName) {
        const headers = {
            'User-Agent': UA,
            'Accept': 'application/json, text/plain, */*',
            'Origin': 'https://static.hntv.tv',
            'Referer': REFERER
        };
        
        let pageNo = 1;
        let hasMore = true;
        let allVideos = [];

        // 循环翻页请求
        while (hasMore && pageNo <= 20) { // 安全限制最多抓取20页
            const originUrl = `${BASE_URL}/mobile/cms/origins?channelId=&tenantId=DXNews&pageNo=${pageNo}&pageSize=18&origins=${encodeURIComponent(e.originName)}`;
            try {
                const { data } = await $fetch.get(originUrl, { headers });
                const json = typeof data === 'string' ? JSON.parse(data) : data;

                if (json.code === 0 && json.result && json.result.content) {
                    allVideos = allVideos.concat(json.result.content);
                    // 判断是否还有下一页
                    if (json.result.totalPage && pageNo < json.result.totalPage) {
                        pageNo++;
                    } else {
                        hasMore = false;
                    }
                } else {
                    hasMore = false;
                }
            } catch (err) {
                console.error('获取 origins 剧集第' + pageNo + '页失败:', err);
                hasMore = false;
            }
        }

        // 解析所有抓到的剧集
        allVideos.forEach(item => {
            const pUrl = extractPlayUrl(item);
            if (pUrl) { // 只添加有播放地址的剧集
                tracks.push({
                    name: item.title || '未知期数',
                    ext: { id: item.id, url: pUrl }
                });
            }
        });

        // 如果没有抓到任何剧集，添加占位提示
        if (tracks.length === 0) {
            tracks.push({ name: '暂无可用期数', ext: { id: e.id, url: '' } });
        }
    } 
    // 情况3：极端兜底
    else {
        tracks.push({ name: e.title || '播放', ext: { id: e.id, url: '' } });
    }

    // 排序：按提取出的期数数字从小到大排，最新一期在最后
    tracks.sort((a, b) => {
        const numA = extractEpisodeNumber(a.name);
        const numB = extractEpisodeNumber(b.name);
        if (numA !== numB) return numA - numB;
        return (a.ext.id || '').localeCompare(b.ext.id || '');
    });

    return JSON.stringify({ list: [{ title: '默认线路', tracks }] });
}

// 获取播放地址
async function getPlayinfo(ext) {
    let e = {};
    try {
        e = typeof ext === 'string' ? JSON.parse(ext) : ext;
    } catch (err) {
        e = { url: ext || '' };
    }

    // 现在所有的播放地址都在 getTracks 阶段提前抓取好了，直接返回
    if (e.url) {
        return JSON.stringify({
            urls: [e.url],
            headers: {
                'User-Agent': UA,
                'Referer': REFERER,
                'Origin': 'https://static.hntv.tv'
            }
        });
    }

    return JSON.stringify({ urls: [] });
}

async function search(ext) {
    return JSON.stringify({ list: [] });
}
