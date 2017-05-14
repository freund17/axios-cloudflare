# axios-cloudflare

An axios hook to handle cloudflare ddos protection / browsercheck

## Usage

```[JavaScript]
const axios = require('axios');
const axiosCloudflare = require('axios-cloudflare');

axiosCloudflare(axios);

axios.get('[Your Url]').then(response => {
    console.log(response.data);
}).catch(error => {
    console.error(error);
});
```
