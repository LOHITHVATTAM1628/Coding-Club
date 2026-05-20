const fs = require('fs');
const https = require('https');
const path = require('path');

const modelsDir = path.join(__dirname, 'public', 'models');
if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
}

const baseUrl = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/';
const files = [
    'tiny_face_detector_model-weights_manifest.json',
    'tiny_face_detector_model-shard1',
    'face_landmark_68_model-weights_manifest.json',
    'face_landmark_68_model-shard1',
    'face_expression_model-weights_manifest.json',
    'face_expression_model-shard1'
];

files.forEach(file => {
    const filePath = path.join(modelsDir, file);
    if (!fs.existsSync(filePath)) {
        console.log(`Downloading ${file}...`);
        const fileStream = fs.createWriteStream(filePath);
        https.get(baseUrl + file, response => {
            response.pipe(fileStream);
            fileStream.on('finish', () => {
                fileStream.close();
                console.log(`Downloaded ${file}`);
            });
        }).on('error', err => {
            fs.unlink(filePath, () => {});
            console.error(`Error downloading ${file}: ${err.message}`);
        });
    } else {
        console.log(`${file} already exists.`);
    }
});
