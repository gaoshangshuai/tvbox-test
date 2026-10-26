const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.75(0x18004b66) NetType/4G Language/zh_CN';
const SITE = 'https://app.mxhedu.com';
const DEFAULT_PIC = 'https://img0.baidu.com/it/u=3056194363,3088267480&fm=253&fmt=auto&app=138&f=JPEG';
const TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJzdWIiOiIyMDQ4NjMzMDE2MjA4NDEyNjc0QDE4NjE3MDY3MjQ0NjE1MzExMzdAMTg2MTM2Mzg5NDE0MDU1NTI2NSIsImlhdCI6MTc5MzA1MjI4OSwiZXhwIjoxNzk1NjQ0Mjg5fQ.wDC3P-Aiavq84vVccE92c8EbTpBV_PREc5SACix54yYi-xbknS-sxz_FDR346QF0Z6a3zTlTuxBVhNZYtOAa4Q';

const HEADERS = {
    'User-Agent': UA,
    'token': TOKEN,
    'Referer': 'https://servicewechat.com/wx3beaa4a347f935ff/10/page-frame.html',
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json'
};

const appConfig = {
    ver: 1,
    title: '萌想虎',
    site: SITE,
    tabs: [
        // 🌟 在这里加上了 ui: 1，强制前端渲染为横版卡片
        { name: '看了还看', ext: { id: '1864237075788472322' }, ui: 1 },
        { name: '首页A', ext: { id: '1861597294625574913' }, ui: 1 }
    ]
};

async function getConfig() { return jsonify(appConfig); }

function getImageUrl(imgPath) {
    if (!imgPath) return DEFAULT_PIC;
    if (imgPath.indexOf('http') === 0) return imgPath;
    return `https://app.mxhedu.com/files/${imgPath.replace(/^\//, '')}`; 
}

async function getCards(ext) {
    ext = argsify(ext);
    const url = `${SITE}/cms-server/app/home/page?pageId=${ext.id}`;
    try {
        const { data } = await $fetch.get(url, { headers: HEADERS });
        let json = typeof data === 'string' ? argsify(data) : data;
        if (!json || json.success === false) return jsonify({ list: [{ vod_id: 'err', vod_name: 'Token失效', vod_pic: DEFAULT_PIC }] });

        let cards = [];
        let list = json.data.tiledList || json.data.videosList || [];

        list.forEach(item => {
            let cv = item.curriculumPageVo || item.videoInfoPageVo || item;
            if (!cv || !cv.id) return;
            
            let pic = DEFAULT_PIC;
            if (cv.imageJson) {
                try {
                    let imgObj = JSON.parse(cv.imageJson);
                    // 优先取横图
                    pic = getImageUrl(imgObj.mainImage || imgObj.leftImage || imgObj.horizontalPicture || '');
                } catch (e) {}
            }

            cards.push({
                vod_id: cv.id,
                vod_name: cv.name || '未知名称',
                vod_pic: pic,
                vod_remarks: cv.episodesNum ? `全${cv.episodesNum}集` : '推荐',
                ext: { id: cv.id }
            });
        });
        return jsonify({ list: cards });
    } catch (e) { return jsonify({ list: [] }); }
}

// 终极提取：直接解析数组，获取每一集的名字和数字ID
async function getTracks(ext) {
    ext = argsify(ext);
    const courseId = ext.id;
    let tracks = [];

    try {
        const url = `${SITE}/cms-server/app/video/resourceInfo/${courseId}`;
        const { data } = await $fetch.get(url, { headers: HEADERS });
        let json = typeof data === 'string' ? argsify(data) : data;

        if (json && json.success && Array.isArray(json.data)) {
            json.data.forEach((item, index) => {
                if (!item.videoName) return;
                
                tracks.push({
                    name: item.videoName,
                    ext: { courseId: courseId, videoId: item.id } 
                });
            });
        }
    } catch (e) {
        console.log('获取剧集失败: ' + e.message);
    }

    if (tracks.length === 0) {
        tracks.push({ name: '解析失败，请重试', ext: { videoId: courseId } });
    }
    
    return jsonify({ list: [{ title: '剧集列表', tracks: tracks }] });
}

// 终极播放：用数字ID换取哈希值，再获取真实播放链接
async function getPlayinfo(ext) {
    ext = argsify(ext);
    let realHashId = ext.videoId;

    // 如果这个 ID 是纯数字，说明它是刚才拿到的数字 ID（如 4214），我们需要去换取哈希
    if (/^\d+$/.test(ext.videoId) && ext.courseId) {
        try {
            const infoUrl = `${SITE}/cms-server/app/video/info/${ext.courseId}/${ext.videoId}`;
            const { data } = await $fetch.get(infoUrl, { headers: HEADERS });
            let infoJson = typeof data === 'string' ? argsify(data) : data;
            
            if (infoJson && infoJson.success && infoJson.data && infoJson.data.mgtEntity) {
                let playback = infoJson.data.mgtEntity.playbackAddress;
                if (playback) {
                    let pa = JSON.parse(playback);
                    realHashId = pa.HD || pa.SD || pa.FHD || Object.values(pa)[0];
                }
            }
        } catch (e) {
            console.log('换取哈希失败: ' + e.message);
        }
    }

    const url = `${SITE}/cms-server/app/video/getPlayInfo`;
    const postData = JSON.stringify({ videoId: realHashId });

    try {
        const { data } = await $fetch.post(url, postData, { headers: HEADERS });
        let json = typeof data === 'string' ? argsify(data) : data;
        
        if (json && json.success && json.data && json.data.playInfoList && json.data.playInfoList.playInfo) {
            const playInfo = json.data.playInfoList.playInfo[0];
            if (playInfo && playInfo.playURL) {
                return jsonify({ urls: [playInfo.playURL], headers: [{ 'User-Agent': UA }] });
            }
        }
    } catch (e) {}
    return jsonify({ urls: [] });
}

async function search(ext) { return jsonify({ list: [] }); }
