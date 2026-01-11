const axios = require('axios');

async function test() {
    try {
        const res = await axios.get('http://localhost:5000/api/products');
        console.log('Success:', res.data.length, 'products');
    } catch (e) {
        if (e.response) {
            console.error('Error 500 details:', e.response.data);
        } else {
            console.error('Network error:', e.message);
        }
    }
}

test();
