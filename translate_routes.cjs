const fs = require('fs');
const path = require('path');

const replacements = {
  "'/dashboard'": "'/painel'",
  "`/dashboard`": "`/painel`",
  '"/dashboard"': '"/painel"',
  "'/dashboard?": "'/painel?",
  "`/dashboard?": "`/painel?",
  '"/dashboard?': '"/painel?',
  "'/patients'": "'/pacientes'",
  "`/patients`": "`/pacientes`",
  '"/patients"': '"/pacientes"',
  "'/exams'": "'/exames'",
  "`/exams`": "`/exames`",
  '"/exams"': '"/exames"',
  "'/exam/new": "'/exame/novo",
  "`/exam/new": "`/exame/novo",
  '"/exam/new': '"/exame/novo',
  "'/exam/": "'/exame/",
  "`/exam/": "`/exame/",
  '"/exam/': '"/exame/',
  "'/compare/": "'/comparar/",
  "`/compare/": "`/comparar/",
  '"/compare/': '"/comparar/',
  "'/anamnesis/new": "'/anamnese/novo",
  "`/anamnesis/new": "`/anamnese/novo",
  '"/anamnesis/new': '"/anamnese/novo',
  "'/anamnesis/": "'/anamnese/",
  "`/anamnesis/": "`/anamnese/",
  '"/anamnesis/': '"/anamnese/',
  "'/evolution/": "'/evolucao/",
  "`/evolution/": "`/evolucao/",
  '"/evolution/': '"/evolucao/',
  "'/settings'": "'/configuracoes'",
  "`/settings`": "`/configuracoes`",
  '"/settings"': '"/configuracoes"',
  "'/paywall'": "'/planos'",
  "`/paywall`": "`/planos`",
  '"/paywall"': '"/planos"'
};

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  for (const [key, value] of Object.entries(replacements)) {
    if (content.includes(key)) {
      content = content.split(key).join(value);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
