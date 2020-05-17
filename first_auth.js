const fs = require("fs");
const path = require("path");

let file = path.resolve(__dirname, "amazonmusic.config.json");
let configurations = [];

if (fs.existsSync(file)) {
    let configurators = JSON.parse(fs.readFileSync(file));
    configurators.forEach(configurator => {
        configurations.push(configurator);
    });
}

function authorize(configuration) {
    return new Promise((resolve, reject) => {       
            resolve();
    });
}

async function authorizations(configurations) {
    for (const configuration of configurations) {
        try {
            await authorize(configuration);
            console.log('Authorization finished');
        } catch (e) {
            console.log('ERROR: ', e);
        }
    }
}

authorizations(configurations).then(result => {
    console.log('Authorization process finished!', result);
}, reason => {
    console.log('Authorization process failed!:', reason);
});
