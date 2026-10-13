// 河南广播电视台（大象新闻）TVBox 解析 - 纯 MP4 极简版
// 特性：彻底移除 M3U8 线路，只保留稳定直连的 MP4，过滤无效合集

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

// 仅提取 MP4
function extractMp4(item) {
    let mp4 = '';
    if (item.articleAttachmentsList && item.articleAttachmentsList.length > 0) {
        const v = item.articleAttachmentsList.find(a => a.category === 'VIDEO') || item.articleAttachmentsList[0];
        if (v && v.url && v.url.endsWith('.mp4')) mp4 = v.url;
    }
    if (!mp4 && item.videoCoverDTO && item.videoCoverDTO.url && item.videoCoverDTO.url.endsWith('.mp4')) {
        mp4 = item.videoCoverDTO.url;
    }
    return mp4;
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
                    const mp4 = extractMp4(item);
                    
                    // 过滤：没有 MP4 直链的直接丢弃
                    if (!mp4) return null; 

                    const extData = { id: detailId, mp4, title: item.title };
                    return {
                        vod_id: JSON.stringify(extData),
                        vod_name: item.title || '',
                        vod_pic: picUrl,
                        vod_remarks: '【单集可播放】',
                        vod_content: item.summary || '',
                        ext: extData
                    };
                }).filter(item => item !== null);
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
                const mp4 = extractMp4(item);

                // 过滤：没有 MP4 直链的直接丢弃
                if (!mp4) return null;

                const extData = { id: detailId, mp4, title: item.title };
                return {
                    vod_id: JSON.stringify(extData),
                    vod_name: item.title || '',
                    vod_pic: picUrl,
                    vod_remarks: '【单集可播放】',
                    vod_content: item.summary || '',
                    ext: extData
                };
            }).filter(item => item !== null);
        }
    } catch (e) { console.error('获取列表失败:', e); }
    return JSON.stringify({ list, filter: [] });
}

async function getTracks(ext) {
    let e = {};
    try { e = typeof ext === 'string' ? JSON.parse(ext) : ext; } catch (err) { e = { id: ext }; }

    // 只生成 MP4 线路
    let mp4Tracks = [];
    if (e.mp4) {
        mp4Tracks.push({ name: e.title || '播放', url: e.mp4, ext: { id: e.id, url: e.mp4 } });
    } else {
        mp4Tracks.push({ name: '该视频暂无有效播放源', url: '', ext: { id: e.id, url: '' } });
    }

    mp4Tracks.sort((a, b) => {
        const numA = extractEpisodeNumber(a.name);
        const numB = extractEpisodeNumber(b.name);
        if (numA !== numB) return numA - numB;
        return (a.ext.id || '').localeCompare(b.ext.id || '');
    });

    return JSON.stringify({ list: [{ title: 'MP4线路', tracks: mp4Tracks }] });
}

async function getPlayinfo(ext) {
    let e = {};
    try { e = typeof ext === 'string' ? JSON.parse(ext) : ext; } catch (err) { e = { url: ext || '' }; }
    
    if (e.url) {
        // 针对 new-file.hntv.tv 的直链使用专用 UA
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
        // 其他普通 MP4
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
