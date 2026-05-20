const axios = require('axios');

async function getCompilers() {
    try {
        const response = await axios.get('https://wandbox.org/api/list.json');
        const compilers = response.data.map(c => c.name);
        console.log("Found compilers:", compilers.length);
        console.log("JS:", compilers.filter(c => c.includes('node')));
        console.log("Python:", compilers.filter(c => c.includes('cpython')));
        console.log("Java:", compilers.filter(c => c.includes('openjdk')));
        console.log("C++:", compilers.filter(c => c.includes('gcc') && c.includes('c++')));
    } catch (error) {
        console.error("Error:", error.message);
    }
}

getCompilers();
