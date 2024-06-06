const ffmpeg = require('fluent-ffmpeg');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

class videoAscii {
    
    constructor() {
        console.log('videoAscii constructor');
    } 

    checkPath(outputPath) {
        if (!fs.existsSync(outputPath)) {
            fs.mkdirSync(outputPath);
        }
    }

    async extractFrames(videoPath, outputPath) {
        this.checkPath(outputPath);
        console.log('Extracting frames');
        return new Promise((resolve, reject) => {
            ffmpeg(videoPath)
                .on('end', () => {
                    console.log('Finished processing');
                    resolve();
                })
                .on('error', (err) => {
                    console.log('Error processing:', err);
                    reject(err);
                })
                .output(path.join(outputPath, 'frame-%04d.png'))
                .outputOptions([
                    '-vf', 'fps=10',   // Extract 1 frame per second; adjust as needed
                    '-q:v', '2',      // Quality level for frames
                    '-f', 'image2'
                ])
                .run();
        });
    }

    // Get metadata of the image
    async processFrames(outputPath) {
        const files = fs.readdirSync(outputPath);
        for (const file of files) {
            const filepath = path.join(outputPath, file);
            await this.processFrame(filepath);
        }
    }

    clearDir(dir) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            fs.unlinkSync(path.join(dir, file));
        }
    }

    async getMetaData(path) {
        const { data, info } = await sharp(path)
            .resize(100,40)
            .raw()
            .toBuffer({ resolveWithObject: true });
            
        // Getting image width because need to know num of pixels in a row
        // Getting image height because need to know num of pixels in a column
        const { width, height, channels } = info;
            
        if (channels !== 3) {
            throw new Error('Image must be RGB');
        }
            
        let rgbOfImage = [];

        for(let y = 0; y < height; y++) {
            //when reached here need to clear rbgOfLine array
            let rgbOfLine = [];
            for(let x = 0; x < width; x++) {
                let rgbOfPixel = [];
                // need to store each rbgOfPixel Array in a rgbOfLine Array

                const idx = (width * y + x) * channels;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                    
                rgbOfPixel.push(r, g, b);
                rgbOfLine.push(rgbOfPixel);
            }
            rgbOfImage.push(rgbOfLine);
        } 
        return rgbOfImage;
    }

    async convertToAscii(path) {
        console.clear();
        // Need to convert rgbOfImage to ascii
        let rgbOfImage = await this.getMetaData(path);
 
        let asciiOfImage = [];

        let asciiSymbols = ".:-=+*#%@";
        //the 1st index represents 255 and the last index represents 0
        //need to split 255 divided by the length of asciiSymbols

        let asciiSymbolsLength = asciiSymbols.length;
        let interval = Math.ceil(255 / asciiSymbolsLength);

        let asciiOfPicture = [];
    

        for(let i = 0; i < rgbOfImage.length; i++) {
            let lineLength = rgbOfImage[i].length;
            let asciiOfLine = [];
            for(let j = 0; j < lineLength; j++) {

                

                let r = rgbOfImage[i][j][0];
                let g = rgbOfImage[i][j][1];
                let b = rgbOfImage[i][j][2];
                let avg = (r + g + b) / 3;
                let start = 255;

                let charIndex = Math.floor((avg / 255) * (asciiSymbolsLength - 1));
                asciiOfLine.push(asciiSymbols[charIndex]);            
            }
            asciiOfPicture.push(asciiOfLine);
        }
        for(let i = 0; i < asciiOfPicture.length; i++) {
            console.log(asciiOfPicture[i].join(''));
        }

    }
    
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    // const videoPath = 'psy.mp4';
    const videoPath = 'johnny.mp4';
    const outputPath = 'outputFrames/';

    let video = new videoAscii();
    await video.extractFrames(videoPath, outputPath);
    console.log('Processing frames');
    
    // Read the files in the directory
    const files = fs.readdirSync(outputPath);

    // Process each file one by one
    for (const file of files) {
        await video.convertToAscii(path.join(outputPath, file));
        await sleep(100);
    }
    video.clearDir(outputPath);
}

main();
