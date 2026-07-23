const fs = require('fs');

function replaceFile(path, regexes) {
    if (!fs.existsSync(path)) return;
    let content = fs.readFileSync(path, 'utf8');
    for (const [pattern, replacement] of regexes) {
        content = content.replace(pattern, replacement);
    }
    fs.writeFileSync(path, content, 'utf8');
}

replaceFile('../fluxabank-front/App.tsx', [
    [/<h1>Fluxabank<span className="text-orange-500">bank<\/span><\/h1>/g, '<h1>Fluxa<span className="text-orange-500">bank</span></h1>'],
    [
        /<div className="relative -top-5">\s*<button onClick=\{\(\) => setView\('pix'\)\} className="w-14 h-14 bg-\[#0F172A\] rounded-full flex items-center justify-center text-white shadow-lg shadow-orange-900\/30 active:scale-95 transition-transform border-4 border-white">\s*<QrCode className="w-6 h-6" \/>\s*<\/button>\s*<\/div>/g,
        '<div className="w-14 hidden lg:block"></div><div className="absolute left-1/2 -translate-x-1/2 -top-5 z-50"><button onClick={() => setView(\'pix\')} className="w-14 h-14 bg-[#0F172A] rounded-full flex items-center justify-center text-white shadow-lg shadow-orange-500/30 active:scale-95 transition-transform border-4 border-white"><QrCode className="w-6 h-6" /></button></div>'
    ],
    [
        /<nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white\/95 backdrop-blur-xl border-t border-slate-200 px-6 py-3 flex justify-between items-center z-50 pb-safe rounded-t-\[2rem\] ">/g,
        '<nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-xl border-t border-slate-200 px-3 py-3 flex justify-between items-center z-50 pb-safe rounded-t-[2rem]">'
    ],
    [/linear-gradient\(135deg, #f97316 0%, #ea580c 50%, #c2410c 100%\)/g, 'linear-gradient(135deg, #fb923c 0%, #f97316 50%, #f97316 100%)']
]);

replaceFile('../fluxabank-front/components/Dashboard.tsx', [
    [/linear-gradient\(135deg, #f97316 0%, #ea580c 50%, #c2410c 100%\)/g, 'linear-gradient(135deg, #fb923c 0%, #f97316 50%, #f97316 100%)'],
    [/from-orange-600 to-orange-800/g, 'from-orange-400 to-orange-500'],
    [/from-orange-600 via-orange-700 to-orange-800/g, 'from-orange-400 via-orange-500 to-orange-500']
]);

replaceFile('../fluxabank-front/index.css', [
    [/--color-secondary: 194 65 12;/g, '--color-secondary: 234 88 12;'],
    [/--color-primary-dark: 234 88 12;/g, '--color-primary-dark: 249 115 22;'],
    [/linear-gradient\(135deg, #f97316 0%, #c2410c 100%\)/g, 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)'],
    [/from-orange-600 to-orange-800/g, 'from-orange-400 to-orange-500'],
    [/from-orange-500 to-orange-700/g, 'from-orange-400 to-orange-500'],
    [/linear-gradient\(135deg, #f97316 0%, #ea580c 50%, #c2410c 100%\)/g, 'linear-gradient(135deg, #fb923c 0%, #f97316 50%, #f97316 100%)']
]);

console.log("Done");
