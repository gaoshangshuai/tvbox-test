// 河南广播电视台（大象新闻）TVBox 解析 - 极速全量双线路版
// 特性：单次大包请求瞬间加载所有剧集，保留 MP4/M3U8 双线路，不过滤任何视频
// 更新：
//   1) 特别节目 Tab：固定节目合集（中国节日 / 元宵 / 端午 / 七夕 / 中秋 / 重阳 / 清明 / 河南春晚）
//   2) 综艺 Tab：综艺频道原始内容
//   3) 推荐 / 王牌栏目：保持不变
//   4) 端午、河南春晚海报已替换为 126 图床直链

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';
const PAGE_SIZE = 36;
const BASE_URL = 'https://pubmod.hntv.tv';
const REFERER = 'https://static.hntv.tv/';
const DEFAULT_PIC = 'https://cmsres.dianzhenkeji.com/zhlfres/images/dxdefault.jpg';

// ============ 【固定节目海报直链】 ============
const PIC_FESTIVAL = 'https://gd-hbimg.huaban.com/46ae81d8c46c7c9d6e2b4a7d7ce04dfd7d0a125e3d66c-7ZM2QT_fw658';
const PIC_YUANXIAO = 'https://i0.hdslb.com/bfs/bangumi/image/7d79cb63d2b157d1b0a33ad30ba13091976c4ff0.png';
const PIC_DUANWU = 'https://nimg.ws.126.net/?url=http%3A%2F%2Fdingyue.ws.126.net%2F2026%2F0613%2F6d1154dej00tgk640004wd000hs00vmg.jpg&thumbnail=660x2147483647&quality=80&type=jpg';
const PIC_QIXI = 'https://bkimg.cdn.bcebos.com/pic/a8014c086e061d950a7b87d0f9a31dd162d9f3d35c99';
const PIC_ZHONGQIU = 'https://bkimg.cdn.bcebos.com/pic/a1ec08fa513d269759ee22edafaaa5fb43166d22727b';
const PIC_CHONGYANG = 'https://imgbdb3.bendibao.com/zzbdb/jieri/202610/16/20261016140618_79047.jpg';
const PIC_QINGMING = 'https://bkimg.cdn.bcebos.com/pic/f3d3572c11dfa9ec8a13a7b22e9ce003918fa0ec6b4b';
const PIC_CHUNWAN = 'https://nimg.ws.126.net/?url=http%3A%2F%2Fdingyue.ws.126.net%2F2026%2F0127%2Fd87b845fj00t9i4bo004id000hs00vmg.jpg&thumbnail=660x2147483647&quality=80&type=jpg';
// ================================================

// ============ 【固定中国节日剧集配置】 ============
const FESTIVAL_ARTICLE_ID = '2103125486051745794';
const FIXED_FESTIVAL_TYPE = 'fixedFestival2026';
const FIXED_FESTIVAL_NAME = '2026中国节日奇妙游';
const FIXED_FESTIVAL_CARD_NAME = '中国节日';
const FIXED_FESTIVAL_VIDEOS = [
    { name: '2026中秋奇妙游', url: 'https://new-file.hntv.tv/attachment/dxnum/1176077916849704960/2026/300d5a22c2436a0d61990c82f8ebea52.mp4' },
    { name: '2026七夕游',     url: 'https://new-file.hntv.tv/attachment/dxnum/1176077916849704960/2026/654729e51d6b03c2d5f86d571ea28ac1.mp4' },
    { name: '2026端午奇妙游', url: 'https://new-file.hntv.tv/attachment/dxnum/1176077916849704960/2026/1690664ccbe032069198b99fc3aa712f.mp4' },
    { name: '2026清明奇妙游', url: 'https://new-file.hntv.tv/attachment/dxnum/1176077916849704960/2026/7437b88de969ab461ad841fdec4f0262.mp4' },
    { name: '2026元宵奇妙游', url: 'https://new-file.hntv.tv/attachment/dxnum/1176077916849704960/2026/eb0ebca1fab4c7f5357277e1b20adc05.mp4' },
    { name: '2026河南春晚“马蹄升升·潮前跃”', url: 'https://new-file.hntv.tv/attachment/dxnum/1176077916849704960/2026/f5d745a47e5a00d2df1aca9dc7207fbb.mp4' },
    { name: '2025《重阳奇妙游》', url: 'https://new-file.hntv.tv/attachment/dxnum/1176077916849704960/2025/e6bbe3cdcf4fa47c23be3ad1b8c593ae.mp4' },
    { name: '2025中秋奇妙游', url: 'https://new-file.hntv.tv/attachment/dxnum/1176077916849704960/2025/9cf7eebb6f5b65a36c9045a51918cda5.mp4' },
    { name: '2025七夕奇妙游', url: 'https://new-file.hntv.tv/attachment/dxnum/1176077916849704960/2025/3f4de60d9840d57e34d508ecc76db61b.mp4' },
    { name: '2025端午奇妙游', url: 'https://new-file.hntv.tv/attachment/dxnum/1271255083757211648/2025/5a21043c58ec8b2958614dbdb9fa0cdc.mp4' },
    { name: '2025清明奇妙游', url: 'https://media2.hndt.com/data_02/1/3/2025/04/03/a035cfc20eb227d81c9089ad328550c4/1907778344860348418_1280x720_1200.m3u8' }
];
// ================================================

// ============ 【固定元宵奇妙游】 ============
const FIXED_YUANXIAO_TYPE = 'fixedYuanxiao';
const FIXED_YUANXIAO_NAME = '元宵奇妙游';
const FIXED_YUANXIAO_VIDEOS = [
    { name: '2025元宵奇妙游', url: 'https://media2.hndt.com/data_02/1/3/2025/02/11/e5f10430ddc98b6347c33a9ee16823f5.mp4' },
    { name: '2024元宵奇妙游', url: 'https://media2.hndt.com/data_01/1/3/2024/02/26/6d8b9c280fbd3154e4cf9ae16151dabb/1762052503335698433_1920x1080_4000.m3u8' },
    { name: '2023元宵奇妙游', url: 'https://media2.hndt.com/data_01/1/3/2023/02/04/2803c6a511a3d288b42633c843afbdfe/1621831625580843009_1920x1080_6000.m3u8' },
    { name: '2022元宵奇妙游', url: 'https://media2.hntv.tv/data_01/1/3/2022/02/14/d96c6a1ce142b2f6570c0887c629cebd/1493225848993562625_1920x1080_2000.m3u8' },
    { name: '2021元宵奇妙游', url: 'https://media2.hntv.tv/data_01/1/3/2021/09/11/779774feb3c384cce57d7ade2a79621d.mp4' }
];
// ================================================

// ============ 【固定端午奇妙游】 ============
const FIXED_DUANWU_TYPE = 'fixedDuanwu';
const FIXED_DUANWU_VIDEOS = [
    { name: '2024端午奇妙游', url: 'https://media2.hndt.com/data_02/1/3/2024/06/09/d933619b33fa5a02cc7575452b957526.mp4' },
    { name: '2023端午奇妙游', url: 'https://media2.hndt.com/data_01/1/3/2023/06/22/a5f51ae6e6b1d91e7add9e6a43b34d46/1671845081408200706.m3u8' },
    { name: '2022端午奇妙游', url: 'https://media2.hndt.com/data_01/1/3/2022/06/02/fff40b0eb06ccca221aa93383e77a903.mp4' },
    { name: '2021端午奇妙游', url: 'https://media2.hntv.tv/data_01/1/3/2021/10/01/20762c74fb3c1cfe708c84c83f645eb6.mp4' }
];
// ================================================

// ============ 【固定七夕奇妙游】 ============
const FIXED_QIXI_TYPE = 'fixedQixi';
const FIXED_QIXI_VIDEOS = [
    { name: '2026七夕奇妙游', url: 'https://new-file.hntv.tv/attachment/dxnum/1176077916849704960/2026/654729e51d6b03c2d5f86d571ea28ac1.mp4' },
    { name: '2025七夕奇妙游', url: 'https://new-file.hntv.tv/attachment/dxnum/1176077916849704960/2025/3f4de60d9840d57e34d508ecc76db61b.mp4' },
    { name: '2024七夕奇妙游', url: 'https://media2.hndt.com/data_02/1/3/2024/08/10/152b52631a0e5f50df8d61dfbaa05e92.mp4' },
    { name: '2023七夕奇妙游', url: 'https://media2.hndt.com/data_01/1/3/2023/08/22/2a6e4f2abd7f1fc6e5a56f4594a7c7a1/1693902712468246529.m3u8' },
    { name: '2022七夕奇妙游', url: 'https://media2.hndt.com/data_01/1/3/2022/08/03/d88352a3aa007c938f3efcf64180c98a.mp4' },
    { name: '2021七夕奇妙游', url: 'https://media2.hntv.tv/data_01/1/3/2021/08/13/d6a3428cb126b4821f63f88e994c63c4.mp4' }
];
// ================================================

// ============ 【固定中秋奇妙游】 ============
const FIXED_ZHONGQIU_TYPE = 'fixedZhongqiu';
const FIXED_ZHONGQIU_VIDEOS = [
    { name: '2024中秋奇妙游', url: 'https://media2.hndt.com/data_02/1/3/2024/09/16/387374d71c70ddd2d96d36d3106ae31d.mp4' },
    { name: '2023中秋奇妙游', url: 'https://media2.hndt.com/data_01/1/3/2023/09/28/49d841cf5500f49cdb5055da2f67a536/1707376185226919938_1920x1080_2000.m3u8' },
    { name: '2022中秋奇妙游', url: 'https://media2.hndt.com/data_01/1/3/2022/09/15/540a848537721b70453c43adebddbdcd.mp4' },
    { name: '2021中秋奇妙游', url: 'https://media2.hntv.tv/data_01/1/3/2021/09/19/5f60348673298500915b6fc5417cc461.mp4' }
];
// ================================================

// ============ 【固定重阳奇妙游】 ============
const FIXED_CHONGYANG_TYPE = 'fixedChongyang';
const FIXED_CHONGYANG_VIDEOS = [
    { name: '2024重阳奇妙游', url: 'https://media2.hndt.com/data_02/1/3/2024/10/11/37d3699ed2524ebdfa5fa390c84e8f60/1844674958397370369_1280x720_1200.m3u8' },
    { name: '2023重阳奇妙游', url: 'https://media2.hndt.com/data_01/1/3/2023/10/22/cacddae23933a0e195eaa774c40256c8/1716075862617063426_1920x1080_2000.m3u8' },
    { name: '2022重阳奇妙游', url: 'https://media2.hndt.com/data_01/1/3/2022/10/03/2358ae72e49d9aa5aa1719f1318f6d1d.mp4' },
    { name: '2021重阳奇妙游', url: 'https://media2.hntv.tv/data_01/1/3/2021/10/13/9a74707679b5776a5b2ad9e623e10fcf.mp4' }
];
// ================================================

// ============ 【固定清明奇妙游】 ============
const FIXED_QINGMING_TYPE = 'fixedQingming';
const FIXED_QINGMING_VIDEOS = [
    { name: '2026清明奇妙游', url: 'https://new-file.hntv.tv/attachment/dxnum/1176077916849704960/2026/7437b88de969ab461ad841fdec4f0262.mp4' },
    { name: '2025清明奇妙游', url: 'https://media2.hndt.com/data_02/1/3/2025/04/03/a035cfc20eb227d81c9089ad328550c4/1907778344860348418_1280x720_1200.m3u8' },
    { name: '2024清明奇妙游', url: 'https://media2.hndt.com/data_01/1/3/2024/04/05/5d7776e965d58c199091ee00f1d794d5/1776048683417698306_1920x1080_4000.m3u8' },
    { name: '2023清明奇妙游', url: 'https://media2.hndt.com/data_01/1/3/2023/06/22/e785a9400694055c3d1a2dee608bc5c1.mp4' },
    { name: '2022清明奇妙游', url: 'https://media2.hndt.com/data_01/1/3/2023/02/27/e547f4f50d9e12e5b2383973aa98e6e8.mp4' },
    { name: '2021清明奇妙游', url: 'https://vmsres.dianzhenkeji.com/1/DXNews/2021/4/09/1380512113663041536.mp4' }
];
// ================================================

// ============ 【固定河南春晚】 ============
const FIXED_CHUNWAN_TYPE = 'fixedChunwan';
const FIXED_CHUNWAN_VIDEOS = [
    { name: '2025河南春晚', url: 'https://media2.hndt.com/data_02/1/3/2025/01/27/c0860dd71ab7aac1497393ff9b5dc8cd/1883564917859901441_1920x1080_4000.m3u8' },
    { name: '2024河南春晚', url: 'https://media2.hndt.com/data_01/1/3/2024/02/08/0d6bbac6c21e504cea898c2766743f52/1755270384760487938_1920x1080_4000.m3u8' },
    { name: '2023河南春晚', url: 'https://media2.hndt.com/data_01/1/3/2023/01/20/12f7d9d8a072f727f39ec1916013ba80/1616337311476060162_1920x1080_6000.m3u8' },
    { name: '2022河南春晚', url: 'https://media2.hndt.com/data_01/1/3/2022/01/31/fc3d5e1268d097a8d347c17097e4a8b7/1487851063275786241.m3u8' },
    { name: '2021河南春晚', url: 'https://stream5vod.hndt.com/vod/DXNews/2021/2/13/1360571418156449792.mp4/index.m3u8' }
];
// ================================================

// ============ 【特别节目固定节目列表】 ============
const FIXED_PROGRAMS = [
    { type: FIXED_FESTIVAL_TYPE, name: FIXED_FESTIVAL_CARD_NAME, contentName: FIXED_FESTIVAL_NAME, pic: PIC_FESTIVAL, videos: FIXED_FESTIVAL_VIDEOS, lineTitle: 'MP4线路(推荐)' },
    { type: FIXED_YUANXIAO_TYPE, name: FIXED_YUANXIAO_NAME, pic: PIC_YUANXIAO, videos: FIXED_YUANXIAO_VIDEOS, lineTitle: '元宵奇妙游(全集)' },
    { type: FIXED_DUANWU_TYPE, name: '端午奇妙游', pic: PIC_DUANWU, videos: FIXED_DUANWU_VIDEOS, lineTitle: '端午奇妙游(全集)' },
    { type: FIXED_QIXI_TYPE, name: '七夕奇妙游', pic: PIC_QIXI, videos: FIXED_QIXI_VIDEOS, lineTitle: '七夕奇妙游(全集)' },
    { type: FIXED_ZHONGQIU_TYPE, name: '中秋奇妙游', pic: PIC_ZHONGQIU, videos: FIXED_ZHONGQIU_VIDEOS, lineTitle: '中秋奇妙游(全集)' },
    { type: FIXED_CHONGYANG_TYPE, name: '重阳奇妙游', pic: PIC_CHONGYANG, videos: FIXED_CHONGYANG_VIDEOS, lineTitle: '重阳奇妙游(全集)' },
    { type: FIXED_QINGMING_TYPE, name: '清明奇妙游', pic: PIC_QINGMING, videos: FIXED_QINGMING_VIDEOS, lineTitle: '清明奇妙游(全集)' },
    { type: FIXED_CHUNWAN_TYPE, name: '河南春晚', pic: PIC_CHUNWAN, videos: FIXED_CHUNWAN_VIDEOS, lineTitle: '河南春晚(全集)' }
];
// ================================================

// 综艺频道（综艺 Tab 数据源）
const VARIETY_CHANNEL_ID = '1563699292857946113';

let appConfig = {
    ver: 1,
    title: '大象新闻',
    site: 'https://static.hntv.tv',
    tabs: [
        { name: '推荐', ext: { id: 'festival' } },
        { name: '特别节目', ext: { id: 'special' } },   // 固定节目合集
        { name: '综艺', ext: { id: 'variety' } },       // 综艺频道原始内容
        { name: '王牌栏目', ext: { id: '1876440581130223617' } }
    ]
};

async function getConfig() { return JSON.stringify(appConfig); }

// 通用：构造固定节目卡片
function buildProgramCard(p) {
    const extData = { type: p.type, id: p.type, title: p.contentName || p.name };
    return {
        vod_id: JSON.stringify(extData),
        vod_name: p.name,
        vod_pic: p.pic || DEFAULT_PIC,
        vod_remarks: '共' + p.videos.length + '集',
        vod_content: (p.contentName || p.name) + '：' + p.videos.map(v => v.name).join('、'),
        ext: extData
    };
}

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
    if (!mp4) {
        const cand = item.videoUrl || item.playUrl || item.fileUrl || item.adrUrl || item.videoPath ||
                     (typeof item.url === 'string' ? item.url : '') ||
                     (item.video && typeof item.video.url === 'string' ? item.video.url : '');
        if (cand && cand.endsWith('.mp4')) mp4 = cand;
        if (!m3u8 && cand && cand.includes('.m3u8')) m3u8 = cand;
    }
    if (item.streams && item.streams.length > 0) {
        const s = item.streams[0];
        m3u8 = s.adr_original || s.adr_1080 || s.adr_720 || '';
    }
    return { mp4, m3u8 };
}

function scanStrings(obj) {
    let mp4 = '', m3u8 = '';
    for (const k in obj) {
        const v = obj[k];
        if (typeof v === 'string') {
            if (!mp4 && v.indexOf('.mp4') > 0) mp4 = v;
            if (!m3u8 && v.indexOf('.m3u8') > 0) m3u8 = v;
        }
    }
    return { mp4, m3u8 };
}

function deepCollect(node, out) {
    if (node === null || node === undefined) return;
    if (Array.isArray(node)) { for (const v of node) deepCollect(v, out); return; }
    if (typeof node !== 'object') return;

    let { mp4, m3u8 } = extractUrls(node);
    if (!mp4 && !m3u8) { const s = scanStrings(node); mp4 = s.mp4; m3u8 = s.m3u8; }

    if (mp4 || m3u8) {
        const title = node.title || node.videoTitle || node.name || node.articleTitle || ('视频' + (out.length + 1));
        out.push({
            title: String(title),
            mp4, m3u8,
            id: node.videoId || node.realArticleId || node.id || '',
            originName: node.articleOriginName || node.originName || '',
            pic: (node.coverImagesList && node.coverImagesList.find(c => c.coverBool) || {}).url ||
                 (node.coverImagesList && node.coverImagesList[0] || {}).url ||
                 node.thumbnail || node.cover || node.pic || ''
        });
    }
    for (const k in node) deepCollect(node[k], out);
}

async function getCards(ext) {
    ext = JSON.parse(ext);
    const page = ext.page || 1;
    const channelId = ext.id;

    // ========== 【特别节目】全部固定节目卡片 ==========
    if (channelId === 'special') {
        if (page > 1) return JSON.stringify({ list: [], filter: [] });
        return JSON.stringify({ list: FIXED_PROGRAMS.map(buildProgramCard), filter: [] });
    }
    // ====================================================

    // ========== 【兼容】直接请求某个固定节目 ==========
    const fixedProg = FIXED_PROGRAMS.find(p => p.type === channelId);
    if (fixedProg) {
        return JSON.stringify({ list: [buildProgramCard(fixedProg)], filter: [] });
    }
    if (typeof channelId === 'string' && channelId.indexOf('article:') === 0) {
        const p = FIXED_PROGRAMS.find(p => p.type === FIXED_FESTIVAL_TYPE);
        return JSON.stringify({ list: [buildProgramCard(p)], filter: [] });
    }
    // ====================================================

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
        } catch (e) { console.error('获取推荐失败:', e); }
        return JSON.stringify({ list, filter: [] });
    }

    // ========== 【综艺】走综艺频道原始数据 ==========
    const realChannelId = (channelId === 'variety') ? VARIETY_CHANNEL_ID : channelId;

    const url = `${BASE_URL}/mobile/cms/articles?channelId=${realChannelId}&tenantId=DXNews&pageNo=${page}&pageSize=${PAGE_SIZE}`;
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

    // ========== 【固定节目】剧集列表 ==========
    const fixedProg = FIXED_PROGRAMS.find(p => p.type === e.type);
    if (fixedProg) {
        const tracks = fixedProg.videos.map(v => ({
            name: v.name,
            url: v.url,
            ext: { id: v.url, url: v.url }
        }));
        return JSON.stringify({ list: [{ title: fixedProg.lineTitle || '固定线路', tracks }] });
    }
    // ============================================

    let mp4Tracks = [], m3u8Tracks = [];

    if (e.mp4 || e.m3u8) {
        if (e.mp4) mp4Tracks.push({ name: e.title || '播放', url: e.mp4, ext: { id: e.id, url: e.mp4 } });
        if (e.m3u8) m3u8Tracks.push({ name: e.title || '播放', url: e.m3u8, ext: { id: e.id, url: e.m3u8 } });
    } else if (e.originName) {
        const headers = { 'User-Agent': UA, 'Accept': 'application/json, text/plain, */*', 'Origin': 'https://static.hntv.tv', 'Referer': REFERER };

        let allVideos = [];
        try {
            const originUrl = `${BASE_URL}/mobile/cms/origins?channelId=&tenantId=DXNews&pageNo=1&pageSize=500&origins=${encodeURIComponent(e.originName)}`;
            const { data } = await $fetch.get(originUrl, { headers });
            const json = typeof data === 'string' ? JSON.parse(data) : data;
            if (json.code === 0 && json.result && json.result.content) {
                allVideos = json.result.content;
                if (json.result.total && json.result.total > 500 && json.result.totalPage) {
                    let pageNo = 2;
                    while (pageNo <= json.result.totalPage && pageNo <= 3) {
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

    if (mp4Tracks.length === 0 && m3u8Tracks.length === 0) {
        mp4Tracks.push({ name: '该合集暂无有效播放源', url: '', ext: { id: e.id, url: '' } });
    }

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
