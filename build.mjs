import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url)),src=path.join(root,'src');
let html;
// Use literal replacement callbacks to preserve dollar sequences in embedded JS.
html=await fs.readFile(path.join(src,'shell.html'),'utf8');
for(const [token,file]of [['STYLE','style.css'],['CHROME','chrome.css'],['COMPONENT_CSS','components.css'],['ZIP','jszip.min.js'],['BASELINE','baseline.js'],['COMPANY_GROUPS','company-groups.js'],['DAILY_FX','daily-fx.js'],['ENGINE','engine.js'],['EXCEL','excel.js'],['COMPONENTS','components.js'],['REGISTRY','registry.js'],['REGISTRY_MAPPING','registry-mapping.js'],['IMPORTER','importer.js'],['REPORT','report.js'],['DOCX','docx.js'],['WORD','word.js'],['FX_PREVIEW','fx-preview.js'],['WORKSPACE_UI','workspace-ui.js'],['WORKSPACE_CSS','workspace-ui.css'],['APP','app.js']]){const text=await fs.readFile(path.join(src,file),'utf8');html=html.replace(`__${token}__`,()=>text.replace(/<\/script/gi,'<\\/script'));}
await fs.mkdir(path.join(root,'dist'),{recursive:true});await fs.writeFile(path.join(root,'dist','index.html'),html);console.log('Built standalone HTML',html.length,'characters');
