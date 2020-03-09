const JSZip = require("jszip");
const fs = require("fs");
const fetch = require("node-fetch");
//const args = require('minimist')(process.argv.slice(2));


class Live2dDownloader {
    constructor() {
        this.zip = new JSZip();
    }

    readJson(url, fileName) {
        return (async () => {
            try {
                const res = await fetch(url);
                return { fileName: fileName, data: await res.json() };
            }catch(err){
                console.log(fileName, ' / download error.', err);
            }
        })();
    }

    readBytes(url, fileName) {
        return (async () => {
            try {
                const res = await fetch(url);
                return { fileName: fileName, data: await res.arrayBuffer() };
            }catch(err){
                console.log(fileName, ' / download error.', err);
            }
        })();
    }

    saveModelAssets(results) {
        results.forEach(element => {

            let cur = element['fileName'].indexOf('http://') + element['fileName'].indexOf('https://');
            let fileName = element['fileName'];
            if (cur > -2) {
                fileName = element['fileName'].substr(element['fileName'].lastIndexOf('/') + 1);
            }

            this.zip.file(fileName, element['data']);
        });

        this.zip.file("model.json", JSON.stringify(this.modelJson));
        /*
        this.zip.generateAsync({ type: "blob" }).then(content => {
            saveAs(content, 'live2d.zip');
        });*/
       
        this.zip.generateAsync({
            type: 'nodebuffer',
            compression: 'DEFLATE',
        }).then(content => {
            fs.writeFile("live2d.zip", content, (err) => {
                if(err) throw err;
            });
            console.log('Done.');
        })
    }

    getModelAssets(modelJson) {
        this.modelJson = modelJson;
        
        let promises = new Array();
        promises.push(this.readBytes(this.baseUrl + modelJson.model, modelJson.model));
        if (modelJson.physics != undefined) {
            promises.push(this.readBytes(this.baseUrl + modelJson.physics, modelJson.physics));
        }

        if (modelJson.textures != undefined) {
            modelJson.textures.forEach(element => {
                promises.push(this.readBytes(this.baseUrl + element, element));
            });
        }

        if (modelJson.pose != undefined) {
            promises.push(this.readBytes(this.baseUrl + modelJson.pose, modelJson.pose));
        }

        if (modelJson.expressions != undefined) {
            modelJson.expressions.forEach(element => {
                promises.push(this.readBytes(this.baseUrl + element['file'], element['file']));
            });
        }

        if (modelJson.motions != undefined) {
            for (let key in modelJson.motions) {
                modelJson.motions[key].forEach(element => {
                    promises.push(this.readBytes(this.baseUrl + element['file'], element['file']));
                    if (element['sound'] != undefined && element['sound'].length > 0) {
                        promises.push(this.readBytes(this.baseUrl + element['sound'], element['sound']));
                    }
                });
            }
        }
        Promise.all(promises).then(results => this.saveModelAssets(results));
    }

    download(url) {
        this.baseUrl = url.substr(0, url.lastIndexOf('/') + 1);
        this.readJson(url).then(res => this.getModelAssets(res['data']));
    }

}

let args = process.argv.splice(2);
let url = args.length > 0? args[0]: 'https://unpkg.com/live2d-widget-model-shizuku@1.0.5/assets/shizuku.model.json';

try{
    const dl = new Live2dDownloader();
    console.log('Download from', url);
    dl.download(url);
}catch(err){
    console.log(err);
}

