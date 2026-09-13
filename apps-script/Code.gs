/**
 * Backend: Google Apps Script + planilha do Artur 7 anos
 * Versao: v8-multi-fone-acesso
 *
 * - Varios celulares por familia (coluna celular: "fone1 | fone2")
 * - ultimo_acesso_em atualizado a cada busca/confirmacao
 * - Aba Acessos para grafico dia x acessos
 */

var ABA = 'Familias';
var ABA_ACESSOS = 'Acessos';
var ADMIN_SENHA_FIXA = '19122019@';
var SHEET_ID_FIXO = '1ZFZ_UjSaF4BXecf0TizKXLt8EeCpErpPwmqWQJBGyok';
var VERSAO = 'v8-multi-fone-acesso';

var CABECALHO = [
  'celular',
  'nome_pai',
  'nome_mae',
  'filhos',
  'status',
  'origem',
  'qtd_meias',
  'presente_em',
  'criado_em',
  'atualizado_em',
  'observacao',
  'ultimo_acesso_em'
];

var CABECALHO_ACESSOS = [
  'data_hora',
  'celular_busca',
  'celulares_familia',
  'nome_familia'
];

function doGet(e) {
  return jsonOut(handleGet(e && e.parameter ? e.parameter : {}));
}

function doPost(e) {
  try {
    var body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
    return jsonOut(handlePost(body || {}));
  } catch (err) {
    return jsonOut({ ok: false, erro: String(err) });
  }
}

function handleGet(params) {
  var action = (params.action || '').toLowerCase();

  if (action === 'ping') {
    return { ok: true, msg: 'api online', versao: VERSAO };
  }

  if (action === 'buscar') {
    return buscar(params.q || '', params.celular || '');
  }

  if (action === 'listar') {
    if (!senhaOk(params.senha)) {
      return { ok: false, erro: 'Senha admin inválida' };
    }
    return respostaListar();
  }

  return { ok: false, erro: 'Ação GET desconhecida', versao: VERSAO };
}

function handlePost(body) {
  var action = (body.action || '').toLowerCase();

  if (action === 'listar') {
    if (!senhaOk(body.senha)) {
      return { ok: false, erro: 'Senha admin inválida' };
    }
    return respostaListar();
  }

  if (action === 'salvar' || action === 'confirmar' || action === 'recusar') {
    if (action === 'recusar') {
      body.status = 'nao_vai';
    }
    return salvarFamilia(body, false);
  }

  if (action === 'pre_cadastro') {
    if (!senhaOk(body.senha)) {
      return { ok: false, erro: 'Senha admin inválida' };
    }
    return salvarFamilia(body, true);
  }

  if (action === 'marcar_presente') {
    if (!senhaOk(body.senha)) {
      return { ok: false, erro: 'Senha admin inválida' };
    }
    return marcarPresente(body.celular);
  }

  if (action === 'desmarcar_presente') {
    if (!senhaOk(body.senha)) {
      return { ok: false, erro: 'Senha admin inválida' };
    }
    return desmarcarPresente(body.celular);
  }

  if (action === 'excluir') {
    if (!senhaOk(body.senha)) {
      return { ok: false, erro: 'Senha admin inválida' };
    }
    return excluirFamilia(body.celular);
  }

  return { ok: false, erro: 'Ação POST desconhecida' };
}

function respostaListar() {
  return {
    ok: true,
    familias: listarTodas(),
    acessos_por_dia: agregarAcessosPorDia(),
    cadastros_por_dia: agregarCadastrosPorDia(),
    versao: VERSAO
  };
}

function montarNomes(body, atual) {
  var pai = limparTexto(body.nome_pai || '');
  var mae = limparTexto(body.nome_mae || '');

  // um único responsável (auto-cadastro do convite)
  if (!pai && !mae && body.nome_responsavel) {
    pai = limparTexto(body.nome_responsavel);
  }

  // compatível com formulário antigo (pai / mãe no mesmo campo)
  if (!pai && !mae && body.nome_responsavel_antigo) {
    var partes = String(body.nome_responsavel_antigo).split('/');
    pai = limparTexto(partes[0] || '');
    mae = limparTexto(partes[1] || '');
  }

  if (atual) {
    if (!pai && atual.nome_pai) pai = atual.nome_pai;
    if (!mae && atual.nome_mae) mae = atual.nome_mae;
  }

  return { pai: pai, mae: mae };
}

function nomeExibicao(pai, mae) {
  if (pai && mae) return pai + ' / ' + mae;
  return pai || mae || '';
}

function coletarCelularesDoBody(body, atual, isPre) {
  var lista = [];
  if (body.celulares && Object.prototype.toString.call(body.celulares) === '[object Array]') {
    lista = lista.concat(body.celulares);
  }
  if (body.celular) lista.push(body.celular);
  if (body.celular2) lista.push(body.celular2);

  var limpos = listaCelulares(lista.join('|'));

  if (isPre) {
    // Admin define a lista final (pode trocar/remover). Se vazio, gera ID.
    if (!limpos.length && atual && atual.celulares && atual.celulares.length) {
      // edição sem telefone informado: mantém IDs internos se já existiam
      var soIds = atual.celulares.filter(function (c) { return ehIdSemCelular(c); });
      if (soIds.length && !atual.celulares.some(function (c) { return !ehIdSemCelular(c); })) {
        return soIds;
      }
    }
    return limpos;
  }

  // Convidado: mantém telefones já cadastrados e inclui o digitado
  if (atual && atual.celulares && atual.celulares.length) {
    limpos = listaCelulares(atual.celulares.concat(limpos).join('|'));
  }
  return limpos;
}

function celularValidoParaConvite(c) {
  return c && c.length >= 10 && c.length <= 11 && !ehIdSemCelular(c);
}

function salvarFamilia(body, isPre) {
  var sheet = getSheet();
  var agora = new Date().toISOString();

  var celularBusca = normalizarCelular(body.celular || '');
  var rowIndex = celularBusca ? acharLinhaPorCelular(sheet, celularBusca) : -1;
  if (rowIndex < 0 && body.celular2) {
    rowIndex = acharLinhaPorCelular(sheet, normalizarCelular(body.celular2));
  }
  // Admin editando pelo celular "chave" antigo
  if (rowIndex < 0 && body.celular_chave) {
    rowIndex = acharLinhaPorCelular(sheet, normalizarCelular(body.celular_chave));
  }

  var atual = rowIndex > 0 ? lerLinha(sheet, rowIndex) : null;
  var celulares = coletarCelularesDoBody(body, atual, isPre);

  if (!isPre) {
    if (!celularBusca || !celularValidoParaConvite(celularBusca)) {
      return { ok: false, erro: 'Celular inválido. Use DDD + número (10 ou 11 dígitos).' };
    }
    if (celulares.indexOf(celularBusca) < 0) celulares.push(celularBusca);
    celulares = listaCelulares(celulares.join('|'));
  } else {
    // valida telefones reais informados
    for (var i = 0; i < celulares.length; i++) {
      var c = celulares[i];
      if (!ehIdSemCelular(c) && (c.length < 10 || c.length > 11)) {
        return { ok: false, erro: 'Celular inválido. Use DDD + número (10 ou 11 dígitos), ou deixe em branco.' };
      }
    }
    if (!celulares.length) {
      celulares = [gerarIdSemCelular(sheet)];
    }
  }

  var celularGravar = juntarCelulares(celulares);
  var nomes = montarNomes(body, null);
  if (!nomes.pai && !nomes.mae) {
    return { ok: false, erro: 'Informe o nome do responsável (pai e/ou mãe).' };
  }

  var filhos = normalizarFilhos(body.filhos);
  var pediuNaoVai = String(body.status || '').toLowerCase() === 'nao_vai';

  if (!pediuNaoVai && !filhos.length) {
    return { ok: false, erro: 'Informe ao menos um filho(a), ou marque que não vai.' };
  }

  var status = isPre ? 'pre_cadastro' : (pediuNaoVai ? 'nao_vai' : 'confirmado');
  var origem = isPre ? 'admin' : (body.origem || 'convidado');
  var observacao = limparTexto(body.observacao || '');
  var qtdMeias = pediuNaoVai ? 0 : filhos.length;
  var pai = nomes.pai;
  var mae = nomes.mae;
  var ultimoAcesso = agora;

  if (rowIndex > 0) {
    nomes = montarNomes(body, atual);
    pai = nomes.pai;
    mae = nomes.mae;
    ultimoAcesso = isPre ? (atual.ultimo_acesso_em || '') : agora;

    if (isPre && (atual.status === 'confirmado' || atual.status === 'nao_vai' || atual.status === 'presente')) {
      status = atual.status;
      if (!filhos.length) filhos = atual.filhos;
      qtdMeias = status === 'nao_vai' ? 0 : filhos.length;
    }
    if (!isPre) {
      status = pediuNaoVai ? 'nao_vai' : 'confirmado';
      origem = atual.origem === 'admin' || String(atual.origem).indexOf('admin') === 0
        ? 'admin+convidado'
        : 'convidado';
      if (pediuNaoVai && !filhos.length) {
        filhos = atual.filhos;
      }
      qtdMeias = pediuNaoVai ? 0 : filhos.length;
    }

    sheet.getRange(rowIndex, 1, 1, CABECALHO.length).setValues([[
      celularGravar,
      pai,
      mae,
      filhos.join(' | '),
      status,
      origem,
      qtdMeias,
      atual.presente_em || '',
      atual.criado_em || agora,
      agora,
      observacao || atual.observacao || '',
      ultimoAcesso
    ]]);
    gravarCelularNaLinha(sheet, rowIndex, celularGravar);

    var familiaUp = lerLinha(sheet, rowIndex);
    if (!isPre) registrarAcesso(familiaUp, celularBusca);

    return {
      ok: true,
      msg: isPre
        ? 'Pré-cadastro atualizado.'
        : (pediuNaoVai ? 'Registramos que não poderão ir.' : 'Presença confirmada!'),
      familia: familiaUp
    };
  }

  sheet.appendRow([
    celularGravar,
    pai,
    mae,
    filhos.join(' | '),
    status,
    origem,
    qtdMeias,
    '',
    agora,
    agora,
    observacao,
    isPre ? '' : agora
  ]);
  var novaLinha = sheet.getLastRow();
  gravarCelularNaLinha(sheet, novaLinha, celularGravar);

  var familiaNova = lerLinha(sheet, novaLinha);
  if (!isPre) registrarAcesso(familiaNova, celularBusca);

  return {
    ok: true,
    msg: isPre
      ? 'Pré-cadastro criado.'
      : (pediuNaoVai ? 'Registramos que não poderão ir.' : 'Presença confirmada!'),
    familia: familiaNova
  };
}

function familiaObj(celularRaw, pai, mae, filhos, status, origem, qtdMeias, presente, criado, atualizado, obs, ultimoAcesso) {
  var celulares = listaCelulares(celularRaw);
  return {
    celular: celulares[0] || '',
    celulares: celulares,
    celular_exibicao: celulares.join(' | '),
    nome_pai: pai,
    nome_mae: mae,
    nome_responsavel: nomeExibicao(pai, mae),
    filhos: filhos,
    status: status,
    origem: origem,
    qtd_meias: qtdMeias,
    presente_em: presente,
    criado_em: criado,
    atualizado_em: atualizado,
    observacao: obs,
    ultimo_acesso_em: ultimoAcesso || ''
  };
}

function marcarPresente(celularRaw) {
  var celular = normalizarCelular(celularRaw);
  var sheet = getSheet();
  var rowIndex = acharLinhaPorCelular(sheet, celular);
  if (rowIndex < 0) {
    return { ok: false, erro: 'Cadastro não encontrado para este celular.' };
  }

  var agora = new Date().toISOString();
  sheet.getRange(rowIndex, col('status')).setValue('presente');
  sheet.getRange(rowIndex, col('presente_em')).setValue(agora);
  sheet.getRange(rowIndex, col('atualizado_em')).setValue(agora);

  return { ok: true, msg: 'Presença no local marcada.', familia: lerLinha(sheet, rowIndex) };
}

function desmarcarPresente(celularRaw) {
  var celular = normalizarCelular(celularRaw);
  var sheet = getSheet();
  var rowIndex = acharLinhaPorCelular(sheet, celular);
  if (rowIndex < 0) {
    return { ok: false, erro: 'Cadastro não encontrado para este celular.' };
  }

  var atual = lerLinha(sheet, rowIndex);
  var novoStatus = atual.status === 'nao_vai' ? 'nao_vai' : 'confirmado';
  var agora = new Date().toISOString();
  sheet.getRange(rowIndex, col('status')).setValue(novoStatus);
  sheet.getRange(rowIndex, col('presente_em')).setValue('');
  sheet.getRange(rowIndex, col('atualizado_em')).setValue(agora);

  return { ok: true, msg: 'Presença desmarcada.', familia: lerLinha(sheet, rowIndex) };
}

function excluirFamilia(celularRaw) {
  var celular = normalizarCelular(celularRaw);
  var sheet = getSheet();
  var rowIndex = acharLinhaPorCelular(sheet, celular);
  if (rowIndex < 0) {
    return { ok: false, erro: 'Cadastro não encontrado.' };
  }
  sheet.deleteRow(rowIndex);
  return { ok: true, msg: 'Cadastro removido.' };
}

function buscar(q, celularRaw) {
  var sheet = getSheet();
  var dados = sheet.getDataRange().getValues();
  if (dados.length <= 1) {
    return { ok: true, resultados: [], versao: VERSAO };
  }

  var celular = normalizarCelular(celularRaw);
  var termo = String(q || '').trim().toLowerCase();
  var resultados = [];

  for (var i = 1; i < dados.length; i++) {
    var familia = mapRow(dados[i]);
    if (!familia.celulares.length && !familia.celular) continue;

    if (celular && familiaTemCelular(familia, celular)) {
      resultados.push(familia);
      continue;
    }

    if (termo.length >= 2) {
      var blob = (
        familia.nome_pai + ' ' +
        familia.nome_mae + ' ' +
        familia.nome_responsavel + ' ' +
        familia.filhos.join(' ') + ' ' +
        familia.celulares.join(' ')
      ).toLowerCase();
      if (blob.indexOf(termo) !== -1) {
        resultados.push(familia);
      }
    }
  }

  // Acesso: se buscou por celular e achou, atualiza ultimo acesso + log
  if (celular && resultados.length) {
    var hit = resultados[0];
    var rowIndex = acharLinhaPorCelular(sheet, celular);
    if (rowIndex > 0) {
      var agora = new Date().toISOString();
      sheet.getRange(rowIndex, col('ultimo_acesso_em')).setValue(agora);
      hit = lerLinha(sheet, rowIndex);
      registrarAcesso(hit, celular);
      resultados[0] = hit;
    }
  }

  resultados = resultados.slice(0, 8);
  return { ok: true, resultados: resultados, versao: VERSAO };
}

function listarTodas() {
  var sheet = getSheet();
  var dados = sheet.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < dados.length; i++) {
    var f = mapRow(dados[i]);
    if (f.celular || (f.celulares && f.celulares.length)) out.push(f);
  }
  return out;
}

function registrarAcesso(familia, celularBusca) {
  try {
    var sheet = getAcessosSheet();
    sheet.appendRow([
      new Date().toISOString(),
      String(celularBusca || ''),
      (familia.celulares || [familia.celular || '']).join(' | '),
      familia.nome_responsavel || nomeExibicao(familia.nome_pai, familia.nome_mae)
    ]);
  } catch (e) {
    // não bloqueia o fluxo principal
  }
}

function getAcessosSheet() {
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID') || SHEET_ID_FIXO;
  var ss = SpreadsheetApp.openById(id);
  var sheet = ss.getSheetByName(ABA_ACESSOS);
  if (!sheet) {
    sheet = ss.insertSheet(ABA_ACESSOS);
    sheet.appendRow(CABECALHO_ACESSOS);
    sheet.setFrozenRows(1);
    return sheet;
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(CABECALHO_ACESSOS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function agregarAcessosPorDia() {
  var sheet = getAcessosSheet();
  var last = sheet.getLastRow();
  var map = {};
  if (last < 2) return map;
  var valores = sheet.getRange(2, 1, last, 1).getValues();
  for (var i = 0; i < valores.length; i++) {
    var dia = isoParaDia(valores[i][0]);
    if (!dia) continue;
    map[dia] = (map[dia] || 0) + 1;
  }
  return map;
}

function agregarCadastrosPorDia() {
  var familias = listarTodas();
  var map = {};
  for (var i = 0; i < familias.length; i++) {
    var dia = isoParaDia(familias[i].criado_em);
    if (!dia) continue;
    map[dia] = (map[dia] || 0) + 1;
  }
  return map;
}

function isoParaDia(v) {
  if (!v) return '';
  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime())) {
    return Utilities.formatDate(v, Session.getScriptTimeZone() || 'America/Sao_Paulo', 'yyyy-MM-dd');
  }
  var s = String(v);
  var m = s.match(/(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : '';
}

function getSheet() {
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID') || SHEET_ID_FIXO;
  var ss = SpreadsheetApp.openById(id);
  var sheet = ss.getSheetByName(ABA);
  if (!sheet) {
    sheet = ss.insertSheet(ABA);
    sheet.appendRow(CABECALHO);
    sheet.setFrozenRows(1);
    return sheet;
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(CABECALHO);
    sheet.setFrozenRows(1);
    return sheet;
  }
  migrarCabecalhoSePreciso(sheet);
  garantirColunaUltimoAcesso(sheet);
  return sheet;
}

function garantirColunaUltimoAcesso(sheet) {
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var header = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) {
    return String(h || '').trim();
  });
  if (header.indexOf('ultimo_acesso_em') >= 0) return;
  sheet.getRange(1, header.length + 1).setValue('ultimo_acesso_em');
}

function migrarCabecalhoSePreciso(sheet) {
  var header = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
  var h1 = String(header[1] || '').trim();
  if (h1 === 'nome_pai') return;
  if (h1 !== 'nome_responsavel') {
    sheet.clear();
    sheet.appendRow(CABECALHO);
    sheet.setFrozenRows(1);
    return;
  }

  var last = sheet.getLastRow();
  var dados = last > 1 ? sheet.getRange(2, 1, last, 10).getValues() : [];
  sheet.clear();
  sheet.appendRow(CABECALHO);
  sheet.setFrozenRows(1);

  dados.forEach(function (row) {
    var celular = normalizarCelular(row[0]);
    if (!celular) return;
    var resp = String(row[1] || '');
    var partes = resp.split('/');
    var pai = limparTexto(partes[0] || '');
    var mae = limparTexto(partes[1] || '');
    sheet.appendRow([
      celular,
      pai,
      mae,
      row[2] || '',
      row[3] || '',
      row[4] || '',
      row[5] || 0,
      row[6] || '',
      row[7] || '',
      row[8] || '',
      row[9] || '',
      ''
    ]);
  });
}

function col(nome) {
  var i = CABECALHO.indexOf(nome);
  return i >= 0 ? i + 1 : 1;
}

function acharLinhaPorCelular(sheet, celular) {
  var alvo = normalizarCelular(celular);
  if (!alvo) return -1;
  var last = sheet.getLastRow();
  if (last < 2) return -1;
  var colValues = sheet.getRange(2, 1, last, 1).getValues();
  for (var i = 0; i < colValues.length; i++) {
    var lista = listaCelulares(colValues[i][0]);
    if (lista.indexOf(alvo) >= 0) {
      return i + 2;
    }
  }
  return -1;
}

function familiaTemCelular(familia, celular) {
  var alvo = normalizarCelular(celular);
  var lista = familia.celulares || listaCelulares(familia.celular);
  return lista.indexOf(alvo) >= 0;
}

function lerLinha(sheet, rowIndex) {
  var lastCol = Math.max(sheet.getLastColumn(), CABECALHO.length);
  var values = sheet.getRange(rowIndex, 1, 1, lastCol).getValues()[0];
  return mapRow(values);
}

function mapRow(row) {
  if (CABECALHO[1] === 'nome_pai') {
    var pai = String(row[1] || '').trim();
    var mae = String(row[2] || '').trim();
    return familiaObj(
      row[0],
      pai,
      mae,
      String(row[3] || '').split('|').map(function (s) { return s.trim(); }).filter(Boolean),
      String(row[4] || '').trim(),
      String(row[5] || '').trim(),
      Number(row[6] || 0),
      String(row[7] || ''),
      formatarDataCampo(row[8]),
      formatarDataCampo(row[9]),
      String(row[10] || ''),
      formatarDataCampo(row[11])
    );
  }

  var resp = String(row[1] || '').trim();
  var p = resp.split('/');
  return familiaObj(
    row[0],
    limparTexto(p[0] || ''),
    limparTexto(p[1] || ''),
    String(row[2] || '').split('|').map(function (s) { return s.trim(); }).filter(Boolean),
    String(row[3] || '').trim(),
    String(row[4] || '').trim(),
    Number(row[5] || 0),
    String(row[6] || ''),
    formatarDataCampo(row[7]),
    formatarDataCampo(row[8]),
    String(row[9] || ''),
    ''
  );
}

function formatarDataCampo(v) {
  if (!v) return '';
  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime())) {
    return v.toISOString();
  }
  return String(v);
}

function normalizarCelular(v) {
  return String(v || '').replace(/\D/g, '');
}

function listaCelulares(v) {
  return String(v || '')
    .split(/[|,;]/)
    .map(function (s) { return normalizarCelular(s); })
    .filter(function (c) {
      return !!c && (c.length >= 10 || ehIdSemCelular(c) || /^990\d+$/.test(c));
    })
    .filter(function (c, i, arr) {
      return arr.indexOf(c) === i;
    });
}

function juntarCelulares(lista) {
  return listaCelulares((lista || []).join('|')).join(' | ');
}

/** IDs internos para cadastro sem telefone: 990 + 8 dígitos */
function ehIdSemCelular(celular) {
  var c = String(celular || '');
  return /^990\d{8}$/.test(c) || /^000\d{8}$/.test(c);
}

function gerarIdSemCelular(sheet) {
  var id;
  var tentativas = 0;
  do {
    var n = String(new Date().getTime()) + String(Math.floor(Math.random() * 900) + 100);
    id = '990' + n.slice(-8);
    tentativas += 1;
  } while (acharLinhaPorCelular(sheet, id) > 0 && tentativas < 20);
  return id;
}

function gravarCelularNaLinha(sheet, rowIndex, celular) {
  var cell = sheet.getRange(rowIndex, col('celular'));
  cell.setNumberFormat('@');
  cell.setValue(String(celular || ''));
}

function normalizarFilhos(filhos) {
  if (!filhos) return [];
  if (typeof filhos === 'string') {
    return filhos.split(/[|,;]/).map(function (s) { return limparTexto(s); }).filter(Boolean);
  }
  if (Object.prototype.toString.call(filhos) === '[object Array]') {
    return filhos.map(function (s) { return limparTexto(s); }).filter(Boolean);
  }
  return [];
}

function limparTexto(v) {
  return String(v || '').replace(/\s+/g, ' ').trim();
}

function senhaOk(senha) {
  return String(senha || '') === ADMIN_SENHA_FIXA;
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
