const axios = require('axios');

async function testPiston() {
    try {
        const response = await axios.post('https://emkc.org/api/v2/piston/execute', {
            language: 'java',
            version: '*',
            files: [
                {
                    content: `public class Main { public static void main(String[] args) { System.out.println("Hello"); } }`
                }
            ],
            stdin: '',
            run_timeout: 2000
        });
        console.log(response.data);
    } catch (error) {
        console.error("Error status:", error.response?.status);
        console.error("Error data:", error.response?.data);
        console.error("Message:", error.message);
    }
}

testPiston();
