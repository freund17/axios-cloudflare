# axios-cloudflare

An axios hook to handle cloudflare ddos protection / browsercheck:

![Example](https://raw.github.com/freund17/axios-cloudflare/master/docs/example.jpg)

## Usage

```js
const axios = require('axios');
const axiosCloudflare = require('axios-cloudflare');

axiosCloudflare(axios);

axios.get('[Your Url]').then(response => {
    console.log(response.data);
}).catch(error => {
    console.error(error);
});
```
