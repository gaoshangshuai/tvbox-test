// 河南广播电视台（大象新闻）TVBox 解析 - 极速全量双线路版
// 特性：单次大包请求瞬间加载所有剧集，保留 MP4/M3U8 双线路，不过滤任何视频

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';
const PAGE_SIZE = 36;
const BASE_URL = 'https://pubmod.hntv.tv';
const REFERER = 'https://static.hntv.tv/';
const DEFAULT_PIC = 'https://cmsres.dianzhenkeji.com/zhlfres/images/dxdefault.jpg';

let appConfig = {
    ver: 1,
    title: '大象新闻',
    site: 'https://static.hntv.tv',
    tabs: [
        { name: '中国节日系列', ext: { id: 'festival' } },
        { name: '综艺', ext: { id: '1563699292857946113' } },
        { name: '王牌栏目', ext: { id: '1876440581130223617' } }
    ]
};

async function getConfig() { return JSON.stringify(appConfig); }

function chineseToNumber(chinese) {
    const map = { '零':0,'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10,'百':100,'千':1000 };
    if (!chinese) return NaN;
    if (/^\d+$/.test(chinese)) return parseInt(chinese);
    let result = 0, temp = 0, hasDigit = false;
    for (let i = 0; i < chinese.length; i++) {
        const num = map[chinese[i]];
        if (num === undefined) return NaN;
        if (num === 10 || num === 100 || num === 1000) {
            if (temp === 0) temp = 1;
            result += temp * num; temp = 0;
        } else { temp = num; }
        hasDigit = true;
    }
    return hasDigit ? result + temp : NaN;
}

function extractEpisodeNumber(title) {
    if (!title) return 99999;
    const match = title.match(/第\s*([0-9]+|[零一二三四五六七八九十百千]+)\s*[集话期]/);
    if (match && match[1]) { const num = chineseToNumber(match[1]); if (!isNaN(num)) return num; }
    const matchDate = title.match(/^(\d{8})/);
    if (matchDate && matchDate[1]) return parseInt(matchDate[1]);
    const match3 = title.match(/(\d+)\s*$/);
    if (match3 && match3[1]) return parseInt(match3[1]);
    return 99999;
}

function extractUrls(item) {
    let mp4 = '', m3u8 = '';
    if (item.articleAttachmentsList && item.articleAttachmentsList.length > 0) {
        const v = item.articleAttachmentsList.find(a => a.category === 'VIDEO') || item.articleAttachmentsList[0];
        if (v && v.url && v.url.endsWith('.mp4')) mp4 = v.url;
    }
    if (!mp4 && item.videoCoverDTO && item.videoCoverDTO.url && item.videoCoverDTO.url.endsWith('.mp4')) {
        mp4 = item.videoCoverDTO.url;
    }
    if (item.streams && item.streams.length > 0) {
        const s = item.streams[0];
        m3u8 = s.adr_original || s.adr_1080 || s.adr_720 || '';
    }
    return { mp4, m3u8 };
}

async function getCards(ext) {
    ext = JSON.parse(ext);
    const page = ext.page || 1;
    const channelId = ext.id;

    if (channelId === 'festival') {
        let list = [];
        const headers = { 'User-Agent': UA, 'Accept': 'application/json, text/plain, */*', 'Origin': 'https://static.hntv.tv', 'Referer': REFERER };
        const url = `${BASE_URL}/mobile/cms/origins?channelId=1563699230823424002&tenantId=DXNews&pageNo=${page}&pageSize=50`;
        try {
            const { data } = await $fetch.get(url, { headers });
            const json = typeof data === 'string' ? JSON.parse(data) : data;
            if (json.code === 0 && json.result && json.result.content) {
                list = json.result.content.map(item => {
                    let picUrl = item.coverImagesList?.find(c => c.coverBool)?.url || item.coverImagesList?.[0]?.url || item.thumbnail || DEFAULT_PIC;
                    const detailId = item.realArticleId || item.id || '';
                    const { mp4 } = extractUrls(item);
                    const originName = item.articleOriginName || item.title;
                    const extData = { id: detailId, mp4, originName, title: item.title };
                    return {
                        vod_id: JSON.stringify(extData),
                        vod_name: item.title || '',
                        vod_pic: picUrl,
                        vod_remarks: mp4 ? '【单集可播放】' : '【点击查看合集】',
                        vod_content: item.summary || '',
                        ext: extData
                    };
                });
            }
        } catch (e) { console.error('获取中国节日系列失败:', e); }
        return JSON.stringify({ list, filter: [] });
    }

    const url = `${BASE_URL}/mobile/cms/articles?channelId=${channelId}&tenantId=DXNews&pageNo=${page}&pageSize=${PAGE_SIZE}`;
    const headers = { 'User-Agent': UA, 'Accept': 'application/json, text/plain, */*', 'Origin': 'https://static.hntv.tv', 'Referer': REFERER };
    let list = [];
    try {
        const { data } = await $fetch.get(url, { headers });
        const json = typeof data === 'string' ? JSON.parse(data) : data;
        if (json.code === 0 && json.result && json.result.content) {
            list = json.result.content.map(item => {
                let picUrl = item.coverImagesList?.find(c => c.coverBool)?.url || item.coverImagesList?.[0]?.url || item.thumbnail || DEFAULT_PIC;
                const detailId = item.realArticleId || item.id || '';
                const { mp4 } = extractUrls(item);
                const originName = item.articleOriginName || item.title;
                const extData = { id: detailId, mp4, originName, title: item.title };
                return {
                    vod_id: JSON.stringify(extData),
                    vod_name: item.title || '',
                    vod_pic: picUrl,
                    vod_remarks: mp4 ? '【单集可播放】' : '【点击查看合集】',
                    vod_content: item.summary || '',
                    ext: extData
                };
            });
        }
    } catch (e) { console.error('获取列表失败:', e); }
    return JSON.stringify({ list, filter: [] });
}

async function getTracks(ext) {
    let e = {};
    try { e = typeof ext === 'string' ? JSON.parse(ext) : ext; } catch (err) { e = { id: ext }; }
    let mp4Tracks = [], m3u8Tracks = [];

    if (e.mp4) {
        mp4Tracks.push({ name: e.title || '播放', url: e.mp4, ext: { id: e.id, url: e.mp4 } });
    } else if (e.originName) {
        const headers = { 'User-Agent': UA, 'Accept': 'application/json, text/plain, */*', 'Origin': 'https://static.hntv.tv', 'Referer': REFERER };
        
        // 【核心优化】单次大包请求，直接把 pageSize 拉满到 500，极速加载全量视频
        let allVideos = [];
        try {
            const originUrl = `${BASE_URL}/mobile/cms/origins?channelId=&tenantId=DXNews&pageNo=1&pageSize=500&origins=${encodeURIComponent(e.originName)}`;
            const { data } = await $fetch.get(originUrl, { headers });
            const json = typeof data === 'string' ? JSON.parse(data) : data;
            if (json.code === 0 && json.result && json.result.content) {
                allVideos = json.result.content;
                // 如果因为服务器限制 pageSize 没生效，导致 total > 500，则进行最多 2 次并发兜底请求
                if (json.result.total && json.result.total > 500 && json.result.totalPage) {
                    let pageNo = 2;
                    while (pageNo <= json.result.totalPage && pageNo <= 3) { // 最多再请求 2 页
                        const nextUrl = `${BASE_URL}/mobile/cms/origins?channelId=&tenantId=DXNews&pageNo=${pageNo}&pageSize=500&origins=${encodeURIComponent(e.originName)}`;
                        try {
                            const nextRes = await $fetch.get(nextUrl, { headers });
                            const nextJson = typeof nextRes.data === 'string' ? JSON.parse(nextRes.data) : nextRes.data;
                            if (nextJson.code === 0 && nextJson.result && nextJson.result.content) {
                                allVideos = allVideos.concat(nextJson.result.content);
                            }
                            pageNo++;
                        } catch (err) { break; }
                    }
                }
            }
        } catch (err) {
            console.error('获取 origins 剧集失败:', err);
        }

        // 解析所有剧集，绝不丢弃
        allVideos.forEach(item => {
            const { mp4, m3u8 } = extractUrls(item);
            const title = item.title || '未知期数';
            if (mp4) {
                mp4Tracks.push({ name: title, url: mp4, ext: { id: item.id, url: mp4 } });
            } 
            if (m3u8) {
                m3u8Tracks.push({ name: title, url: m3u8, ext: { id: item.id, url: m3u8 } });
            }
        });
    }

    // 如果完全没有可用源，给个占位提示，但不丢弃，避免空列表
    if (mp4Tracks.length === 0 && m3u8Tracks.length === 0) {
        mp4Tracks.push({ name: '该合集暂无有效播放源', url: '', ext: { id: e.id, url: '' } });
    }

    // 排序，让第1集在前，最新一期在后
    const sortTracks = (tracks) => tracks.sort((a, b) => {
        const numA = extractEpisodeNumber(a.name);
        const numB = extractEpisodeNumber(b.name);
        if (numA !== numB) return numA - numB;
        return (a.ext.id || '').localeCompare(b.ext.id || '');
    });
    sortTracks(mp4Tracks);
    sortTracks(m3u8Tracks);

    let lines = [];
    if (mp4Tracks.length > 0) lines.push({ title: 'MP4线路(推荐)', tracks: mp4Tracks });
    if (m3u8Tracks.length > 0) lines.push({ title: 'M3U8线路(备用)', tracks: m3u8Tracks });
    return JSON.stringify({ list: lines });
}

async function getPlayinfo(ext) {
    let e = {};
    try { e = typeof ext === 'string' ? JSON.parse(ext) : ext; } catch (err) { e = { url: ext || '' }; }
    if (e.url) {
        if (e.url.includes('.m3u8')) {
            return JSON.stringify({
                urls: [e.url],
                headers: {
                    'User-Agent': UA,
                    'Referer': 'https://static.hntv.tv/',
                    'Origin': 'https://static.hntv.tv',
                    'Accept': '*/*'
                }
            });
        }
        if (e.url.includes('new-file.hntv.tv')) {
            return JSON.stringify({
                urls: [e.url],
                headers: {
                    'User-Agent': 'AppleCoreMedia/1.0.0.22F76 (iPhone; U; CPU OS 18_5 like Mac OS X; zh_cn)',
                    'Referer': 'https://www.hntv.tv/',
                    'Origin': 'https://www.hntv.tv'
                }
            });
        }
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

async function search(ext) { return JSON.stringify({ list: [] }); }
