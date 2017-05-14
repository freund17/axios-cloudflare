const cheerio = require('cheerio');
const delay = require('delay');
const url = require('url');
const tough = require('tough-cookie');

const clearenceCookies = {};

function axiosCloudflare(axios) {
    function isCloudflareResponse(response) {
        if(typeof response.headers['cf-ray'] !== 'undefined' && typeof response.headers['server'] !== 'undefined' && response.headers['server'] === 'cloudflare-nginx') {
            response.$ = cheerio.load(response.data);

            if(response.$('#challenge-form input[name=jschl_vc]').length > 0)
                return true;
        }

        return false;
    }

    function interceptCloudflare(response) {
        const $ = response.$;

        const $form = $('#challenge-form');
        const targetUrl = $form.attr('action');
        const jschl_vc = $form.find('input[name=jschl_vc]').attr('value');
        const pass = $form.find('input[name=pass]').attr('value');

        const urlObj = url.parse(response.config.url);
        const scriptRows = $('script').first().html().split('\n');

        const part1 = scriptRows[8].match(/^.*, (\w+)={"(\w+)":([!+()[\]]+)};.*$/);

        if(part1 === null)
            throw new Error('Cloudflare interception failed!');

        const varname = part1[1] + '.' + part1[2];
        let jschl_answer = eval(part1[3]);

        const challanges = scriptRows[15].split(';');

        {
            let x = jschl_answer;
            const saveToExec = /^x[+\-*]=[!+()[\]]+$/;

            challanges.forEach(challenge => {
                challenge = challenge.replace(varname, 'x');

                if(saveToExec.test(challenge))
                    eval(challenge);
            });

            jschl_answer = x;
        }

        jschl_answer += urlObj.hostname.length;

        return delay(4000).then(() => {
            return axios({
                method: 'get',
                url: url.resolve(urlObj.href, targetUrl),
                params: { jschl_vc, pass, jschl_answer },
                validateStatus: status => status === 302,
                maxRedirects: 0
            }).then(innerResponse => {
                innerResponse.headers['set-cookie'].forEach(cookieString => {
                    const cookie = tough.Cookie.parse(cookieString);

                    if(cookie.key === 'cf_clearance')
                        clearenceCookies[urlObj.hostname] = cookie.value;
                });

                return axios(response.config);
            });
        });
    }

    function cloudflareRequestInterceptor(config) {
        const urlObj = url.parse(config.url);

        if(typeof clearenceCookies[urlObj.hostname] !== 'undefined') {
            if(typeof config.headers['cookie'] === 'undefined')
                config.headers['cookie'] = '';
            else
                config.headers['cookie'] += ';';

            config.headers['cookie'] += 'cf_clearance=' + clearenceCookies[urlObj.hostname];
        }

        return config;
    }

    function cloudflareResponseInterceptor(response) {
        if(isCloudflareResponse(response))
            return interceptCloudflare(response);
        
        return response;
    }

    function cloudflareResponseErrorInterceptor(error) {
        if(isCloudflareResponse(error.response))
            return interceptCloudflare(error.response);
        
        return Promise.reject(error);
    }

    axios.interceptors.request.use(cloudflareRequestInterceptor);
    axios.interceptors.response.use(cloudflareResponseInterceptor, cloudflareResponseErrorInterceptor);
}

module.exports = axiosCloudflare;
