class Live2dDownloader {
    constructor() {
        this.zip = new JSZip();
    }

    readJson(url, fileName) {
        return (async () => {
            const res = await fetch(url);
            return { fileName: fileName, data: await res.json() };
        })();
    }

    readBytes(url, fileName) {
        return (async () => {
            const res = await fetch(url);
            return { fileName: fileName, data: await res.arrayBuffer() };
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

        this.zip.file('model.json', JSON.stringify(this.modelJson));
        this.zip.generateAsync({ type: "blob" }).then(content => {
            saveAs(content, 'live2d.zip');
        });
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