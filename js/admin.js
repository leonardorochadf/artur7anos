(function () {
  var senhaInput = document.getElementById('senha');
  var form = document.getElementById('form-admin');
  var celularInput = document.getElementById('celular');
  var celular2Input = document.getElementById('celular2');
  var paiInput = document.getElementById('nome-pai');
  var maeInput = document.getElementById('nome-mae');
  var kidsBox = document.getElementById('kids');
  var addKidBtn = document.getElementById('add-kid');
  var statusEl = document.getElementById('status');
  var formStatusEl = document.getElementById('form-status');
  var loginStatusEl = document.getElementById('login-status');
  var listaEl = document.getElementById('lista-telefones');
  var statsEl = document.getElementById('stats');
  var btnEntrar = document.getElementById('btn-entrar');
  var btnRefresh = document.getElementById('btn-refresh');
  var btnToggleCadastro = document.getElementById('btn-toggle-cadastro');
  var btnFecharCadastro = document.getElementById('btn-fechar-cadastro');
  var secaoCadastro = document.getElementById('secao-cadastro');
  var btnTogglePresenca = document.getElementById('btn-toggle-presenca');
  var btnFecharPresenca = document.getElementById('btn-fechar-presenca');
  var btnPdfPresenca = document.getElementById('btn-pdf-presenca');
  var secaoPresenca = document.getElementById('secao-presenca');
  var listaPresencaEl = document.getElementById('lista-presenca');
  var btnToggleTabela = document.getElementById('btn-toggle-tabela');
  var btnFecharTabela = document.getElementById('btn-fechar-tabela');
  var btnPdfTabela = document.getElementById('btn-pdf-tabela');
  var secaoTabela = document.getElementById('secao-tabela');
  var tabelaResumoEl = document.getElementById('tabela-resumo');
  var tabelaHeadEl = document.getElementById('tabela-dados-head');
  var tabelaBodyEl = document.getElementById('tabela-dados-body');
  var tabelaScrollTop = document.getElementById('tabela-scroll-top');
  var tabelaScrollTopInner = document.getElementById('tabela-scroll-top-inner');
  var tabelaScrollMain = document.getElementById('tabela-scroll-main');
  var tabelaScrollSyncing = false;
  var buscaInput = document.getElementById('busca-lista');
  var buscaResultado = document.getElementById('busca-resultado');
  var telaLogin = document.getElementById('tela-login');
  var telaApp = document.getElementById('tela-app');
  var logado = false;
  var salvando = false;
  var buscaTimer = null;
  var maxFilhosTabela = 5;
  var editandoCelularKey = null;
  var modalConfirm = document.getElementById('modal-confirm');
  var modalConfirmTitulo = document.getElementById('modal-confirm-titulo');
  var modalConfirmMsg = document.getElementById('modal-confirm-msg');
  var modalConfirmSim = document.getElementById('modal-confirm-sim');
  var modalConfirmNao = document.getElementById('modal-confirm-nao');
  var modalConfirmResolver = null;
  var modalConfirmModoAlerta = false;

  function fecharModalConfirm(resultado) {
    if (!modalConfirm) return;
    modalConfirm.classList.add('hidden');
    modalConfirmModoAlerta = false;
    if (modalConfirmNao) modalConfirmNao.classList.remove('hidden');
    var resolve = modalConfirmResolver;
    modalConfirmResolver = null;
    if (resolve) resolve(!!resultado);
  }

  /** Confirmação na própria página (não usa window.confirm, que o Chrome pode bloquear). */
  function pedirConfirmacao(mensagem, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      if (!modalConfirm || !modalConfirmMsg || !modalConfirmSim || !modalConfirmNao) {
        resolve(opts.alerta ? true : window.confirm(mensagem));
        return;
      }
      if (modalConfirmResolver) fecharModalConfirm(false);
      modalConfirmResolver = resolve;
      modalConfirmModoAlerta = !!opts.alerta;
      if (modalConfirmTitulo) modalConfirmTitulo.textContent = opts.titulo || (opts.alerta ? 'Aviso' : 'Confirmar');
      modalConfirmMsg.textContent = mensagem;
      modalConfirmSim.textContent = opts.textoSim || (opts.alerta ? 'OK' : 'Confirmar');
      modalConfirmNao.textContent = opts.textoNao || 'Cancelar';
      modalConfirmSim.className = 'btn ' + (opts.classeSim || (opts.alerta ? 'btn-grass' : 'btn-grass'));
      if (opts.alerta) modalConfirmNao.classList.add('hidden');
      else modalConfirmNao.classList.remove('hidden');
      modalConfirm.classList.remove('hidden');
      modalConfirmSim.focus();
    });
  }

  function mostrarAviso(mensagem, titulo) {
    return pedirConfirmacao(mensagem, {
      titulo: titulo || 'Aviso',
      textoSim: 'OK',
      alerta: true,
      classeSim: 'btn-grass'
    });
  }

  var modalProgresso = document.getElementById('modal-progresso');
  var modalProgressoMsg = document.getElementById('modal-progresso-msg');
  var modalProgressoTitulo = document.getElementById('modal-progresso-titulo');
  var modalProgressoFill = document.getElementById('modal-progresso-fill');
  var modalProgressoPct = document.getElementById('modal-progresso-pct');
  var progressoTimer = null;

  function setProgressoVisual(pct) {
    var p = Math.max(0, Math.min(100, Math.round(pct)));
    if (modalProgressoFill) modalProgressoFill.style.width = p + '%';
    if (modalProgressoPct) modalProgressoPct.textContent = p + '%';
  }

  function abrirProgresso(titulo, mensagem) {
    if (!modalProgresso) return;
    if (modalProgressoTitulo) modalProgressoTitulo.textContent = titulo || 'Salvando';
    if (modalProgressoMsg) modalProgressoMsg.textContent = mensagem || 'Aguarde...';
    setProgressoVisual(8);
    modalProgresso.classList.remove('hidden');

    clearInterval(progressoTimer);
    var atual = 8;
    progressoTimer = setInterval(function () {
      // Sobe até ~90% enquanto espera a API; os 100% vêm no fim
      if (atual < 90) {
        atual += Math.max(1, (90 - atual) * 0.08);
        setProgressoVisual(atual);
      }
    }, 180);
  }

  function fecharProgresso() {
    clearInterval(progressoTimer);
    progressoTimer = null;
    setProgressoVisual(100);
    return new Promise(function (resolve) {
      setTimeout(function () {
        if (modalProgresso) modalProgresso.classList.add('hidden');
        setProgressoVisual(0);
        resolve();
      }, 280);
    });
  }

  if (modalConfirm) {
    modalConfirmSim.addEventListener('click', function () { fecharModalConfirm(true); });
    modalConfirmNao.addEventListener('click', function () { fecharModalConfirm(false); });
    modalConfirm.querySelectorAll('[data-modal-cancel]').forEach(function (el) {
      el.addEventListener('click', function () {
        fecharModalConfirm(modalConfirmModoAlerta ? true : false);
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modalConfirm && !modalConfirm.classList.contains('hidden')) {
        fecharModalConfirm(modalConfirmModoAlerta ? true : false);
      }
    });
  }

  function abrirCadastro() {
    fecharPresenca();
    fecharTabela();
    secaoCadastro.classList.remove('hidden');
    btnToggleCadastro.textContent = 'Fechar';
    secaoCadastro.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function fecharCadastro() {
    secaoCadastro.classList.add('hidden');
    btnToggleCadastro.textContent = 'Cadastrar';
    editandoCelularKey = null;
  }

  function toggleCadastro() {
    if (secaoCadastro.classList.contains('hidden')) {
      editandoCelularKey = null;
      abrirCadastro();
    } else fecharCadastro();
  }

  function abrirPresenca() {
    fecharCadastro();
    fecharTabela();
    secaoPresenca.classList.remove('hidden');
    btnTogglePresenca.textContent = 'Fechar';
    renderPresenca(window.__familias || []);
    secaoPresenca.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function fecharPresenca() {
    if (!secaoPresenca) return;
    secaoPresenca.classList.add('hidden');
    if (btnTogglePresenca) btnTogglePresenca.textContent = 'Presença';
  }

  function togglePresenca() {
    if (secaoPresenca.classList.contains('hidden')) abrirPresenca();
    else fecharPresenca();
  }

  function abrirTabela() {
    fecharCadastro();
    fecharPresenca();
    secaoTabela.classList.remove('hidden');
    btnToggleTabela.textContent = 'Fechar';
    renderTabelaDados(window.__familias || []);
    secaoTabela.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function fecharTabela() {
    if (!secaoTabela) return;
    secaoTabela.classList.add('hidden');
    if (btnToggleTabela) btnToggleTabela.textContent = 'Tabela';
  }

  function toggleTabela() {
    if (secaoTabela.classList.contains('hidden')) abrirTabela();
    else fecharTabela();
  }

  function setStatus(msg, type) {
    statusEl.textContent = msg || '';
    statusEl.className = 'status' + (type ? ' ' + type : '');
    if (formStatusEl) {
      formStatusEl.textContent = msg || '';
      formStatusEl.className = 'status' + (type ? ' ' + type : '');
    }
  }

  function setLoginStatus(msg, type) {
    loginStatusEl.textContent = msg || '';
    loginStatusEl.className = 'status' + (type ? ' ' + type : '');
  }

  function senha() {
    return senhaInput.value;
  }

  function mostrarApp() {
    logado = true;
    telaLogin.classList.add('hidden');
    telaApp.classList.remove('hidden');
  }

  function formatarDataHora(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d.getTime())) {
      var s = String(iso);
      return s.length > 19 ? s.slice(0, 19).replace('T', ' ') : s;
    }
    return d.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function diaBrasilia(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) {
      var m = String(iso).match(/(\d{4}-\d{2}-\d{2})/);
      return m ? m[1] : '';
    }
    return d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  }

  function diaCurto(isoDia) {
    // yyyy-MM-dd -> dd/MM
    var p = String(isoDia || '').split('-');
    if (p.length !== 3) return isoDia;
    return p[2] + '/' + p[1];
  }

  function ordenarDias(map) {
    return Object.keys(map || {}).sort();
  }

  function renderGraficoBarras(el, map, cor) {
    if (!el) return;
    var dias = ordenarDias(map);
    if (!dias.length) {
      el.innerHTML = '<p class="chart-empty">Sem dados ainda.</p>';
      return;
    }
    // mostra no máximo os últimos 14 dias
    if (dias.length > 14) dias = dias.slice(dias.length - 14);
    var max = 1;
    dias.forEach(function (d) {
      var n = Number(map[d] || 0);
      if (n > max) max = n;
    });
    el.innerHTML = dias.map(function (d) {
      var n = Number(map[d] || 0);
      var h = Math.max(6, Math.round((n / max) * 100));
      return (
        '<div class="chart-bar-item" title="' + esc(d) + ': ' + n + '">' +
          '<div class="chart-bar" style="height:' + h + '%;background:' + (cor || '#1f5c2e') + '"></div>' +
          '<span class="chart-n">' + n + '</span>' +
          '<span class="chart-d">' + esc(diaCurto(d)) + '</span>' +
        '</div>'
      );
    }).join('');
  }

  function celularesDaFamilia(f) {
    if (!f) return [];
    if (f.celulares && f.celulares.length) return f.celulares.slice();
    if (f.celular) return [f.celular];
    return [];
  }

  function chaveFamilia(f) {
    var list = celularesDaFamilia(f);
    return list[0] || '';
  }

  function familiaPorCelular(cel) {
    var dig = ArturApi.onlyDigits(cel);
    return (window.__familias || []).find(function (f) {
      return celularesDaFamilia(f).indexOf(dig) >= 0 || f.celular === dig;
    });
  }

  function exibirCelulares(f) {
    var list = celularesDaFamilia(f).filter(function (c) { return !ehSemCelular(c); });
    if (!list.length) return 'Sem celular';
    return list.map(function (c) { return ArturApi.formatPhone(c); }).join(' · ');
  }

  function nomeFamilia(f) {
    if (!f) return '';
    if (f.nome_pai && f.nome_mae) return f.nome_pai + ' / ' + f.nome_mae;
    return f.nome_pai || f.nome_mae || f.nome_responsavel || '';
  }

  function kidInput(value, checked) {
    var row = document.createElement('div');
    row.className = 'kid-row';
    row.innerHTML =
      '<input type="checkbox" class="presenca-check kid-check" />' +
      '<input type="text" class="kid-name" placeholder="Nome do(a) filho(a)" maxlength="60" />' +
      '<button type="button" class="btn btn-danger remove-kid">X</button>';
    var input = row.querySelector('.kid-name');
    var check = row.querySelector('.kid-check');
    input.value = value || '';
    check.checked = !!checked;
    row.querySelector('.remove-kid').addEventListener('click', function () {
      if (kidsBox.querySelectorAll('.kid-row').length === 1) {
        input.value = '';
        check.checked = false;
        return;
      }
      row.remove();
    });
    check.addEventListener('change', function () {
      onCheckPessoaFormulario(check);
    });
    return row;
  }

  function getFilhos() {
    return Array.prototype.map.call(kidsBox.querySelectorAll('.kid-name'), function (el) {
      return el.value.trim();
    }).filter(Boolean);
  }

  function setFilhos(list, checksMap, celular) {
    var map = checksMap || getChecksLocais();
    var cel = celular || ArturApi.onlyDigits(celularInput.value);
    kidsBox.innerHTML = '';
    (list && list.length ? list : ['']).forEach(function (n) {
      var key = cel + '|crianca|' + n;
      kidsBox.appendChild(kidInput(n, !!map[key]));
    });
  }

  function syncChecksFormulario(familia) {
    var checks = getChecksLocais();
    var cel = (familia && familia.celular) || ArturApi.onlyDigits(celularInput.value);
    var checkPai = document.getElementById('check-pai');
    var checkMae = document.getElementById('check-mae');
    if (checkPai) {
      checkPai.checked = !!(familia && familia.nome_pai && checks[cel + '|pai|' + familia.nome_pai]);
      checkPai.setAttribute('data-cel', cel);
    }
    if (checkMae) {
      checkMae.checked = !!(familia && familia.nome_mae && checks[cel + '|mae|' + familia.nome_mae]);
      checkMae.setAttribute('data-cel', cel);
    }
  }

  async function onCheckPessoaFormulario(box) {
    var cel = ArturApi.onlyDigits(celularInput.value);
    if (cel.length < 10) {
      box.checked = !box.checked;
      alert('Informe o celular antes de marcar presença.');
      return;
    }

    var key;
    if (box.id === 'check-pai') {
      var pai = paiInput.value.trim();
      if (!pai) {
        box.checked = false;
        alert('Digite o nome do pai.');
        return;
      }
      key = cel + '|pai|' + pai;
    } else if (box.id === 'check-mae') {
      var mae = maeInput.value.trim();
      if (!mae) {
        box.checked = false;
        alert('Digite o nome da mãe.');
        return;
      }
      key = cel + '|mae|' + mae;
    } else {
      var row = box.closest('.kid-row');
      var nome = row ? row.querySelector('.kid-name').value.trim() : '';
      if (!nome) {
        box.checked = false;
        alert('Digite o nome da criança.');
        return;
      }
      key = cel + '|crianca|' + nome;
    }

    setCheckLocal(key, box.checked);

    var aindaTem = false;
    if (document.getElementById('check-pai').checked) aindaTem = true;
    if (document.getElementById('check-mae').checked) aindaTem = true;
    kidsBox.querySelectorAll('.kid-check').forEach(function (b) {
      if (b.checked) aindaTem = true;
    });

    try {
      if (aindaTem) await ArturApi.marcarPresente(senha(), cel);
      else await ArturApi.desmarcarPresente(senha(), cel);
      await refresh(false);
      setStatus('Presença atualizada.', aindaTem ? 'ok' : 'warn');
    } catch (err) {
      box.checked = !box.checked;
      setCheckLocal(key, box.checked);
      alert(err.message || 'Erro ao atualizar presença');
    }
  }

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function ordenarPorTelefone(familias) {
    return (familias || []).slice().sort(function (a, b) {
      return String(a.celular || '').localeCompare(String(b.celular || ''), 'pt-BR', { numeric: true });
    });
  }

  async function salvarCadastro() {
    if (!logado || salvando) return;

    var celular = ArturApi.onlyDigits(celularInput.value);
    var celular2 = celular2Input ? ArturApi.onlyDigits(celular2Input.value) : '';
    var pai = paiInput.value.trim();
    var mae = maeInput.value.trim();
    var filhos = getFilhos();
    var faltando = [];

    if (celular && (celular.length < 10 || celular.length > 11)) {
      faltando.push('• Celular 1 completo com DDD (10 ou 11 dígitos), ou deixe em branco');
    }
    if (celular2 && (celular2.length < 10 || celular2.length > 11)) {
      faltando.push('• Celular 2 completo com DDD (10 ou 11 dígitos), ou deixe em branco');
    }

    if (!pai && !mae) faltando.push('• Pai e/ou Mãe');
    if (!filhos.length) faltando.push('• Pelo menos 1 filho(a)');

    if (faltando.length) {
      await mostrarAviso(
        'Preencha os campos obrigatórios antes de salvar:\n\n' + faltando.join('\n'),
        'Campos obrigatórios'
      );
      setStatus('Preencha os campos obrigatórios.', 'err');
      if (celular && (celular.length < 10 || celular.length > 11)) celularInput.focus();
      else if (!pai && !mae) paiInput.focus();
      else kidsBox.querySelector('.kid-name') && kidsBox.querySelector('.kid-name').focus();
      return;
    }

    var celularEnviar = celular;
    var celular2Enviar = celular2;
    if (!celularEnviar && !celular2Enviar && editandoCelularKey) {
      celularEnviar = editandoCelularKey;
    } else if (!celularEnviar && !celular2Enviar) {
      celularEnviar = gerarIdSemCelularLocal();
    }

    var editando = !!(editandoCelularKey || (celularEnviar && familiaPorCelular(celularEnviar)) || (celular2Enviar && familiaPorCelular(celular2Enviar)));
    var pergunta = editando
      ? 'Deseja salvar as alterações deste cadastro?'
      : 'Deseja cadastrar esta família agora?';

    var ok = await pedirConfirmacao(pergunta, {
      titulo: editando ? 'Salvar cadastro' : 'Novo cadastro',
      textoSim: editando ? 'Sim, salvar' : 'Sim, cadastrar',
      textoNao: 'Cancelar',
      classeSim: 'btn-grass'
    });
    if (!ok) {
      setStatus('Para cadastrar mais um filho, clique em “+ Filho(a)”.', 'warn');
      return;
    }

    salvando = true;
    setStatus('Salvando...', '');
    abrirProgresso('Salvando', editando ? 'Atualizando o cadastro...' : 'Gravando o pré-cadastro...');
    try {
      var data = await ArturApi.preCadastro({
        senha: senha(),
        celular: celularEnviar,
        celular2: celular2Enviar,
        celular_chave: editandoCelularKey || '',
        nome_pai: pai,
        nome_mae: mae,
        filhos: filhos
      });
      await fecharProgresso();
      var msg = (data && data.msg) || (editando ? 'Cadastro atualizado.' : 'Pré-cadastro criado.');
      setStatus(msg, 'ok');

      await mostrarAviso(msg, 'Pré-cadastro');

      form.reset();
      editandoCelularKey = null;
      if (celular2Input) celular2Input.value = '';
      var checkPai = document.getElementById('check-pai');
      var checkMae = document.getElementById('check-mae');
      if (checkPai) checkPai.checked = false;
      if (checkMae) checkMae.checked = false;
      setFilhos(['']);
      fecharCadastro();
      await refresh(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      await fecharProgresso();
      var erro = err.message || 'Erro ao salvar';
      setStatus(erro, 'err');
      await mostrarAviso(erro, 'Erro');
    } finally {
      salvando = false;
    }
  }

  function whatsappUrl(celular) {
    if (ehSemCelular(celular)) return '';
    var digitos = ArturApi.onlyDigits(celular);
    if (!digitos) return '';
    if (digitos.indexOf('55') !== 0) digitos = '55' + digitos;
    return 'https://wa.me/' + digitos;
  }

  function ehSemCelular(celular) {
    var c = String(celular || '').replace(/\D/g, '');
    if (!c) return true;
    // IDs internos (990…); 000… legado; números curtos = ID corrompido pelo Sheets
    if (/^990\d{8}$/.test(c) || /^000\d{8}$/.test(c)) return true;
    if (c.length < 10) return true;
    return false;
  }

  function gerarIdSemCelularLocal() {
    var n = String(Date.now()) + String(Math.floor(Math.random() * 900) + 100);
    return '990' + n.slice(-8);
  }

  function exibirCelular(celular) {
    if (!celular || ehSemCelular(celular)) return 'Sem celular';
    return ArturApi.formatPhone(celular);
  }

  function whatsappUrlLista(f) {
    var list = celularesDaFamilia(f).filter(function (c) { return !ehSemCelular(c); });
    if (!list.length) return '';
    return whatsappUrl(list[0]);
  }

  function pct(parte, total) {
    if (!total) return '0%';
    return Math.round((parte / total) * 100) + '%';
  }

  function atualizarDashboard(familias) {
    var lista = familias || [];
    var qtdFamilias = lista.length;
    var cadastrados = 0;
    var adultos = 0;
    var criancas = 0;
    var confirmados = 0;
    var naoConfirmados = 0;
    var confAdultos = 0;
    var confCriancas = 0;
    var naoAdultos = 0;
    var naoCriancas = 0;

    lista.forEach(function (f) {
      var nAdultos = 0;
      if (f.nome_pai) nAdultos += 1;
      if (f.nome_mae) nAdultos += 1;
      var nCriancas = (f.filhos && f.filhos.length) ? f.filhos.length : 0;
      var totalPessoas = nAdultos + nCriancas;

      adultos += nAdultos;
      criancas += nCriancas;
      cadastrados += totalPessoas;

      if (f.status === 'confirmado' || f.status === 'presente') {
        confirmados += totalPessoas;
        confAdultos += nAdultos;
        confCriancas += nCriancas;
      } else {
        naoConfirmados += totalPessoas;
        naoAdultos += nAdultos;
        naoCriancas += nCriancas;
      }
    });

    var elFam = document.getElementById('dash-familias');
    var elCad = document.getElementById('dash-cadastrados');
    var elAdu = document.getElementById('dash-adultos');
    var elCri = document.getElementById('dash-criancas');
    var elAduPct = document.getElementById('dash-adultos-pct');
    var elCriPct = document.getElementById('dash-criancas-pct');
    var elCon = document.getElementById('dash-confirmados');
    var elNao = document.getElementById('dash-nao-confirmados');
    var elConDet = document.getElementById('dash-confirmados-detalhe');
    var elNaoDet = document.getElementById('dash-nao-confirmados-detalhe');

    if (elFam) elFam.textContent = String(qtdFamilias);
    if (elCad) elCad.textContent = String(cadastrados);
    if (elAdu) elAdu.textContent = String(adultos);
    if (elCri) elCri.textContent = String(criancas);
    if (elAduPct) elAduPct.textContent = cadastrados ? ' ' + pct(adultos, cadastrados) : '';
    if (elCriPct) elCriPct.textContent = cadastrados ? ' ' + pct(criancas, cadastrados) : '';
    if (elCon) elCon.textContent = String(confirmados);
    if (elNao) elNao.textContent = String(naoConfirmados);
    if (elConDet) {
      elConDet.textContent = confirmados
        ? ('Ad ' + confAdultos + ' (' + pct(confAdultos, confirmados) + ') · Cr ' + confCriancas + ' (' + pct(confCriancas, confirmados) + ')')
        : '';
    }
    if (elNaoDet) {
      elNaoDet.textContent = naoConfirmados
        ? ('Ad ' + naoAdultos + ' (' + pct(naoAdultos, naoConfirmados) + ') · Cr ' + naoCriancas + ' (' + pct(naoCriancas, naoConfirmados) + ')')
        : '';
    }

    renderGraficoBarras(document.getElementById('chart-cadastros'), window.__cadastrosPorDia || {}, '#1f5c2e');
    renderGraficoBarras(document.getElementById('chart-acessos'), window.__acessosPorDia || {}, '#0b4a7a');
  }

  function pessoasDoTelefone(f) {
    var pessoas = [];
    if (f.nome_pai) {
      pessoas.push({
        papel: 'Responsável',
        tipo: 'resp',
        nome: f.nome_pai,
        key: (f.celular || '') + '|pai|' + f.nome_pai
      });
    }
    if (f.nome_mae) {
      pessoas.push({
        papel: 'Responsável',
        tipo: 'resp',
        nome: f.nome_mae,
        key: (f.celular || '') + '|mae|' + f.nome_mae
      });
    }
    ((f.filhos || []).slice(0, 5)).forEach(function (kid) {
      pessoas.push({
        papel: 'Criança',
        tipo: 'crianca',
        nome: kid,
        key: (f.celular || '') + '|crianca|' + kid
      });
    });
    return pessoas;
  }

  function getChecksLocais() {
    try {
      return JSON.parse(localStorage.getItem('artur_presenca_checks') || '{}') || {};
    } catch (e) {
      return {};
    }
  }

  function setCheckLocal(key, value) {
    var map = getChecksLocais();
    if (value) map[key] = true;
    else delete map[key];
    localStorage.setItem('artur_presenca_checks', JSON.stringify(map));
  }

  function bindChecksPresenca() {
    listaPresencaEl.querySelectorAll('.presenca-check').forEach(function (box) {
      box.addEventListener('change', async function () {
        var cel = box.getAttribute('data-cel');
        var key = box.getAttribute('data-key');
        setCheckLocal(key, box.checked);

        var aindaTemCheck = false;
        listaPresencaEl.querySelectorAll('.presenca-check[data-cel="' + cel + '"]').forEach(function (b) {
          if (b.checked) aindaTemCheck = true;
        });

        try {
          if (aindaTemCheck) {
            await ArturApi.marcarPresente(senha(), cel);
            setStatus('Presença atualizada no local.', 'ok');
          } else {
            await ArturApi.desmarcarPresente(senha(), cel);
            setStatus('Presença da família desmarcada.', 'warn');
          }
          await refresh(false);
          if (!secaoPresenca.classList.contains('hidden')) {
            renderPresenca(window.__familias || []);
          }
        } catch (err) {
          box.checked = !box.checked;
          setCheckLocal(key, box.checked);
          alert(err.message || 'Erro ao atualizar presença');
          setStatus(err.message || 'Erro', 'err');
        }
      });
    });
  }

  function renderPresenca(familias) {
    if (!listaPresencaEl) return;
    var ordenadas = ordenarPorTelefone(familias).filter(function (f) {
      return f.status !== 'nao_vai';
    });
    var checks = getChecksLocais();

    if (!ordenadas.length) {
      listaPresencaEl.innerHTML = '<p class="phone-empty">Nenhuma família para presença.</p>';
      return;
    }

    listaPresencaEl.innerHTML = ordenadas.map(function (f) {
      var pessoas = pessoasDoTelefone(f);
      var linhas = pessoas.map(function (p) {
        var checked = checks[p.key] ? ' checked' : '';
        return (
          '<div class="presenca-linha ' + p.tipo + '">' +
            '<input type="checkbox" class="presenca-check" data-key="' + esc(p.key) + '" data-cel="' + esc(f.celular) + '"' + checked + ' />' +
            '<span class="papel">' + esc(p.papel) + ':</span>' +
            '<span class="nome">' + esc(p.nome) + '</span>' +
          '</div>'
        );
      }).join('');

      return (
        '<article class="presenca-grupo' + (f.status === 'presente' ? ' presente' : '') + '">' +
          '<div class="presenca-fone-titulo">' +
            '<span>' + esc(exibirCelulares(f)) + '</span>' +
            (whatsappUrlLista(f)
              ? '<a class="btn btn-grass btn-wa" href="' + esc(whatsappUrlLista(f)) + '" target="_blank" rel="noopener">WhatsApp</a>'
              : '') +
          '</div>' +
          linhas +
        '</article>'
      );
    }).join('');

    bindChecksPresenca();
  }

  function gerarPdfPresenca() {
    var familias = ordenarPorTelefone(window.__familias || []).filter(function (f) {
      return f.status !== 'nao_vai';
    });
    var tot = contagemTabela(familias);
    var agora = new Date().toLocaleString('pt-BR');

    var blocos = familias.map(function (f, i) {
      var adultos = pessoasDoTelefone(f).filter(function (p) { return p.tipo !== 'crianca'; });
      var criancas = pessoasDoTelefone(f).filter(function (p) { return p.tipo === 'crianca'; });
      var titulo = nomeFamilia(f) || ('Família ' + (i + 1));
      var qtd = adultos.length + criancas.length;

      function linhaPessoa(p) {
        return (
          '<li class="' + (p.tipo === 'crianca' ? 'kid' : 'adulto') + '">' +
            '<span class="ck">☐</span>' +
            '<span class="papel">' + esc(p.papel) + '</span>' +
            '<span class="nm">' + esc(p.nome) + '</span>' +
          '</li>'
        );
      }

      return (
        '<article class="fam">' +
          '<header>' +
            '<span class="num">' + (i + 1) + '</span>' +
            '<div class="tit">' +
              '<strong>' + esc(titulo) + '</strong>' +
              '<em>' + qtd + ' pessoa' + (qtd === 1 ? '' : 's') + ' · ' + esc(statusPdfLabel(f.status)) + '</em>' +
            '</div>' +
          '</header>' +
          '<ul class="pessoas">' +
            adultos.map(linhaPessoa).join('') +
            criancas.map(linhaPessoa).join('') +
          '</ul>' +
        '</article>'
      );
    }).join('');

    if (!blocos) {
      blocos = '<p class="vazio-msg">Nenhuma família para imprimir.</p>';
    }

    var conteudo =
      '<header class="topo">' +
        '<p class="topo-marca">Jump Trampolim Park · Vitória-ES</p>' +
        '<h1>Artur · 7 anos</h1>' +
        '<p class="sub">Lista de presença · 25/11/2026 · 17h45–21h30</p>' +
        '<p class="meta">Gerado em ' + agora + '</p>' +
      '</header>' +
      '<div class="resumo">' +
        '<div class="card"><strong>Famílias</strong><span>' + familias.length + '</span></div>' +
        '<div class="card"><strong>Pessoas</strong><span>' + tot.pessoas + ' · ' + tot.adultos + ' adultos · ' + tot.criancas + ' crianças</span></div>' +
        '<div class="card"><strong>Confirmados</strong><span>' + tot.confTotal + ' (' + pct(tot.confTotal, tot.pessoas) + ')</span></div>' +
      '</div>' +
      '<div class="grade">' + blocos + '</div>';

    var cssExtra =
      '.grade{display:grid;grid-template-columns:1fr 1fr;gap:10px}' +
      '.fam{border:1.5px solid #2d4a2a;border-radius:6px;overflow:hidden;background:#fff}' +
      '.fam header{display:flex;gap:10px;align-items:center;background:#e8f2e4;border-bottom:1px solid #b7cbb0;padding:8px 10px}' +
      '.fam .num{width:28px;height:28px;border-radius:50%;background:#1f5c2e;color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:11pt;flex-shrink:0}' +
      '.fam .tit{min-width:0}' +
      '.fam .tit strong{display:block;font-size:12pt;color:#10240f}' +
      '.fam .tit em{display:block;font-style:normal;font-size:9pt;color:#555;margin-top:2px}' +
      '.pessoas{list-style:none;margin:0;padding:6px 10px 10px}' +
      '.pessoas li{display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px dotted #d0d8cc}' +
      '.pessoas li:last-child{border-bottom:0}' +
      '.pessoas li.kid{padding-left:14px}' +
      '.ck{font-size:15pt;line-height:1;color:#1f5c2e;width:18px;text-align:center;flex-shrink:0}' +
      '.papel{font-size:9pt;text-transform:uppercase;letter-spacing:.03em;color:#666;min-width:58px}' +
      '.nm{font-size:11.5pt;font-weight:600;color:#111}' +
      '.vazio-msg{padding:20px;text-align:center;color:#666}';

    baixarPdf(conteudo, cssExtra, {
      filename: 'artur-7-anos-presenca.pdf',
      orientation: 'portrait',
      btn: btnPdfPresenca
    });
  }

  function maxFilhosNasFamilias(familias) {
    var max = 1;
    (familias || []).forEach(function (f) {
      var n = (f.filhos || []).length;
      if (n > max) max = n;
    });
    return Math.min(Math.max(max, 1), maxFilhosTabela);
  }

  function contagemTabela(familias) {
    var pessoas = 0;
    var adultos = 0;
    var criancas = 0;
    var confAdultos = 0;
    var confCriancas = 0;

    (familias || []).forEach(function (f) {
      var nA = 0;
      if (f.nome_pai) nA += 1;
      if (f.nome_mae) nA += 1;
      var nC = (f.filhos || []).length;
      var total = nA + nC;
      adultos += nA;
      criancas += nC;
      pessoas += total;
      if (f.status === 'confirmado' || f.status === 'presente') {
        confAdultos += nA;
        confCriancas += nC;
      }
    });

    return {
      pessoas: pessoas,
      adultos: adultos,
      criancas: criancas,
      confAdultos: confAdultos,
      confCriancas: confCriancas,
      confTotal: confAdultos + confCriancas
    };
  }

  function pessoaCelulaHtml(f, nome, tipoKey, checks) {
    if (!nome) return '<td class="pessoa-vazia"></td>';
    var key = (f.celular || '') + '|' + tipoKey + '|' + nome;
    var familiaOk = f.status === 'confirmado' || f.status === 'presente';
    var marcado = familiaOk || !!checks[key];
    return (
      '<td class="pessoa-cell">' +
        '<label class="pessoa-check-linha">' +
          '<input type="checkbox" class="presenca-check tabela-check" data-key="' + esc(key) + '" data-cel="' + esc(f.celular) + '"' + (marcado ? ' checked' : '') + ' />' +
          '<span>' + esc(nome) + '</span>' +
        '</label>' +
      '</td>'
    );
  }

  function pessoaCelulaPdf(nome) {
    if (!nome) return '<td class="vazio"></td>';
    return (
      '<td class="pessoa">' +
        '<span class="linha">' +
          '<span class="ck">☐</span>' +
          '<span class="nm">' + esc(nome) + '</span>' +
        '</span>' +
      '</td>'
    );
  }

  function statusPdfLabel(status) {
    var map = {
      pre_cadastro: 'Pré-cad.',
      confirmado: 'Conf.',
      presente: 'Pres.',
      nao_vai: 'Não'
    };
    return map[status] || (status || '—');
  }

  function cssPdfComum() {
    return (
      '@page{margin:12mm}' +
      '*{box-sizing:border-box}' +
      'body{margin:0;padding:0;color:#1a1a1a;font-family:"Segoe UI",Calibri,Arial,sans-serif;font-size:11pt;line-height:1.35;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
      '.sheet{padding:8px 4px 16px}' +
      '.topo{border-bottom:3px solid #1f5c2e;padding:0 0 10px;margin:0 0 14px}' +
      '.topo-marca{font-size:10pt;letter-spacing:.08em;text-transform:uppercase;color:#1f5c2e;font-weight:700;margin:0 0 4px}' +
      '.topo h1{margin:0;font-size:20pt;line-height:1.15;color:#10240f}' +
      '.topo .sub{margin:6px 0 0;font-size:10pt;color:#444}' +
      '.topo .meta{margin:4px 0 0;font-size:9pt;color:#666}' +
      '.barra-acoes{margin:0 0 14px}' +
      '.barra-acoes button{font-size:12pt;padding:8px 14px;cursor:pointer}' +
      '.resumo{display:flex;gap:10px;flex-wrap:wrap;margin:0 0 14px}' +
      '.resumo .card{flex:1;min-width:160px;border:1px solid #c5d2c0;background:#f3f7f1;padding:8px 10px;border-radius:4px}' +
      '.resumo .card strong{display:block;font-size:9pt;text-transform:uppercase;letter-spacing:.04em;color:#1f5c2e;margin:0 0 4px}' +
      '.resumo .card span{font-size:11pt}' +
      '@media print{.barra-acoes{display:none!important}.sheet{padding:0}}'
    );
  }

  function abrirJanelaPdf(html) {
    var win = window.open('', '_blank');
    if (!win) {
      alert('Permita pop-ups para gerar o PDF.');
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
  }

  var gerandoPdf = false;
  var html2pdfPromise = null;

  function carregarHtml2Pdf() {
    if (window.html2pdf) return Promise.resolve(window.html2pdf);
    if (html2pdfPromise) return html2pdfPromise;
    html2pdfPromise = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      s.onload = function () {
        if (window.html2pdf) resolve(window.html2pdf);
        else reject(new Error('Biblioteca de PDF não carregou.'));
      };
      s.onerror = function () {
        html2pdfPromise = null;
        reject(new Error('Falha ao carregar o gerador de PDF. Verifique a internet.'));
      };
      document.head.appendChild(s);
    });
    return html2pdfPromise;
  }

  function ehIos() {
    var ua = navigator.userAgent || '';
    return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  function dispararDownloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();

    // No iPhone/iPad o atributo download costuma falhar: abre o PDF para Salvar/Compartilhar.
    if (ehIos()) {
      setTimeout(function () {
        window.open(url, '_blank');
      }, 120);
    }

    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 60000);
  }

  function baixarPdf(conteudoHtml, cssExtra, opts) {
    opts = opts || {};
    if (gerandoPdf) return;
    gerandoPdf = true;

    var filename = opts.filename || 'artur-7-anos.pdf';
    var orientation = opts.orientation || 'portrait';
    var btn = opts.btn;
    var labelOriginal = btn ? btn.textContent : '';
    var largura = orientation === 'landscape' ? 1500 : 794;

    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Baixando...';
    }
    setStatus('Gerando PDF para download...', '');

    var overlay = null;
    var host = null;
    var scrollX = window.scrollX || window.pageXOffset || 0;
    var scrollY = window.scrollY || window.pageYOffset || 0;

    carregarHtml2Pdf()
      .then(function (html2pdfFn) {
        // Overlay para o usuário não ver o layout temporário
        overlay = document.createElement('div');
        overlay.style.cssText =
          'position:fixed;inset:0;z-index:2147483645;background:rgba(16,36,15,.55);' +
          'display:flex;align-items:center;justify-content:center;color:#fff;' +
          'font-family:sans-serif;font-size:18px;font-weight:700';
        overlay.textContent = 'Gerando PDF...';
        document.body.appendChild(overlay);

        // Conteúdo VISÍVEL na tela (fora da tela / opacity:0 gera 1ª página em branco)
        host = document.createElement('div');
        host.setAttribute('aria-hidden', 'true');
        host.style.cssText =
          'position:fixed;left:0;top:0;z-index:2147483644;background:#ffffff;' +
          'margin:0;padding:0;overflow:visible;pointer-events:none;';
        host.style.width = largura + 'px';
        host.innerHTML =
          '<style id="pdf-temp-style">' +
            cssPdfComum() +
            (cssExtra || '') +
            '.pdf-root{width:100%;background:#fff;color:#1a1a1a;box-sizing:border-box;}' +
            '.pdf-root .status{all:unset;}' +
            '.sheet{padding:12px 24px 20px 16px;margin:0;box-sizing:border-box;}' +
          '</style>' +
          '<div class="sheet pdf-root">' + conteudoHtml + '</div>';
        document.body.appendChild(host);

        window.scrollTo(0, 0);

        var el = host.querySelector('.pdf-root');

        return new Promise(function (resolve) {
          requestAnimationFrame(function () {
            setTimeout(resolve, 180);
          });
        }).then(function () {
          var capturaW = Math.ceil(Math.max(el.scrollWidth, el.offsetWidth)) + 16;
          var capturaH = Math.ceil(el.scrollHeight) + 8;
          return html2pdfFn()
            .set({
              margin: [6, 10, 6, 6],
              filename: filename,
              image: { type: 'jpeg', quality: 0.98 },
              html2canvas: {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                scrollX: 0,
                scrollY: 0,
                windowWidth: capturaW,
                windowHeight: capturaH,
                width: capturaW,
                x: 0,
                y: 0
              },
              jsPDF: { unit: 'mm', format: 'a4', orientation: orientation },
              pagebreak: { mode: ['css'] }
            })
            .from(el)
            .outputPdf('blob');
        });
      })
      .then(function (blob) {
        dispararDownloadBlob(blob, filename);
        setStatus('PDF baixado: ' + filename, 'ok');
      })
      .catch(function (err) {
        alert((err && err.message) || 'Não foi possível baixar o PDF.');
        setStatus((err && err.message) || 'Erro ao gerar PDF', 'err');
      })
      .then(function () {
        if (host && host.parentNode) host.parentNode.removeChild(host);
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
        window.scrollTo(scrollX, scrollY);
        if (btn) {
          btn.disabled = false;
          btn.textContent = labelOriginal;
        }
        gerandoPdf = false;
      });
  }

  function bindChecksTabela() {
    if (!tabelaBodyEl) return;
    tabelaBodyEl.querySelectorAll('.tabela-check').forEach(function (box) {
      box.addEventListener('change', async function () {
        var cel = box.getAttribute('data-cel');
        var key = box.getAttribute('data-key');
        setCheckLocal(key, box.checked);

        var aindaTem = false;
        tabelaBodyEl.querySelectorAll('.tabela-check[data-cel="' + cel + '"]').forEach(function (b) {
          if (b.checked) aindaTem = true;
        });

        try {
          if (aindaTem) await ArturApi.marcarPresente(senha(), cel);
          else await ArturApi.desmarcarPresente(senha(), cel);
          setStatus('Presença atualizada na tabela.', aindaTem ? 'ok' : 'warn');
          await refresh(false);
          if (secaoTabela && !secaoTabela.classList.contains('hidden')) {
            renderTabelaDados(window.__familias || []);
          }
        } catch (err) {
          box.checked = !box.checked;
          setCheckLocal(key, box.checked);
          alert(err.message || 'Erro ao atualizar presença');
        }
      });
    });
  }

  function renderTabelaDados(familias) {
    if (!tabelaBodyEl || !tabelaHeadEl) return;
    var ordenadas = ordenarPorTelefone(familias || []);
    var colsFilhos = maxFilhosNasFamilias(ordenadas);
    var tot = contagemTabela(ordenadas);
    var checks = getChecksLocais();

    if (tabelaResumoEl) {
      tabelaResumoEl.innerHTML =
        '<div class="box">' +
          '<strong>Totais</strong>' +
          'Pessoas: ' + tot.pessoas + '<br>' +
          'Adultos: ' + tot.adultos + ' <span class="pct">(' + pct(tot.adultos, tot.pessoas) + ')</span><br>' +
          'Crianças: ' + tot.criancas + ' <span class="pct">(' + pct(tot.criancas, tot.pessoas) + ')</span>' +
        '</div>' +
        '<div class="box">' +
          '<strong>Confirmados</strong>' +
          'Pessoas: ' + tot.confTotal + '<br>' +
          'Adultos: ' + tot.confAdultos + ' <span class="pct">(' + pct(tot.confAdultos, tot.confTotal) + ')</span><br>' +
          'Crianças: ' + tot.confCriancas + ' <span class="pct">(' + pct(tot.confCriancas, tot.confTotal) + ')</span>' +
        '</div>';
    }

    var headCols =
      '<tr>' +
        '<th class="num">#</th>' +
        '<th class="num">Qtd</th>' +
        '<th>Celular</th>' +
        '<th>☐ Pai</th>' +
        '<th>☐ Mãe</th>';
    for (var h = 1; h <= colsFilhos; h++) {
      headCols += '<th>☐ Filho ' + h + '</th>';
    }
    headCols += '<th>Status</th><th>Cadastro</th><th>Último acesso</th></tr>';
    tabelaHeadEl.innerHTML = headCols;

    if (!ordenadas.length) {
      tabelaBodyEl.innerHTML = '<tr><td colspan="' + (8 + colsFilhos) + '">Nenhum cadastro.</td></tr>';
    }

    var linhasHtml = ordenadas.map(function (f, i) {
      var nA = (f.nome_pai ? 1 : 0) + (f.nome_mae ? 1 : 0);
      var nC = (f.filhos || []).length;
      var qtd = nA + nC;
      var kids = f.filhos || [];
      var cols = '';
      for (var k = 0; k < colsFilhos; k++) {
        cols += pessoaCelulaHtml(f, kids[k] || '', 'crianca', checks);
      }
      return (
        '<tr class="' + esc(f.status) + '">' +
          '<td class="num">' + (i + 1) + '</td>' +
          '<td class="num">' + qtd + '</td>' +
          '<td>' + esc(exibirCelulares(f)) + '</td>' +
          pessoaCelulaHtml(f, f.nome_pai || '', 'pai', checks) +
          pessoaCelulaHtml(f, f.nome_mae || '', 'mae', checks) +
          cols +
          '<td>' + esc(f.status || '') + '</td>' +
          '<td>' + esc(formatarDataHora(f.criado_em)) + '</td>' +
          '<td>' + esc(formatarDataHora(f.ultimo_acesso_em)) + '</td>' +
        '</tr>'
      );
    }).join('');

    var inicioBranco = ordenadas.length + 1;
    for (var b = 0; b < 20; b++) {
      var colsVazias = '';
      for (var c = 0; c < colsFilhos + 2; c++) {
        colsVazias += '<td class="linha-branco"><span class="box-branco">☐</span></td>';
      }
      linhasHtml +=
        '<tr class="linha-extra">' +
          '<td class="num">' + (inicioBranco + b) + '</td>' +
          '<td class="num"></td>' +
          '<td class="linha-branco"></td>' +
          colsVazias +
          '<td class="linha-branco"></td>' +
          '<td class="linha-branco"></td>' +
          '<td class="linha-branco"></td>' +
        '</tr>';
    }

    tabelaBodyEl.innerHTML = linhasHtml;
    bindChecksTabela();
    sincronizarScrollTabela();
  }

  function sincronizarScrollTabela() {
    if (!tabelaScrollTop || !tabelaScrollTopInner || !tabelaScrollMain) return;
    var tabela = document.getElementById('tabela-dados');
    if (!tabela) return;

    function medir() {
      tabelaScrollTopInner.style.width = Math.max(tabela.scrollWidth, tabelaScrollMain.clientWidth) + 'px';
      var precisaHorizontal = tabela.scrollWidth > tabelaScrollMain.clientWidth + 2;
      tabelaScrollTop.style.display = precisaHorizontal ? 'block' : 'none';
    }

    medir();
    requestAnimationFrame(medir);

    if (tabelaScrollTop._bound) return;
    tabelaScrollTop._bound = true;

    tabelaScrollTop.addEventListener('scroll', function () {
      if (tabelaScrollSyncing) return;
      tabelaScrollSyncing = true;
      tabelaScrollMain.scrollLeft = tabelaScrollTop.scrollLeft;
      tabelaScrollSyncing = false;
    });

    tabelaScrollMain.addEventListener('scroll', function () {
      if (tabelaScrollSyncing) return;
      tabelaScrollSyncing = true;
      tabelaScrollTop.scrollLeft = tabelaScrollMain.scrollLeft;
      tabelaScrollSyncing = false;
    });

    window.addEventListener('resize', medir);
  }

  function gerarPdfTabela() {
    var ordenadas = ordenarPorTelefone(window.__familias || []);
    var tot = contagemTabela(ordenadas);
    var agora = new Date().toLocaleString('pt-BR');

    function linhaPessoaPdf(papel, nome) {
      if (!nome) return '';
      return (
        '<div class="p-linha">' +
          '<span class="ck">☐</span>' +
          '<span class="papel">' + esc(papel) + '</span>' +
          '<span class="nm">' + esc(nome) + '</span>' +
        '</div>'
      );
    }

    var body = ordenadas.map(function (f, i) {
      var nA = (f.nome_pai ? 1 : 0) + (f.nome_mae ? 1 : 0);
      var kids = f.filhos || [];
      var nC = kids.length;
      var pessoasHtml =
        linhaPessoaPdf('Pai', f.nome_pai || '') +
        linhaPessoaPdf('Mãe', f.nome_mae || '') +
        kids.map(function (nome, idx) {
          return linhaPessoaPdf('Filho ' + (idx + 1), nome);
        }).join('');

      return (
        '<tr class="st-' + esc(f.status || '') + '">' +
          '<td class="c num">' + (i + 1) + '</td>' +
          '<td class="c qtd">' + (nA + nC) + '</td>' +
          '<td class="pessoas">' + pessoasHtml + '</td>' +
          '<td class="col-status"><span class="pdf-badge">' + esc(statusPdfLabel(f.status)) + '</span></td>' +
        '</tr>'
      );
    }).join('');

    var inicioBranco = ordenadas.length + 1;
    for (var b = 0; b < 12; b++) {
      body +=
        '<tr class="extra">' +
          '<td class="c num">' + (inicioBranco + b) + '</td>' +
          '<td class="c qtd"></td>' +
          '<td class="pessoas">' +
            '<div class="p-linha"><span class="ck">☐</span><span class="nm linha-vazia"></span></div>' +
            '<div class="p-linha"><span class="ck">☐</span><span class="nm linha-vazia"></span></div>' +
            '<div class="p-linha"><span class="ck">☐</span><span class="nm linha-vazia"></span></div>' +
          '</td>' +
          '<td class="col-status"></td>' +
        '</tr>';
    }

    var conteudo =
      '<header class="topo">' +
        '<p class="topo-marca">Jump Trampolim Park · Vitória-ES</p>' +
        '<h1>Artur · 7 anos — Lista da porta</h1>' +
        '<p class="sub">25/11/2026 · 17h45–21h30 · marque ☐ na entrada</p>' +
        '<p class="meta">Gerado em ' + agora + '</p>' +
      '</header>' +
      '<div class="resumo">' +
        '<div class="card"><strong>Totais</strong><span>' + tot.pessoas + ' pessoas · ' + tot.adultos + ' adultos · ' + tot.criancas + ' crianças</span></div>' +
        '<div class="card"><strong>Confirmados</strong><span>' + tot.confTotal + ' (' + pct(tot.confTotal, tot.pessoas) + ')</span></div>' +
        '<div class="card"><strong>Famílias</strong><span>' + ordenadas.length + '</span></div>' +
      '</div>' +
      '<div class="porta-wrap">' +
        '<table class="porta">' +
          '<thead><tr>' +
            '<th class="c">#</th>' +
            '<th class="c">Qtd</th>' +
            '<th>Pessoas</th>' +
            '<th class="col-status">Status</th>' +
          '</tr></thead>' +
          '<tbody>' + body + '</tbody>' +
        '</table>' +
      '</div>' +
      '<p class="legenda">Linhas em branco no final para chegadas sem cadastro.</p>';

    var cssExtra =
      '.sheet{font-size:11pt;padding:12px 24px 20px 12px;box-sizing:border-box}' +
      '.topo h1{font-size:18pt}' +
      /* Contorno externo: garante a borda da direita no PDF (html2canvas corta borda da última célula) */
      '.porta-wrap{border:2px solid #2d4a2a;background:#fff;overflow:visible;box-sizing:border-box;margin:0 2px 0 0}' +
      'table.porta{width:100%;border-collapse:collapse;table-layout:fixed;border:none;margin:0}' +
      'table.porta th,table.porta td{border:1px solid #2d4a2a;padding:8px 10px;vertical-align:top;background:transparent}' +
      'table.porta th{background:#1f5c2e;color:#fff;font-size:10pt;text-align:left;font-weight:700}' +
      'table.porta th.c,table.porta td.c{text-align:center;vertical-align:middle;width:52px}' +
      'table.porta td.num{font-weight:700;background:#eef5eb;font-size:12pt}' +
      'table.porta td.qtd{font-weight:700;font-size:12pt;vertical-align:middle}' +
      'table.porta td.pessoas{width:auto}' +
      'table.porta td.col-status{width:90px;max-width:90px;text-align:center;vertical-align:middle;background:#fff !important;padding:6px 6px}' +
      'table.porta th:last-child{width:90px;max-width:90px;text-align:center;padding:8px 6px;white-space:nowrap;overflow:visible;font-size:9pt;letter-spacing:0}' +
      'table.porta th:last-child,table.porta td:last-child{border-right:none}' +
      'table.porta th:first-child,table.porta td:first-child{border-left:none}' +
      'table.porta thead th{border-top:none}' +
      'table.porta tbody tr:last-child td{border-bottom:none}' +
      '.p-linha{display:flex;align-items:center;gap:8px;padding:3px 0}' +
      '.p-linha .ck{font-size:14pt;color:#1f5c2e;width:20px;flex:0 0 20px;line-height:1}' +
      '.p-linha .papel{flex:0 0 58px;font-size:9pt;text-transform:uppercase;letter-spacing:.03em;color:#666}' +
      '.p-linha .nm{flex:1;font-size:12pt;font-weight:700;color:#111;white-space:normal;word-break:normal}' +
      '.p-linha .nm.linha-vazia{border-bottom:1px solid #bbb;min-height:16px;display:block}' +
      '.pdf-badge{display:inline-block;padding:3px 5px;border-radius:8px;font-size:8pt;font-weight:700;background:#e8eee6;color:#234;white-space:nowrap}' +
      'tr.st-confirmado .pdf-badge{background:#d7f0d8;color:#145214}' +
      'tr.st-presente .pdf-badge{background:#cfe8ff;color:#0b4a7a}' +
      'tr.st-pre_cadastro .pdf-badge{background:#fff3cd;color:#7a5b00}' +
      'tr.st-nao_vai .pdf-badge{background:#f8d7da;color:#842029}' +
      'tbody tr:nth-child(even):not(.extra) td.pessoas,tbody tr:nth-child(even):not(.extra) td.qtd{background:#f7faf6}' +
      'tr.extra td{background:#fff}' +
      '.legenda{margin-top:12px;font-size:9pt;color:#555}';

    baixarPdf(conteudo, cssExtra, {
      filename: 'artur-7-anos-lista-porta.pdf',
      orientation: 'portrait',
      btn: btnPdfTabela
    });
  }

  function renderLista(familias) {
    var ordenadas = ordenarPorTelefone(familias);
    atualizarDashboard(ordenadas);
    if (!secaoPresenca.classList.contains('hidden')) {
      renderPresenca(ordenadas);
    }
    if (secaoTabela && !secaoTabela.classList.contains('hidden')) {
      renderTabelaDados(ordenadas);
    }
    var filtro = (buscaInput.value || '').trim().toLowerCase();
    var filtroDigitos = ArturApi.onlyDigits(filtro);

    var filtered = ordenadas.filter(function (f) {
      if (!filtro) return true;
      if (filtroDigitos) {
        var phones = celularesDaFamilia(f).join(' ');
        if (phones.indexOf(filtroDigitos) !== -1) return true;
      }
      var blob = [f.nome_pai, f.nome_mae, f.nome_responsavel, (f.filhos || []).join(' '), f.status].join(' ').toLowerCase();
      return blob.indexOf(filtro) !== -1;
    });

    var meias = 0;
    var confirmados = 0;
    var presentes = 0;
    var naoVai = 0;
    ordenadas.forEach(function (f) {
      meias += Number(f.qtd_meias || (f.filhos || []).length || 0);
      if (f.status === 'confirmado') confirmados += 1;
      if (f.status === 'presente') presentes += 1;
      if (f.status === 'nao_vai') naoVai += 1;
    });

    statsEl.textContent =
      ordenadas.length + ' famílias · ' +
      confirmados + ' confirmadas · ' +
      presentes + ' presentes · ' +
      naoVai + ' não vão · ' +
      meias + ' meias';

    if (!filtered.length) {
      listaEl.innerHTML = '<p class="phone-empty">Nenhum cadastro encontrado.</p>';
      if (buscaResultado) {
        buscaResultado.textContent = filtro
          ? 'Nenhum resultado para “' + (buscaInput.value || '').trim() + '”.'
          : 'Nenhuma família na lista.';
      }
      return;
    }

    if (buscaResultado) {
      buscaResultado.textContent = filtro
        ? filtered.length + ' resultado(s) enquanto você digita.'
        : ordenadas.length + ' família(s) na lista.';
    }

    listaEl.innerHTML = filtered.map(function (f) {
      var checks = getChecksLocais();
      var celKey = chaveFamilia(f);
      var pessoas = pessoasDoTelefone(f).map(function (p) {
        var checked = checks[p.key] ? ' checked' : '';
        return (
          '<div class="presenca-linha ' + p.tipo + '">' +
            '<input type="checkbox" class="presenca-check lista-check" data-key="' + esc(p.key) + '" data-cel="' + esc(celKey) + '"' + checked + ' />' +
            '<span class="papel">' + esc(p.papel) + ':</span>' +
            '<span class="nome">' + esc(p.nome) + '</span>' +
          '</div>'
        );
      }).join('');

      return (
        '<article class="phone-card" data-cel="' + esc(celKey) + '">' +
          '<div class="phone-card-top">' +
            '<strong class="phone-number">' + esc(exibirCelulares(f)) + '</strong>' +
            '<span class="badge ' + esc(f.status) + '">' + esc(f.status) + '</span>' +
          '</div>' +
          pessoas +
          '<p class="phone-meias">Meias: ' + esc(f.qtd_meias || (f.filhos || []).length || 0) + '</p>' +
          '<div class="phone-meta">' +
            '<span>Cadastro: <strong>' + esc(formatarDataHora(f.criado_em)) + '</strong></span>' +
            '<span>Último acesso: <strong>' + esc(formatarDataHora(f.ultimo_acesso_em)) + '</strong></span>' +
          '</div>' +
          '<div class="phone-actions">' +
            (whatsappUrlLista(f)
              ? '<a class="btn btn-grass" href="' + esc(whatsappUrlLista(f)) + '" target="_blank" rel="noopener">WhatsApp</a>'
              : '') +
            '<button type="button" class="btn btn-wood" data-act="editar" data-cel="' + esc(celKey) + '">Editar</button>' +
            '<button type="button" class="btn btn-danger" data-act="excluir" data-cel="' + esc(celKey) + '">Excluir</button>' +
          '</div>' +
        '</article>'
      );
    }).join('');

    listaEl.querySelectorAll('.lista-check').forEach(function (box) {
      box.addEventListener('change', async function () {
        var cel = box.getAttribute('data-cel');
        var key = box.getAttribute('data-key');
        setCheckLocal(key, box.checked);

        var aindaTemCheck = false;
        listaEl.querySelectorAll('.lista-check[data-cel="' + cel + '"]').forEach(function (b) {
          if (b.checked) aindaTemCheck = true;
        });

        try {
          if (aindaTemCheck) await ArturApi.marcarPresente(senha(), cel);
          else await ArturApi.desmarcarPresente(senha(), cel);
          setStatus('Presença atualizada.', aindaTemCheck ? 'ok' : 'warn');
          await refresh(false);
        } catch (err) {
          box.checked = !box.checked;
          setCheckLocal(key, box.checked);
          alert(err.message || 'Erro ao atualizar presença');
        }
      });
    });

    listaEl.querySelectorAll('button[data-act]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        var act = btn.getAttribute('data-act');
        var cel = btn.getAttribute('data-cel');
        var familia = familiaPorCelular(cel);

        try {
          if (act === 'editar' && familia) {
            editandoCelularKey = chaveFamilia(familia) || null;
            var phones = celularesDaFamilia(familia).filter(function (c) { return !ehSemCelular(c); });
            celularInput.value = phones[0] ? ArturApi.formatPhone(phones[0]) : '';
            if (celular2Input) celular2Input.value = phones[1] ? ArturApi.formatPhone(phones[1]) : '';
            paiInput.value = familia.nome_pai || '';
            maeInput.value = familia.nome_mae || '';
            setFilhos(familia.filhos, getChecksLocais(), chaveFamilia(familia));
            syncChecksFormulario(familia);
            abrirCadastro();
            setStatus('Cadastro carregado. Use os checks de presença e salve se alterar dados.', 'warn');
            return;
          }
          if (act === 'excluir') {
            var nome = familia ? nomeFamilia(familia) : '';
            var fone = familia ? exibirCelulares(familia) : exibirCelular(cel);
            var msg =
              'Deseja realmente EXCLUIR este cadastro?\n\n' +
              'Telefone: ' + fone +
              (nome ? '\nFamília: ' + nome : '') +
              '\n\nEsta ação não pode ser desfeita.';
            var ok = await pedirConfirmacao(msg, {
              titulo: 'Excluir cadastro',
              textoSim: 'Sim, excluir',
              textoNao: 'Não, manter',
              classeSim: 'btn-danger'
            });
            if (!ok) {
              setStatus('Exclusão cancelada. Cadastro mantido.', 'warn');
              return;
            }
            await ArturApi.excluir(senha(), cel);
            setStatus('Cadastro excluído.', 'ok');
            await refresh(false);
          }
        } catch (err) {
          alert(err.message || 'Erro');
          setStatus(err.message || 'Erro', 'err');
        }
      });
    });
  }

  async function refresh(fromLogin) {
    if (!ArturApi.ready()) {
      var msg = 'Configure config.js com a URL do Apps Script.';
      if (fromLogin) setLoginStatus(msg, 'err');
      else setStatus(msg, 'err');
      return false;
    }
    if (!senha()) {
      if (fromLogin) setLoginStatus('Digite a senha.', 'warn');
      else setStatus('Digite a senha.', 'warn');
      return false;
    }
    try {
      var data = await ArturApi.listar(senha());
      window.__familias = ordenarPorTelefone(data.familias || []);
      window.__acessosPorDia = data.acessos_por_dia || {};
      window.__cadastrosPorDia = data.cadastros_por_dia || {};
      // fallback se API antiga ainda não tiver cadastros_por_dia
      if (!Object.keys(window.__cadastrosPorDia).length) {
        var mapCad = {};
        window.__familias.forEach(function (f) {
          var dia = diaBrasilia(f.criado_em);
          if (dia) {
            mapCad[dia] = (mapCad[dia] || 0) + 1;
          }
        });
        window.__cadastrosPorDia = mapCad;
      }
      mostrarApp();
      renderLista(window.__familias);
      setStatus(fromLogin ? 'Lista carregada por telefone.' : 'Lista atualizada.', 'ok');
      return true;
    } catch (err) {
      var erro = err.message || 'Erro ao listar';
      if (fromLogin) setLoginStatus(erro, 'err');
      else setStatus(erro, 'err');
      return false;
    }
  }

  async function entrar() {
    setLoginStatus('Verificando...', '');
    await refresh(true);
  }

  celularInput.addEventListener('input', function () {
    celularInput.value = ArturApi.formatPhone(celularInput.value);
  });
  if (celular2Input) {
    celular2Input.addEventListener('input', function () {
      celular2Input.value = ArturApi.formatPhone(celular2Input.value);
    });
  }

  addKidBtn.addEventListener('click', function () {
    kidsBox.appendChild(kidInput(''));
  });

  // Enter em campos de texto do formulário: pergunta se quer salvar
  form.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    if (e.target && (e.target.tagName === 'TEXTAREA' || e.target.type === 'checkbox')) return;
    e.preventDefault();
    salvarCadastro();
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    salvarCadastro();
  });

  function filtrarAgora() {
    renderLista(window.__familias || []);
  }

  function agendarFiltro() {
    clearTimeout(buscaTimer);
    buscaTimer = setTimeout(filtrarAgora, 80);
  }

  btnEntrar.addEventListener('click', entrar);
  btnRefresh.addEventListener('click', function () { refresh(false); });
  btnToggleCadastro.addEventListener('click', toggleCadastro);
  btnFecharCadastro.addEventListener('click', fecharCadastro);
  btnTogglePresenca.addEventListener('click', togglePresenca);
  btnFecharPresenca.addEventListener('click', fecharPresenca);
  btnPdfPresenca.addEventListener('click', gerarPdfPresenca);
  btnToggleTabela.addEventListener('click', toggleTabela);
  btnFecharTabela.addEventListener('click', fecharTabela);
  btnPdfTabela.addEventListener('click', gerarPdfTabela);

  var checkPaiEl = document.getElementById('check-pai');
  var checkMaeEl = document.getElementById('check-mae');
  if (checkPaiEl) checkPaiEl.addEventListener('change', function () { onCheckPessoaFormulario(checkPaiEl); });
  if (checkMaeEl) checkMaeEl.addEventListener('change', function () { onCheckPessoaFormulario(checkMaeEl); });

  senhaInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      entrar();
    }
  });
  ['input', 'keyup', 'search', 'paste'].forEach(function (evName) {
    buscaInput.addEventListener(evName, agendarFiltro);
  });

  setFilhos(['']);
})();
