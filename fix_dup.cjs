const fs = require('fs');
const appPath = '../fluxabank-front/App.tsx';
if (fs.existsSync(appPath)) {
    let appCode = fs.readFileSync(appPath, 'utf8');
    appCode = appCode.replace(/Fluxabank<span className="text-orange-500">bank<\/span>/g, 'Fluxa<span className="text-orange-500">bank</span>');
    fs.writeFileSync(appPath, appCode, 'utf8');
    console.log('Fixed duplicate bank');
}
