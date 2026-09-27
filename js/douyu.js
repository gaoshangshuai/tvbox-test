const CryptoJS = createCryptoJS()

const headers = {
    'User-Agent':
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
    Referer: 'https://www.douyu.com/',
    'Content-Type': 'application/x-www-form-urlencoded',
}

let appConfig = {
    ver: 20260414,
    title: 'douyu',
    site: 'https://www.douyu.com',
}

async function getConfig() {
    let config = appConfig
    config.tabs = [
        // 只保留“一起看”分类
        {
            id: 'yqk',
            name: '一起看',
            ext: {
                id: 'yqk',
            },
            ui: 1,
        },
    ]
    return jsonify(appConfig)
}

async function getCards(ext) {
    ext = argsify(ext)
    let cards = []
    let { id, page = 1 } = ext
    if (id === 'fav') return jsonify({ list: [] })

    const url = `https://m.douyu.com/api/room/list?page=${page}&type=${id}`

    const { data } = await $fetch.get(url, {
        headers,
    })

    argsify(data).data.list.forEach((e) => {
        // 增加过滤逻辑：只保留“一起看”分类的直播间
        // 如果发现列表为空，可能是接口返回的字段名不同，可以尝试打印 console.log(e) 查看具体字段
        const cateName = e.cate2 || e.cateName || e.gameName || ''
        if (!cateName.includes('一起看')) return

        cards.push({
            vod_id: e.rid.toString(),
            vod_name: e.roomName,
            vod_pic: e.roomSrc,
            vod_duration: `🔥${e.hn} | ${e.nickname}`,
            ext: {
                id: e.rid.toString(),
            },
        })
    })

    return jsonify({
        list: cards,
    })
}

async function getTracks(ext) {
    ext = argsify(ext)
    let lists = []
    let id = ext.id
    let url = `https://m.douyu.com/api/room/info?rid=${id}`

    const { data } = await $fetch.get(url, {
        headers,
    })

    const roomInfo = argsify(data).data.roomInfo
    const isLive = roomInfo.isLive
    if (!isLive) {
        lists.push({
            title: '直播未开播',
            tracks: [
                {
                    name: '直播未开播',
                    pan: '',
                    ext: {},
                },
            ],
        })
    } else {
        const toQueryString = (obj) =>
            Object.keys(obj)
                .filter((k) => obj[k] != null && obj[k] !== '')
                .map((k) => `${k}=${obj[k]}`)
                .join('&')

        // 随机化 did，避免单连接限制
        const randHex = () => Math.floor(Math.random() * 16).toString(16)
        const did = Array.from({ length: 32 }, randHex).join('')
        const tt = Math.floor(Date.now() / 1000)

        // 获取加密参数
        const encRes = await $fetch.get(`https://www.douyu.com/wgapi/livenc/liveweb/websec/getEncryption?did=${did}`, {
            headers: {
                Referer: `https://www.douyu.com/${id}`,
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
            },
        })
        const encData = argsify(encRes.data)
        const sec = encData.data

        // 签名
        let current = sec.rand_str
        for (let i = 0; i < sec.enc_time; i++) {
            current = CryptoJS.MD5(current + sec.key).toString()
        }
        const auth = CryptoJS.MD5(current + sec.key + id + tt).toString()
        const basePost = { v: '22032021', did: did, tt: tt, auth: auth, enc_data: sec.enc_data }
        const signHeaders = {
            Referer: `https://www.douyu.com/${id}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
        }

        // 获取所有 CDN 线路 + 完整画质
        const firstRes = await $fetch.post(
            `https://www.douyu.com/lapi/live/getH5PlayV1/${id}`,
            toQueryString({ ...basePost, rate: '0' }),
            { headers: signHeaders },
        )
        const firstData = argsify(firstRes.data).data

        // 获取可用画质列表（最多取5档）
        const allRates = (firstData.multirates || []).slice(0, 5).map((r) => ({ name: r.name, rate: r.rate }))
        if (allRates.length === 0) {
            allRates.push({ name: '原画', rate: 0 }, { name: '高清', rate: 2 }, { name: '标清', rate: 1 })
        }

        // 获取可用 CDN 线路（最多3条）
        const cdns = (firstData.cdnsWithName || []).slice(0, 3)
        const cdnList = cdns.length > 0 ? cdns : [{ name: '默认线路', cdn: firstData.rtmp_cdn || 'scdncufuj' }]

        // A: 为每条 CDN 线路构建 urlArray（每条线路含全部画质）
        for (const cdn of cdnList) {
            const temp = {
                title: cdn.name,
                tracks: [],
            }
            for (const q of allRates) {
                try {
                    const res = await $fetch.post(
                        `https://www.douyu.com/lapi/live/getH5PlayV1/${id}`,
                        toQueryString({ ...basePost, rate: q.rate, cdn: cdn.cdn }),
                        { headers: signHeaders },
                    )
                    const d = argsify(res.data)
                    if (d && d.error === 0) {
                        let url = ''
                        if (d.data.rtmp_url && d.data.rtmp_live) url = d.data.rtmp_url + '/' + d.data.rtmp_live
                        else if (d.data.url) url = d.data.url
                        else if (d.data.live_url) url = d.data.live_url
                        if (url) {
                            temp.tracks.push({
                                name: q.name,
                                pan: '',
                                ext: {
                                    id,
                                    url,
                                },
                            })
                        }
                    }
                } catch (e) {
                    console.log(`斗鱼[${cdn.name}]画质${q.name}获取失败:`, e.message)
                }
            }
            lists.push(temp)
        }
    }

    return jsonify({
        list: lists,
    })
}

async function getPlayinfo(ext) {
    ext = argsify(ext)
    let { id, url } = ext
    const playHeaders = {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G960F Build/QP1A.190711.020; wv) AppleWebKit/537.36',
        Referer: `https://www.douyu.com/${id}`,
        Accept: '*/*',
        'Accept-Encoding': 'identity',
        Origin: 'https://www.douyu.com',
    }

    return jsonify({ urls: [url], headers: [playHeaders] })
}

async function search(ext) {
    ext = argsify(ext)
    let cards = []

    const text = encodeURIComponent(ext.text)
    const page = ext.page || 1
    const url = `${appConfig.site}/japi/search/api/searchShow`
    const did = generateRandomString(32)

    const { data } = await $fetch.get(url + `?kw=${text}&page=${page}&pageSize=20`, {
        headers: {
            'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36 Edg/114.0.1823.51',
            Referer: 'https://www.douyu.com/search/',
            Cookie: `dy_did=${did};acf_did=${did}`,
        },
    })

    argsify(data).data.relateShow.forEach((e) => {
        if (e.type != 1) return
        cards.push({
            vod_id: e.rid.toString(),
            vod_name: e.roomName,
            vod_pic: e.roomSrc,
            vod_duration: e.nickName,
            ext: {
                id: e.rid.toString(),
            },
        })
    })

    return jsonify({
        list: cards,
    })

    function generateRandomString(length) {
        const values = Array.from({ length }, () => Math.floor(Math.random() * 16))
        return values.map((num) => num.toString(16)).join('')
    }
}
