const axios = require('axios');

async function testWandboxCPP() {
    try {
        const response = await axios.post('https://wandbox.org/api/compile.json', {
            code: `#include <iostream>\nint main() { std::cout << "Hello C++"; return 0; }`,
            compiler: 'gcc-head',
            save: false
        });
        console.log(response.data);
    } catch (error) {
        console.error("Error:", error.message);
    }
}

testWandboxCPP();
