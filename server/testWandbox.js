const axios = require('axios');

async function testWandbox() {
    try {
        const response = await axios.post('https://wandbox.org/api/compile.json', {
            code: `public class Main { public static void main(String[] args) { System.out.println("Hello from Wandbox!"); } }`,
            compiler: 'openjdk-jdk-22+36',
            save: false
        });
        console.log(response.data);
    } catch (error) {
        console.error("Error:", error.message);
    }
}

testWandbox();
