const cheerio = createCheerio();
const CryptoJS = createCryptoJS();
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1';

let appConfig = {
    ver: 1,
    title: '咪咕视频',
    site: 'https://www.miguvideo.com',
    tabs: [
        { name: '电影', ext: { id: '电影' } },
        { name: '电视剧', ext: { id: '电视剧' } },
        { name: '综艺', ext: { id: '综艺' } },
        { name: '动漫', ext: { id: '动漫' } },
        { name: '纪录片', ext: { id: '纪录片' } },
    ],
};

const HEADERS = {
    'User-Agent': UA,
    'Appcode': 'miguvideo_default_www',
    'Appid': 'miguvideo',
    'Channel': 'H5',
    'x-up-client-channel-id': '0132_10010001005',
    'Referer': 'https://www.miguvideo.com/',
};

async function getConfig() {
    return jsonify(appConfig);
}

// 生成UUID（用于clientId）
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// 生成devId（Base64 AES CBC 加密）
function generateDevId(clientId) {
    try {
        const key = CryptoJS.enc.Utf8.parse('0e0f0cb703bb0f0c0e0cb0b00a0bbaba');
        const iv = CryptoJS.enc.Utf8.parse('0e0f0cb703bb0f0c0e0cb0b00a0bbaba'.substring(0, 16));
        const encrypted = CryptoJS.AES.encrypt(clientId, key, {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });
        return encrypted.toString();
    } catch (e) {
        return btoa(clientId);
    }
}

// 生成signN（MD5 加密）
function generateSignN(clientId, devId) {
    return CryptoJS.MD5(clientId + devId).toString();
}

// 生成请求参数
function buildPlayUrlParams(contId) {
    const clientId = generateUUID();
    const timestamp = Date.now().toString();
    const devId = generateDevId(clientId);
    const signN = generateSignN(clientId, devId);

    return `contId=${contId}&rateType=4&clientId=${clientId}&timestamp=${timestamp}&startPlay=true&devId=${encodeURIComponent(devId)}&ums=1&signN=${signN}&xh265=true&chip=mgwww&channelId=0132_10010001005`;
}

// 获取分类列表
async function getCards(ext) {
    ext = argsify(ext);
    let cards = [];
    let { id, page = 1 } = ext;

    const catMap = {
        '电影': '1001',
        '电视剧': '1002',
        '综艺': '1003',
        '动漫': '1004',
        '纪录片': '1005',
    };
    const catId = catMap[id] || '1001';

    try {
        const url = `${appConfig.site}/p/channel/121d155c2ce74e9f96e7fa80b502d062`;
        const { data } = await $fetch.get(url, { headers: HEADERS });
        const $ = cheerio.load(data);

        // 尝试从页面提取视频卡片
        $('a[href*="/p/detail/"]').each((_, element) => {
            const href = $(element).attr('href');
            const title = $(element).find('.title, .name, h3, h4').text().trim() || $(element).attr('title');
            const cover = $(element).find('img').attr('src') || $(element).find('img').attr('data-src');
            const contId = href ? href.match(/\/(\d+)/) : null;
            const remark = $(element).find('.update, .note, .remark').text().trim();

            if (contId && title && !cards.some(c => c.vod_id === contId[1])) {
                cards.push({
                    vod_id: contId[1],
                    vod_name: title,
                    vod_pic: cover,
                    vod_remarks: remark,
                    ext: { id: contId[1] },
                });
            }
        });

        // 如果页面提取不到，尝试从API获取
        if (cards.length === 0) {
            const apiUrl = `https://webapi.miguvideo.com/gateway/vod/v1/vodlist?catId=${catId}&pageNum=${page}&pageSize=20`;
            const res = await $fetch.get(apiUrl, { headers: HEADERS });
            const json = argsify(res.data);
            const list = json?.body?.data?.list || json?.data?.list || [];
            list.forEach(item => {
                cards.push({
                    vod_id: item.contId || item.id,
                    vod_name: item.name || item.title,
                    vod_pic: item.pic || item.image,
                    vod_remarks: item.updateInfo || item.remark || '',
                    ext: { id: item.contId || item.id },
                });
            });
        }
    } catch (e) {
        $print('获取列表失败: ' + e.message);
    }

    return jsonify({ list: cards });
}

// 获取剧集列表
async function getTracks(ext) {
    ext = argsify(ext);
    let contId = ext.id;
    let groups = [];

    try {
        const detailUrl = `${appConfig.site}/p/detail/${contId}`;
        const { data } = await $fetch.get(detailUrl, { headers: HEADERS });
        const $ = cheerio.load(data);

        // 尝试从详情页提取剧集
        let tracks = [];
        $('a[href*="/p/play/"], .play-list a, .episode-list a').each((_, element) => {
            const href = $(element).attr('href');
            const text = $(element).text().trim();
            if (href && text) {
                const playContId = href.match(/\/(\d+)/);
                if (playContId) {
                    tracks.push({
                        name: text,
                        pan: '',
                        ext: { id: playContId[1] },
                    });
                }
            }
        });

        if (tracks.length > 0) {
            groups.push({ title: '默认分组', tracks });
        } else {
            // 如果没有剧集列表，当作电影处理
            groups.push({
                title: '默认分组',
                tracks: [{
                    name: '播放',
                    pan: '',
                    ext: { id: contId },
                }],
            });
        }
    } catch (e) {
        $print('获取剧集失败: ' + e.message);
        groups.push({
            title: '默认分组',
            tracks: [{ name: '播放', pan: '', ext: { id: contId } }],
        });
    }

    return jsonify({ list: groups });
}

// 获取播放地址
async function getPlayinfo(ext) {
    ext = argsify(ext);
    let contId = ext.id;

    try {
        // 构建带签名的请求参数
        const params = buildPlayUrlParams(contId);
        const apiUrl = `https://webapi.miguvideo.com/gateway/playurl/v3/play/playurl?${params}`;

        $print('请求播放地址: ' + apiUrl);

        const { data } = await $fetch.get(apiUrl, {
            headers: {
                ...HEADERS,
                'Accept': 'application/json',
            }
        });

        const json = argsify(data);
        let playUrl = '';

        // 从响应中提取m3u8地址
        if (json?.body?.urlInfo?.url) {
            playUrl = json.body.urlInfo.url;
        } else if (json?.urlInfo?.url) {
            playUrl = json.urlInfo.url;
        } else if (json?.body?.url) {
            playUrl = json.body.url;
        } else if (json?.data?.url) {
            playUrl = json.data.url;
        }

        if (playUrl) {
            // 添加 crossdomain 参数
            if (playUrl.includes('?')) {
                playUrl += '&crossdomain=www';
            } else {
                playUrl += '?crossdomain=www';
            }

            $print('找到播放地址: ' + playUrl);

            return jsonify({
                urls: [playUrl],
                headers: {
                    'User-Agent': UA,
                    'Referer': 'https://www.miguvideo.com/',
                    'Origin': 'https://www.miguvideo.com',
                }
            });
        }

        $print('未找到播放地址，响应: ' + JSON.stringify(json).substring(0, 500));
    } catch (e) {
        $print('获取播放地址失败: ' + e.message);
    }

    return jsonify({ urls: [] });
}

// 搜索
async function search(ext) {
    ext = argsify(ext);
    let cards = [];
    let text = encodeURIComponent(ext.text);

    try {
        const url = `https://webapi.miguvideo.com/gateway/search/v1/search?keyword=${text}&pageNum=1&pageSize=20`;
        const { data } = await $fetch.get(url, {
            headers: {
                ...HEADERS,
                'Accept': 'application/json',
            }
        });

        const json = argsify(data);
        const list = json?.body?.list || json?.data?.list || [];

        list.forEach(item => {
            cards.push({
                vod_id: item.contId || item.id,
                vod_name: item.name || item.title,
                vod_pic: item.pic || item.image,
                vod_remarks: item.updateInfo || item.remark || '',
                ext: { id: item.contId || item.id },
            });
        });
    } catch (e) {
        $print('搜索失败: ' + e.message);
    }

    return jsonify({ list: cards });
}
