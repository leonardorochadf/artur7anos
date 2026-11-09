(function () {
  var senhaInput = document.getElementById('senha');
  var form = document.getElementById('form-admin');
  var celularInput = document.getElementById('celular');
  var celular2Input = document.getElementById('celular2');
  var paiInput = document.getElementById('nome-pai');
  var maeInput = document.getElementById('nome-mae');
  var kidsBox = document.getElementById('kids');
  var addKidBtn = document.getElementById('add-kid');
  var adultsBox = document.getElementById('adults');
  var addAdultBtn = document.getElementById('add-adult');
  var checkLiberarGeral = document.getElementById('check-liberar-geral');
  var checkLiberarFamilia = document.getElementById('check-liberar-familia');
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
  var checkTodosExcluir = document.getElementById('check-todos-excluir');
  var btnExcluirSelecionados = document.getElementById('btn-excluir-selecionados');
  var buscaLogsInput = document.getElementById('busca-logs');
  var buscaLogsResultado = document.getElementById('busca-logs-resultado');
  var tabelaCadastrosLogBody = document.getElementById('tabela-cadastros-log-body');
  var tabelaAcessosLogBody = document.getElementById('tabela-acessos-log-body');
  var tabelaMissaoLogBody = document.getElementById('tabela-missao-log-body');
  var buscaLogsTimer = null;
  var telaLogin = document.getElementById('tela-login');
  var telaApp = document.getElementById('tela-app');
  var logado = false;
  var salvando = false;
  var excluindo = false;
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
      if (checkLiberarFamilia) checkLiberarFamilia.checked = false;
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
    var scrollNav = document.getElementById('admin-scroll-nav');
    if (scrollNav) scrollNav.classList.remove('hidden');
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

  function htmlCelularesEmpilhados(f) {
    var list = celularesDaFamilia(f).filter(function (c) { return !ehSemCelular(c); });
    if (!list.length) {
      return '<span class="phone-number">Sem celular</span>';
    }
    return (
      '<div class="phone-numbers">' +
      list.map(function (c) {
        return '<strong class="phone-number">' + esc(ArturApi.formatPhone(c)) + '</strong>';
      }).join('') +
      '</div>'
    );
  }

  function nomeFamilia(f) {
    if (!f) return '';
    if (f.nome_pai && f.nome_mae) return f.nome_pai + ' / ' + f.nome_mae;
    return f.nome_pai || f.nome_mae || f.nome_responsavel || '';
  }

  function adultInput(value, checked) {
    var row = document.createElement('div');
    row.className = 'kid-row';
    row.innerHTML =
      '<input type="checkbox" class="presenca-check adult-check" />' +
      '<input type="text" class="adult-name" placeholder="Nome do adulto" maxlength="60" />' +
      '<button type="button" class="btn btn-danger remove-adult">X</button>';
    var input = row.querySelector('.adult-name');
    var check = row.querySelector('.adult-check');
    input.value = value || '';
    check.checked = !!checked;
    row.querySelector('.remove-adult').addEventListener('click', function () {
      if (adultsBox.querySelectorAll('.kid-row').length === 1) {
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

  function getAdultos() {
    if (!adultsBox) return [];
    return Array.prototype.map.call(adultsBox.querySelectorAll('.adult-name'), function (el) {
      return el.value.trim();
    }).filter(Boolean);
  }

  function setAdultos(list, checksMap, celular) {
    if (!adultsBox) return;
    var map = checksMap || getChecksLocais();
    var cel = celular || ArturApi.onlyDigits(celularInput.value);
    adultsBox.innerHTML = '';
    (list && list.length ? list : ['']).forEach(function (n) {
      var key = cel + '|adulto|' + n;
      adultsBox.appendChild(adultInput(n, !!map[key]));
    });
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
      var nomeKid = row ? (row.querySelector('.kid-name') || row.querySelector('.adult-name')) : null;
      var nome = nomeKid ? nomeKid.value.trim() : '';
      if (!nome) {
        box.checked = false;
        alert(box.classList.contains('adult-check') ? 'Digite o nome do adulto.' : 'Digite o nome da criança.');
        return;
      }
      key = cel + (box.classList.contains('adult-check') ? '|adulto|' : '|crianca|') + nome;
    }

    setCheckLocal(key, box.checked);

    try {
      var msg = await sincronizarStatusPeloCheck(cel, box.checked);
      setStatus(msg, box.checked ? 'ok' : 'warn');
      await refresh(false);
    } catch (err) {
      box.checked = !box.checked;
      setCheckLocal(key, box.checked);
      alert(err.message || 'Erro ao atualizar presença');
      setStatus(err.message || 'Erro', 'err');
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

    var celular = ArturApi.normalizarCelular(celularInput.value);
    var celular2 = celular2Input ? ArturApi.normalizarCelular(celular2Input.value) : '';
    var pai = paiInput.value.trim();
    var mae = maeInput.value.trim();
    var filhos = getFilhos();
    var adultos = getAdultos();
    var faltando = [];

    if (celular && (celular.length < 10 || celular.length > 11)) {
      faltando.push('• Celular 1 completo com DDD (10 ou 11 dígitos), ou deixe em branco');
    }
    if (celular2 && (celular2.length < 10 || celular2.length > 11)) {
      faltando.push('• Celular 2 completo com DDD (10 ou 11 dígitos), ou deixe em branco');
    }

    if (!pai && !mae && !adultos.length) faltando.push('• Pai, Mãe e/ou outro adulto');

    if (faltando.length) {
      await mostrarAviso(
        'Preencha os campos obrigatórios antes de salvar:\n\n' + faltando.join('\n'),
        'Campos obrigatórios'
      );
      setStatus('Preencha os campos obrigatórios.', 'err');
      if (celular && (celular.length < 10 || celular.length > 11)) celularInput.focus();
      else if (!pai && !mae && !adultos.length) paiInput.focus();
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

    var listaCelularesEnvio = [celularEnviar, celular2Enviar].filter(function (c) {
      return !!c && String(c).replace(/\D/g, '').length >= 10;
    });
    // se só IDs internos
    if (!listaCelularesEnvio.length && celularEnviar) {
      listaCelularesEnvio = [celularEnviar];
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
      setStatus('Cadastro não salvo.', 'warn');
      return;
    }

    salvando = true;
    setStatus('Salvando...', '');
    abrirProgresso('Salvando', editando ? 'Atualizando o cadastro...' : 'Gravando o pré-cadastro...');
    try {
      var data = await ArturApi.preCadastro({
        senha: senha(),
        celular: listaCelularesEnvio[0] || celularEnviar,
        celular2: listaCelularesEnvio[1] || '',
        celulares: listaCelularesEnvio,
        celular_chave: editandoCelularKey || listaCelularesEnvio[0] || '',
        nome_pai: pai,
        nome_mae: mae,
        filhos: filhos,
        adultos: adultos,
        liberar_acompanhantes: !!(checkLiberarFamilia && checkLiberarFamilia.checked)
      });
      await fecharProgresso();
      var msg = (data && data.msg) || (editando ? 'Cadastro atualizado.' : 'Pré-cadastro criado.');
      var salvos = (data && data.familia && data.familia.celulares) ? data.familia.celulares : [];
      var reais = salvos.filter(function (c) { return c && !ehSemCelular(c); });
      if (listaCelularesEnvio.length >= 2 && reais.length < 2) {
        msg += '\n\nAtenção: o Celular 2 não gravou. Republiche o Apps Script (v8.3) e salve de novo.';
      } else if (reais.length >= 2) {
        msg += '\n\nCelulares: ' + reais.map(function (c) { return ArturApi.formatPhone(c); }).join(' · ');
      }
      setStatus(msg.replace(/\n\n/g, ' '), reais.length >= 2 || listaCelularesEnvio.length < 2 ? 'ok' : 'warn');

      await mostrarAviso(msg, 'Pré-cadastro');

      form.reset();
      editandoCelularKey = null;
      if (celular2Input) celular2Input.value = '';
      var checkPai = document.getElementById('check-pai');
      var checkMae = document.getElementById('check-mae');
      if (checkPai) checkPai.checked = false;
      if (checkMae) checkMae.checked = false;
      if (checkLiberarFamilia) checkLiberarFamilia.checked = false;
      setFilhos(['']);
      setAdultos(['']);
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

  function linkConvite() {
    return 'https://www.artur7anos.com.br/';
  }

  function mensagemWhatsappConfirmacao(f, filtro) {
    var nome = nomeFamilia(f) || 'familia';
    var link = linkConvite();
    // Somente ASCII + *negrito* (evita "?" no WhatsApp)

    if (filtro === 'pendentes') {
      return (
        'Oi, *' + nome + '*! Tudo bem?\n\n' +
        'Passando para confirmar se voces vao ao *aniversario de 7 anos do Artur*!\n\n' +
        '- *Data:* 25/11 (quarta-feira)\n' +
        '- *Horario:* das 17h45 as 21h30\n' +
        '- *Local:* Jump Trampolim Park\n\n' +
        'Por favor, confirme pelo link se *vao* ou *nao*:\n' +
        link
      );
    }
    if (filtro === 'nao_vao') {
      return (
        'Oi, *' + nome + '*! Tudo bem?\n\n' +
        'Vi o registro de que *nao poderao ir* ao aniversario do Artur.\n' +
        'Se mudarem de ideia, e so confirmar pelo link:\n' +
        link
      );
    }
    return (
      'Oi, *' + nome + '*! Tudo bem?\n\n' +
      'Obrigado pela *confirmacao* no aniversario do Artur!\n\n' +
      '- *Data:* 25/11\n' +
      '- *Horario:* 17h45-21h30\n' +
      '- *Local:* Jump Trampolim Park\n\n' +
      'Qualquer ajuste, use o link:\n' +
      link
    );
  }

  function whatsappUrl(celular, texto) {
    if (ehSemCelular(celular)) return '';
    var digitos = ArturApi.onlyDigits(celular);
    if (!digitos) return '';
    if (digitos.indexOf('55') !== 0) digitos = '55' + digitos;
    // api.whatsapp.com costuma preservar melhor o texto no mobile
    var url = 'https://api.whatsapp.com/send?phone=' + digitos;
    if (texto) url += '&text=' + encodeURIComponent(texto);
    return url;
  }

  function whatsappUrlSomenteTexto(texto) {
    if (!texto) return '#';
    return 'https://api.whatsapp.com/send?text=' + encodeURIComponent(texto);
  }

  function contratoFesta() {
    var cfg = (window.ARTUR_CONFIG && window.ARTUR_CONFIG.contrato) || {};
    var pessoas = Number(cfg.pessoas);
    var pulantes = Number(cfg.pulantes);
    return {
      pessoas: pessoas > 0 ? pessoas : 85,
      pulantes: pulantes > 0 ? pulantes : 50
    };
  }

  function textoSaldoContrato(atual, meta, rotulo) {
    var diff = Number(atual || 0) - Number(meta || 0);
    if (diff === 0) return rotulo + ' no contrato';
    if (diff < 0) return 'restam ' + Math.abs(diff);
    return Math.abs(diff) + ' acima do contrato';
  }

  function pctContrato(atual, meta) {
    var m = Number(meta) || 0;
    if (!m) return '0%';
    return Math.min(999, Math.round((Number(atual || 0) / m) * 100)) + '%';
  }

  function barraContratoPct(atual, meta) {
    var m = Number(meta) || 0;
    if (!m) return 0;
    return Math.max(0, Math.min(100, Math.round((Number(atual || 0) / m) * 100)));
  }

  function htmlCardsContrato(tot) {
    var c = contratoFesta();
    var pessoas = tot && tot.pessoas != null ? tot.pessoas : 0;
    var pulantes = tot && tot.criancas != null ? tot.criancas : 0;
    return (
      '<div class="card"><strong>Contrato · pessoas</strong><span>' +
        pessoas + ' / ' + c.pessoas + ' · ' + textoSaldoContrato(pessoas, c.pessoas, 'pessoas') +
      '</span></div>' +
      '<div class="card"><strong>Contrato · pulantes</strong><span>' +
        pulantes + ' / ' + c.pulantes + ' · ' + textoSaldoContrato(pulantes, c.pulantes, 'pulantes') +
        ' (crianças)' +
      '</span></div>'
    );
  }

  function montarMensagemStatusWhatsapp(s) {
    var c = contratoFesta();
    // ASCII + *negrito* (melhor no WhatsApp)
    var linhas = [
      '*STATUS - Aniversario Artur 7 anos*',
      '*Data:* 25/11 · Jump Trampolim Park · 17h45-21h30',
      '',
      '*Contrato Jump*',
      '- Quantidade de pessoas: *' + c.pessoas + '* (adultos + criancas)',
      '- Numero de pulantes: *' + c.pulantes + '* (criancas)',
      '',
      '*Agora no cadastro (esperado)*',
      '- Pessoas: *' + s.pessoas + '* de ' + c.pessoas + ' · ' + textoSaldoContrato(s.pessoas, c.pessoas, 'pessoas'),
      '- Pulantes/criancas: *' + s.criancas + '* de ' + c.pulantes + ' · ' + textoSaldoContrato(s.criancas, c.pulantes, 'pulantes'),
      '- Adultos: ' + s.adultos,
      '',
      '*Familias:* ' + s.familias,
      '- Confirmaram (vao): ' + s.famConf + ' · ' + s.confPessoas + ' pessoas',
      '  Adultos ' + s.confAdultos + ' · Pulantes ' + s.confCriancas,
      '- Ainda nao confirmaram: ' + s.famPend + ' · ' + s.pendPessoas + ' pessoas',
      '  Adultos ' + s.pendAdultos + ' · Pulantes ' + s.pendCriancas,
      '- Nao vao: ' + s.famNao + ' · ' + s.naoVaoPessoas + ' pessoas (fora do esperado)'
    ];

    if (s.famPend > 0 || s.pessoas < c.pessoas || s.criancas < c.pulantes) {
      linhas.push('');
      linhas.push('*O que falta:*');
      if (s.famPend > 0) {
        linhas.push(
          '- Confirmar ' + s.famPend + ' familia' + (s.famPend === 1 ? '' : 's') +
            ' (' + s.pendPessoas + ' pessoa' + (s.pendPessoas === 1 ? '' : 's') + ')'
        );
      }
      if (s.pessoas < c.pessoas) {
        linhas.push('- Completar ' + (c.pessoas - s.pessoas) + ' pessoa' + ((c.pessoas - s.pessoas) === 1 ? '' : 's') + ' no contrato');
      }
      if (s.criancas < c.pulantes) {
        linhas.push('- Completar ' + (c.pulantes - s.criancas) + ' pulante' + ((c.pulantes - s.criancas) === 1 ? '' : 's') + ' (criancas)');
      }
      if (s.pctConf != null) {
        linhas.push('- Progresso: ' + s.pctConf + ' das familias ja confirmaram');
      }
    } else {
      linhas.push('');
      linhas.push('*O que falta:* nenhuma familia pendente · contrato coberto no cadastro');
    }

    if (s.naoContados > 0 || s.famLiberadasPaiMae > 0) {
      linhas.push('');
      linhas.push('*Ajuste pai/mae:*');
      if (s.famLiberadasPaiMae > 0) {
        linhas.push(
          '- ' + s.famLiberadasPaiMae + ' familia' + (s.famLiberadasPaiMae === 1 ? '' : 's') +
            ' liberada' + (s.famLiberadasPaiMae === 1 ? '' : 's') + ': pai e mae no total'
        );
      }
      if (s.naoContados > 0) {
        linhas.push(
          '- ' + s.naoContados + ' pai/mae a mais no cadastro, fora do total' +
            ' (' + s.famTravadasPaiMae + ' familia' + (s.famTravadasPaiMae === 1 ? '' : 's') + ' sem liberar)'
        );
      }
    }

    if (s.famPres > 0) {
      linhas.push('');
      linhas.push('*No local agora:* ' + s.famPres + ' familia' + (s.famPres === 1 ? '' : 's'));
    }

    linhas.push('');
    linhas.push('Atualizado em ' + s.atualizadoEm);
    return linhas.join('\n');
  }

  function renderStatusWhatsapp(msg) {
    var ta = document.getElementById('dash-status-texto');
    var link = document.getElementById('btn-abrir-status-wa');
    var feedback = document.getElementById('dash-status-feedback');
    window.__statusWhatsappMsg = msg || '';
    if (ta) ta.value = msg || '';
    if (link) {
      link.href = whatsappUrlSomenteTexto(msg);
      link.setAttribute('aria-disabled', msg ? 'false' : 'true');
    }
    if (feedback && feedback.getAttribute('data-temp') !== '1') {
      feedback.textContent = msg ? 'Mensagem atualizada com o dashboard.' : '';
    }
  }

  async function copiarStatusWhatsapp() {
    var msg = window.__statusWhatsappMsg || (document.getElementById('dash-status-texto') || {}).value || '';
    var feedback = document.getElementById('dash-status-feedback');
    if (!msg) {
      if (feedback) feedback.textContent = 'Nada para copiar ainda.';
      return;
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(msg);
      } else {
        var ta = document.getElementById('dash-status-texto');
        if (!ta) throw new Error('Campo nao encontrado');
        ta.focus();
        ta.select();
        document.execCommand('copy');
      }
      if (feedback) {
        feedback.setAttribute('data-temp', '1');
        feedback.textContent = 'Mensagem copiada! Cole no WhatsApp.';
        setTimeout(function () {
          feedback.removeAttribute('data-temp');
          feedback.textContent = 'Mensagem atualizada com o dashboard.';
        }, 2500);
      }
    } catch (err) {
      if (feedback) feedback.textContent = 'Nao deu para copiar. Selecione o texto e copie manualmente.';
    }
  }

  function filtroWhatsappPorStatus(f) {
    if (!f) return 'pendentes';
    if (f.status === 'nao_vai') return 'nao_vao';
    if (f.status === 'confirmado' || f.status === 'presente') return 'confirmados';
    return 'pendentes';
  }

  function whatsappUrlLista(f, texto) {
    var list = celularesDaFamilia(f).filter(function (c) { return !ehSemCelular(c); });
    if (!list.length) return '';
    return whatsappUrl(list[0], texto);
  }

  function pct(parte, total) {
    if (!total) return '0%';
    return Math.round((parte / total) * 100) + '%';
  }

  function statusLabel(status) {
    var map = {
      pre_cadastro: 'Pré-cadastro',
      confirmado: 'Confirmou',
      presente: 'No local',
      nao_vai: 'Não vai'
    };
    return map[status] || (status || '—');
  }

  function familiaConfirmou(f) {
    return f && (f.status === 'confirmado' || f.status === 'presente');
  }

  function familiaAcompanhantesLiberados(f) {
    var cfg = window.__configConvite || {};
    return !!(cfg.liberar_acompanhantes_geral || (f && f.liberar_acompanhantes));
  }

  // Pai+mãe pré-cadastrados:
  // - liberado (flag): conta os 2
  // - sem liberar: conta 1 (no convite só 1 é escolhido)
  // Pendentes entram no total esperado; "não vão" ficam fora do esperado.
  function contarAdultosFamilia(f) {
    var temPai = !!(f && f.nome_pai);
    var temMae = !!(f && f.nome_mae);
    var paisCadastrados = (temPai ? 1 : 0) + (temMae ? 1 : 0);
    var extras = (f && f.adultos && f.adultos.length) ? f.adultos.length : 0;
    var liberado = familiaAcompanhantesLiberados(f);
    var temPaiEMae = paisCadastrados === 2;
    var nPais = temPaiEMae ? (liberado ? 2 : 1) : paisCadastrados;
    return {
      adultos: nPais + extras,
      responsaveis: nPais,
      extras: extras,
      paisCadastrados: paisCadastrados,
      naoContados: Math.max(0, paisCadastrados - nPais),
      temPaiEMae: temPaiEMae,
      liberadoPaiMae: temPaiEMae && liberado
    };
  }

  function familiaEntraNoEsperado(f) {
    return !!(f && f.status !== 'nao_vai');
  }

  function contarChecksFamilia(f) {
    var checks = getChecksLocais();
    var n = 0;
    pessoasDoTelefone(f).forEach(function (p) {
      if (checks[p.key]) n += 1;
    });
    return n;
  }

  function renderContratoDash(pessoas, pulantes) {
    var c = contratoFesta();
    var pctPes = pctContrato(pessoas, c.pessoas);
    var pctPul = pctContrato(pulantes, c.pulantes);
    var elPessoas = document.getElementById('dash-contrato-pessoas');
    var elPulantes = document.getElementById('dash-contrato-pulantes');
    var elPessoasNota = document.getElementById('dash-contrato-pessoas-nota');
    var elPulantesNota = document.getElementById('dash-contrato-pulantes-nota');
    var elPessoasSub = document.getElementById('dash-pessoas-contrato');
    var elPulantesSub = document.getElementById('dash-pulantes-contrato');
    var elPessoasPct = document.getElementById('dash-pessoas-pct');
    var elPulantesPct = document.getElementById('dash-criancas-pct');
    var elBarPes = document.getElementById('dash-contrato-pessoas-bar');
    var elBarPul = document.getElementById('dash-contrato-pulantes-bar');

    if (elPessoas) elPessoas.textContent = pessoas + ' / ' + c.pessoas;
    if (elPulantes) elPulantes.textContent = pulantes + ' / ' + c.pulantes;
    if (elPessoasNota) {
      elPessoasNota.textContent = pctPes + ' do contrato · ' + textoSaldoContrato(pessoas, c.pessoas, 'pessoas');
    }
    if (elPulantesNota) {
      elPulantesNota.textContent = pctPul + ' do contrato · ' + textoSaldoContrato(pulantes, c.pulantes, 'pulantes');
    }
    if (elPessoasSub) {
      elPessoasSub.textContent = pctPes + ' de ' + c.pessoas + ' · ' + textoSaldoContrato(pessoas, c.pessoas, 'pessoas');
    }
    if (elPulantesSub) {
      elPulantesSub.textContent = pctPul + ' de ' + c.pulantes + ' · ' + textoSaldoContrato(pulantes, c.pulantes, 'pulantes');
    }
    if (elPessoasPct) elPessoasPct.textContent = ' ' + pctPes;
    if (elPulantesPct) elPulantesPct.textContent = ' ' + pctPul;
    if (elBarPes) elBarPes.style.width = barraContratoPct(pessoas, c.pessoas) + '%';
    if (elBarPul) elBarPul.style.width = barraContratoPct(pulantes, c.pulantes) + '%';
  }

  function renderTotaisEsperados(tot) {
    var el = document.getElementById('chart-totais');
    if (!el) return;
    var pessoas = tot.pessoas || 0;
    var c = contratoFesta();
    if (!pessoas) {
      el.innerHTML = '<p class="chart-empty">Sem dados ainda.</p>';
      return;
    }
    var maxBar = Math.max(tot.adultos, tot.criancas, tot.naoContados || 0, c.pessoas, c.pulantes, 1);
    function linha(label, valor, cor, nota) {
      var h = Math.max(8, Math.round((valor / maxBar) * 100));
      return (
        '<div class="totais-linha" title="' + esc(label) + ': ' + valor + '">' +
          '<div class="totais-meta">' +
            '<span class="totais-label">' + esc(label) + '</span>' +
            '<strong class="totais-n">' + valor + '</strong>' +
          '</div>' +
          '<div class="totais-track"><div class="totais-fill" style="width:' + h + '%;background:' + cor + '"></div></div>' +
          (nota ? '<p class="totais-nota">' + esc(nota) + '</p>' : '') +
        '</div>'
      );
    }
    var avisoNaoContados = '';
    if (tot.naoContados) {
      avisoNaoContados =
        '<div class="totais-aviso">' +
          '<strong>' + tot.naoContados + '</strong>' +
          '<span>pai/mãe a mais no cadastro, fora do total esperado</span>' +
          '<em>' + tot.famTravadasPaiMae + ' família' + (tot.famTravadasPaiMae === 1 ? '' : 's') +
            ' com pai e mãe, sem liberar o 2º adulto</em>' +
        '</div>';
    }
    el.innerHTML =
      '<div class="totais-resumo">' +
        '<div><span>Pessoas agora</span><strong>' + pessoas + '</strong></div>' +
        '<div><span>Contrato</span><strong>' + c.pessoas + '</strong></div>' +
        '<div><span>Pulantes</span><strong>' + tot.criancas + '/' + c.pulantes + '</strong></div>' +
      '</div>' +
      '<p class="totais-nota" style="margin-bottom:8px">' +
        esc('Contrato: ' + c.pessoas + ' pessoas · ' + c.pulantes + ' pulantes (crianças). ' +
          textoSaldoContrato(pessoas, c.pessoas, 'pessoas') + ' · ' +
          textoSaldoContrato(tot.criancas, c.pulantes, 'pulantes') + '.') +
      '</p>' +
      avisoNaoContados +
      linha('Responsáveis no total', tot.responsaveis, '#1f5c2e',
        tot.famLiberadasPaiMae
          ? (tot.famLiberadasPaiMae + ' família' + (tot.famLiberadasPaiMae === 1 ? '' : 's') +
            ' liberada' + (tot.famLiberadasPaiMae === 1 ? '' : 's') + ': pai e mãe entram no total')
          : 'No convite, 1 responsável por família') +
      linha('Outros adultos', tot.extras, '#0b4a7a', tot.extras ? 'Acompanhantes no cadastro' : 'Nenhum acompanhante extra') +
      linha('Pulantes (crianças)', tot.criancas, '#b45309', 'Contrato: ' + c.pulantes + ' · ' + textoSaldoContrato(tot.criancas, c.pulantes, 'pulantes')) +
      (tot.naoContados
        ? linha('Pai/mãe não contabilizados', tot.naoContados, '#8a1f1f',
          'Cadastrados na planilha, mas não entram no total (só 1 responsável sem liberar)')
        : '');
  }

  function renderAposLiberar() {
    atualizarDashboard(window.__familias || []);
    renderLista(window.__familias || []);
    if (secaoTabela && !secaoTabela.classList.contains('hidden')) {
      renderTabelaDados(window.__familias || []);
    }
  }

  async function aplicarLiberarAcompanhantes(cel, ligar, opts) {
    opts = opts || {};
    var familia = familiaPorCelular(cel);
    if (!familia) throw new Error('Família não encontrada.');
    await ArturApi.liberarAcompanhantes(senha(), cel, ligar);
    familia.liberar_acompanhantes = !!ligar;
    if (!opts.silencioso) {
      setStatus(
        ligar
          ? 'Liberado: pai e mãe entram no total e no convite.'
          : 'Travado: só 1 responsável no total e no convite.',
        ligar ? 'ok' : 'warn'
      );
    }
    if (!opts.semRender) renderAposLiberar();
  }

  function bindAjustePaiMaeChecks() {
    var elLista = document.getElementById('dash-ajuste-lista');
    var elAcoes = document.getElementById('dash-ajuste-acoes');
    if (!elLista) return;

    elLista.querySelectorAll('.ajuste-liberar-check').forEach(function (box) {
      box.addEventListener('change', async function () {
        var cel = box.getAttribute('data-cel');
        var ligar = !!box.checked;
        box.disabled = true;
        try {
          await aplicarLiberarAcompanhantes(cel, ligar);
        } catch (err) {
          box.checked = !ligar;
          setStatus(err.message || 'Erro ao liberar família', 'err');
        } finally {
          box.disabled = false;
        }
      });
    });

    if (!elAcoes) return;
    var btnTodos = elAcoes.querySelector('[data-act="liberar-todos-ajuste"]');
    if (btnTodos) {
      btnTodos.addEventListener('click', async function () {
        var pendentes = Array.prototype.slice.call(
          elLista.querySelectorAll('.ajuste-liberar-check:not(:checked)')
        );
        if (!pendentes.length) {
          setStatus('Todas essas famílias já estão liberadas.', 'ok');
          return;
        }
        var ok = await pedirConfirmacao(
          'Liberar pai e mãe no total para ' + pendentes.length + ' família' +
            (pendentes.length === 1 ? '' : 's') + '?',
          {
            titulo: 'Liberar no cálculo',
            textoSim: 'Sim, liberar',
            textoNao: 'Cancelar'
          }
        );
        if (!ok) return;
        btnTodos.disabled = true;
        var okCount = 0;
        try {
          for (var i = 0; i < pendentes.length; i++) {
            var box = pendentes[i];
            var cel = box.getAttribute('data-cel');
            await aplicarLiberarAcompanhantes(cel, true, { silencioso: true, semRender: true });
            okCount += 1;
          }
          renderAposLiberar();
          setStatus(
            okCount + ' família' + (okCount === 1 ? '' : 's') +
              ' liberada' + (okCount === 1 ? '' : 's') +
              ': pai e mãe no total e na lista.',
            'ok'
          );
        } catch (err) {
          renderAposLiberar();
          setStatus(
            (err.message || 'Erro ao liberar') +
              (okCount ? (' · ' + okCount + ' já liberada' + (okCount === 1 ? '' : 's')) : ''),
            'err'
          );
        } finally {
          btnTodos.disabled = false;
        }
      });
    }
  }

  function renderAjustePaiMae(opts) {
    var box = document.getElementById('dash-ajuste-pais');
    var elTitulo = document.getElementById('dash-ajuste-titulo');
    var elTexto = document.getElementById('dash-ajuste-texto');
    var elAcoes = document.getElementById('dash-ajuste-acoes');
    var elLista = document.getElementById('dash-ajuste-lista');
    if (!box || !elTitulo || !elTexto || !elLista) return;

    var liberadas = opts.famLiberadasPaiMae || 0;
    var travadas = opts.famTravadasPaiMae || 0;
    var fora = opts.naoContados || 0;
    var lista = opts.listaPaiMae || [];

    if (!lista.length) {
      box.classList.add('hidden');
      elTitulo.textContent = '';
      elTexto.textContent = '';
      if (elAcoes) elAcoes.innerHTML = '';
      elLista.innerHTML = '';
      return;
    }

    box.classList.remove('hidden');
    elTitulo.textContent = 'Revisão do cálculo · famílias com pai e mãe';
    elTexto.textContent = fora
      ? ('Marque para liberar e já contar os 2 no total. Agora: ' +
        fora + ' pai/mãe a mais fora do total' +
        (liberadas ? (' · ' + liberadas + ' já liberada' + (liberadas === 1 ? '' : 's')) : '') + '.')
      : ('Todas liberadas: pai e mãe entram no total' +
        (travadas ? '' : '') + '.');

    if (elAcoes) {
      elAcoes.innerHTML = travadas
        ? '<button type="button" class="btn btn-grass" data-act="liberar-todos-ajuste">Liberar todas desta revisão</button>'
        : '<span class="dash-ajuste-ok">Tudo liberado nesta revisão</span>';
    }

    elLista.innerHTML = lista.map(function (item) {
      return (
        '<li class="' + (item.liberado ? 'ajuste-ok' : 'ajuste-pendente') + '">' +
          '<label class="ajuste-check-linha">' +
            '<input type="checkbox" class="ajuste-liberar-check" data-cel="' + esc(item.cel) + '"' +
              (item.liberado ? ' checked' : '') + ' />' +
            '<span class="ajuste-check-corpo">' +
              '<strong>' + esc(item.nome) + '</strong>' +
              '<span>pai: ' + esc(item.pai) + ' · mãe: ' + esc(item.mae) + '</span>' +
              '<em>' +
                (item.liberado
                  ? 'Liberado · os 2 entram no total e no convite'
                  : 'Sem liberar · conta 1 · marque para liberar agora') +
              '</em>' +
            '</span>' +
          '</label>' +
        '</li>'
      );
    }).join('');

    bindAjustePaiMaeChecks();
  }

  function atualizarDashboard(familias) {
    var lista = familias || [];
    var qtdFamilias = lista.length;
    var cadastrados = 0;
    var adultos = 0;
    var criancas = 0;
    var confirmados = 0;
    var naoConfirmados = 0;
    var naoVaoPessoas = 0;
    var confAdultos = 0;
    var confCriancas = 0;
    var naoAdultos = 0;
    var naoCriancas = 0;
    var famConf = 0;
    var famPend = 0;
    var famNao = 0;
    var famPres = 0;
    var marcados = 0;
    var famPaiMae = 0;
    var famLiberadasPaiMae = 0;
    var famTravadasPaiMae = 0;
    var naoContados = 0;
    var responsaveis = 0;
    var extras = 0;
    var listaPaiMae = [];

    lista.forEach(function (f) {
      var cont = contarAdultosFamilia(f);
      var nAdultos = cont.adultos;
      var nCriancas = (f.filhos && f.filhos.length) ? f.filhos.length : 0;
      var totalPessoas = nAdultos + nCriancas;
      var noEsperado = familiaEntraNoEsperado(f);

      if (noEsperado) {
        adultos += nAdultos;
        criancas += nCriancas;
        cadastrados += totalPessoas;
        responsaveis += cont.responsaveis;
        extras += cont.extras;
        if (cont.temPaiEMae) {
          famPaiMae += 1;
          listaPaiMae.push({
            cel: chaveFamilia(f) || f.celular || '',
            nome: nomeFamilia(f) || ('Família ' + (f.celular || '')),
            pai: f.nome_pai || '—',
            mae: f.nome_mae || '—',
            liberado: !!cont.liberadoPaiMae
          });
        }
        if (cont.liberadoPaiMae) famLiberadasPaiMae += 1;
        if (cont.temPaiEMae && !cont.liberadoPaiMae) famTravadasPaiMae += 1;
        naoContados += cont.naoContados;
      }
      marcados += contarChecksFamilia(f);

      if (f.status === 'nao_vai') {
        famNao += 1;
        naoVaoPessoas += totalPessoas;
      } else if (familiaConfirmou(f)) {
        famConf += 1;
        if (f.status === 'presente') famPres += 1;
        confirmados += totalPessoas;
        confAdultos += nAdultos;
        confCriancas += nCriancas;
      } else {
        famPend += 1;
        naoConfirmados += totalPessoas;
        naoAdultos += nAdultos;
        naoCriancas += nCriancas;
      }
    });

    listaPaiMae.sort(function (a, b) {
      if (a.liberado === b.liberado) return String(a.nome).localeCompare(String(b.nome), 'pt-BR');
      return a.liberado ? 1 : -1;
    });

    var elFam = document.getElementById('dash-familias');
    var elCad = document.getElementById('dash-cadastrados');
    var elAdu = document.getElementById('dash-adultos');
    var elCri = document.getElementById('dash-criancas');
    var elAduPct = document.getElementById('dash-adultos-pct');
    var elCriPct = document.getElementById('dash-criancas-pct');
    var elAduDet = document.getElementById('dash-adultos-detalhe');
    var elCon = document.getElementById('dash-confirmados');
    var elNao = document.getElementById('dash-nao-confirmados');
    var elNaoVao = document.getElementById('dash-nao-vao');
    var elConDet = document.getElementById('dash-confirmados-detalhe');
    var elNaoDet = document.getElementById('dash-nao-confirmados-detalhe');
    var elNaoVaoDet = document.getElementById('dash-nao-vao-detalhe');
    var elResumo = document.getElementById('dash-resumo-familias');
    var elMarcados = document.getElementById('dash-marcados');
    var elPresFam = document.getElementById('dash-presentes-fam');
    var elPresDet = document.getElementById('dash-presentes-detalhe');

    if (elFam) elFam.textContent = String(qtdFamilias);
    if (elCad) elCad.textContent = String(cadastrados);
    if (elAdu) elAdu.textContent = String(adultos);
    if (elCri) elCri.textContent = String(criancas);
    if (elAduPct) elAduPct.textContent = cadastrados ? ' ' + pct(adultos, cadastrados) : '';
    renderContratoDash(cadastrados, criancas);
    if (elAduDet) {
      if (naoContados) {
        elAduDet.textContent = naoContados + ' pai/mãe fora do total';
      } else if (famLiberadasPaiMae) {
        elAduDet.textContent = famLiberadasPaiMae + ' c/ pai e mãe no total';
      } else {
        elAduDet.textContent = responsaveis + ' responsáveis · ' + extras + ' extra' + (extras === 1 ? '' : 's');
      }
    }
    renderAjustePaiMae({
      famLiberadasPaiMae: famLiberadasPaiMae,
      famTravadasPaiMae: famTravadasPaiMae,
      naoContados: naoContados,
      listaPaiMae: listaPaiMae
    });
    if (elCon) elCon.textContent = String(famConf);
    if (elNao) elNao.textContent = String(famPend);
    if (elNaoVao) elNaoVao.textContent = String(famNao);
    if (elMarcados) elMarcados.textContent = String(marcados);
    if (elPresFam) elPresFam.textContent = String(famPres);
    if (elResumo) {
      elResumo.textContent = qtdFamilias
        ? (famConf + ' de ' + qtdFamilias + ' famílias confirmaram' +
          (famPend ? (' · ' + famPend + ' pendente' + (famPend === 1 ? '' : 's') + ' no total') : '') +
          (famNao ? (' · ' + famNao + ' não vão (fora do esperado)') : '') +
          (naoContados ? (' · ' + naoContados + ' pai/mãe cadastrados a mais (fora do total)') : ''))
        : 'Nenhuma família cadastrada ainda.';
    }
    if (elConDet) {
      elConDet.textContent = confirmados
        ? (confirmados + ' pessoas\nAdultos ' + confAdultos + '\nCrianças ' + confCriancas)
        : '0 pessoas';
    }
    if (elNaoDet) {
      elNaoDet.textContent = naoConfirmados
        ? (naoConfirmados + ' pessoas\nAdultos ' + naoAdultos + '\nCrianças ' + naoCriancas)
        : '0 pessoas';
    }
    if (elNaoVaoDet) {
      elNaoVaoDet.textContent = naoVaoPessoas ? (naoVaoPessoas + ' pessoas') : '0 pessoas';
    }
    if (elPresDet) {
      elPresDet.textContent = famPres ? (famPres + ' família' + (famPres === 1 ? '' : 's')) : 'Nenhuma ainda';
    }

    renderGraficoBarras(document.getElementById('chart-cadastros'), window.__cadastrosPorDia || {}, '#1f5c2e');
    renderGraficoBarras(document.getElementById('chart-acessos'), window.__acessosPorDia || {}, '#0b4a7a');
    renderTotaisEsperados({
      pessoas: cadastrados,
      adultos: adultos,
      criancas: criancas,
      responsaveis: responsaveis,
      extras: extras,
      famPaiMae: famPaiMae,
      famLiberadasPaiMae: famLiberadasPaiMae,
      famTravadasPaiMae: famTravadasPaiMae,
      famPend: famPend,
      naoContados: naoContados,
      listaPaiMae: listaPaiMae
    });
    renderStatusWhatsapp(montarMensagemStatusWhatsapp({
      pessoas: cadastrados,
      adultos: adultos,
      criancas: criancas,
      familias: qtdFamilias,
      famConf: famConf,
      famPend: famPend,
      famNao: famNao,
      famPres: famPres,
      confPessoas: confirmados,
      confAdultos: confAdultos,
      confCriancas: confCriancas,
      pendPessoas: naoConfirmados,
      pendAdultos: naoAdultos,
      pendCriancas: naoCriancas,
      naoVaoPessoas: naoVaoPessoas,
      famLiberadasPaiMae: famLiberadasPaiMae,
      famTravadasPaiMae: famTravadasPaiMae,
      naoContados: naoContados,
      pctConf: qtdFamilias ? pct(famConf, qtdFamilias) : null,
      atualizadoEm: new Date().toLocaleString('pt-BR')
    }));
    renderMissaoDash();
    renderTabelasLogs();
  }

  function simNao(v) {
    return v ? 'Sim' : 'Não';
  }

  function renderMissaoDash() {
    var r = window.__missaoResumo || {};
    var acessos = r.acessos || 0;
    var iniciou = r.iniciou || 0;
    var finalizou = r.finalizou || 0;
    var clicou = r.clicou_20 || 0;
    var elA = document.getElementById('dash-missao-acessos');
    var elI = document.getElementById('dash-missao-iniciou');
    var elF = document.getElementById('dash-missao-finalizou');
    var elC = document.getElementById('dash-missao-clicou');
    var elRes = document.getElementById('dash-missao-resumo');
    if (elA) elA.textContent = String(acessos);
    if (elI) elI.textContent = String(iniciou);
    if (elF) elF.textContent = String(finalizou);
    if (elC) elC.textContent = String(clicou);
    if (elRes) {
      var pctIni = acessos ? Math.round((iniciou / acessos) * 100) : 0;
      var pctFim = acessos ? Math.round((finalizou / acessos) * 100) : 0;
      var pctCli = acessos ? Math.round((clicou / acessos) * 100) : 0;
      elRes.textContent = acessos
        ? (acessos + ' acessos · ' + pctIni + '% iniciaram · ' + pctFim + '% finalizaram · ' + pctCli + '% clicaram 20%')
        : 'Ainda sem acessos na Missão Energética. Abra /missao-sustentabilidade/ para gerar o primeiro.';
    }
    if (!tabelaMissaoLogBody) return;
    var lista = (window.__missaoSessoes || []).slice();
    if (!lista.length) {
      tabelaMissaoLogBody.innerHTML =
        '<tr><td colspan="5">Nenhuma sessão ainda. Republiche o Apps Script (v8.10) se a aba MissaoEnergetica não existir.</td></tr>';
      return;
    }
    tabelaMissaoLogBody.innerHTML = lista.map(function (s) {
      return (
        '<tr>' +
          '<td>' + esc(formatarDataHora(s.data_hora)) + '</td>' +
          '<td>' + esc(simNao(s.entrou)) + '</td>' +
          '<td>' + esc(simNao(s.iniciou)) + '</td>' +
          '<td>' + esc(simNao(s.finalizou)) + '</td>' +
          '<td>' + esc(simNao(s.clicou_20)) + '</td>' +
        '</tr>'
      );
    }).join('');
  }

  function familiasPorFiltroDash(filtro) {
    var lista = window.__familias || [];
    return ordenarPorTelefone(lista).filter(function (f) {
      if (filtro === 'confirmados') return familiaConfirmou(f);
      if (filtro === 'nao_vao') return f.status === 'nao_vai';
      if (filtro === 'pendentes') return f.status !== 'nao_vai' && !familiaConfirmou(f);
      return false;
    });
  }

  function fecharModalDashLista() {
    var modal = document.getElementById('modal-dash-lista');
    if (modal) modal.classList.add('hidden');
  }

  function abrirListaDash(filtro) {
    var modal = document.getElementById('modal-dash-lista');
    var tituloEl = document.getElementById('modal-dash-titulo');
    var subEl = document.getElementById('modal-dash-sub');
    var bodyEl = document.getElementById('modal-dash-lista-body');
    if (!modal || !bodyEl) return;

    var titulos = {
      confirmados: 'Famílias que confirmaram',
      pendentes: 'Ainda não confirmaram',
      nao_vao: 'Famílias que não vão'
    };
    var subs = {
      confirmados: 'Lista de quem já confirmou presença.',
      pendentes: 'Toque em WhatsApp para pedir confirmação (vão ou não).',
      nao_vao: 'Quem registrou que não poderá ir.'
    };

    var familias = familiasPorFiltroDash(filtro);
    if (tituloEl) tituloEl.textContent = titulos[filtro] || 'Lista';
    if (subEl) {
      subEl.textContent = (subs[filtro] || '') + (familias.length ? (' - ' + familias.length + ' familia' + (familias.length === 1 ? '' : 's')) : '');
    }

    if (!familias.length) {
      bodyEl.innerHTML = '<p class="dash-lista-vazia">Nenhuma familia neste grupo.</p>';
    } else {
      bodyEl.innerHTML = familias.map(function (f) {
        var msg = mensagemWhatsappConfirmacao(f, filtro);
        var wa = whatsappUrlLista(f, msg);
        return (
          '<article class="dash-lista-item">' +
            '<div class="dash-lista-info">' +
              '<strong class="dash-lista-titulo">' + esc(nomeFamilia(f) || 'Sem nome') + '</strong>' +
              '<span class="badge ' + esc(f.status) + '">' + esc(statusLabel(f.status)) + '</span>' +
              htmlCelularesEmpilhados(f) +
              htmlPessoasDashLista(f) +
              (wa
                ? '<a class="btn btn-grass btn-wa btn-block" href="' + esc(wa) + '" target="_blank" rel="noopener">WhatsApp</a>'
                : '<span class="dash-lista-sem-fone">Sem celular</span>') +
            '</div>' +
          '</article>'
        );
      }).join('');
    }

    modal.classList.remove('hidden');
  }

  function htmlPessoasDashLista(f) {
    var html = '';
    var temAlgo = !!(f.nome_pai || f.nome_mae || (f.filhos && f.filhos.length) || (f.adultos && f.adultos.length));
    if (!temAlgo) return '';

    html += '<div class="dash-lista-bloco">';
    if (f.nome_pai) {
      html += '<p class="dash-lista-linha"><span class="dash-lista-papel">Pai:</span> ' + esc(f.nome_pai) + '</p>';
    }
    if (f.nome_mae) {
      html += '<p class="dash-lista-linha"><span class="dash-lista-papel">Mae:</span> ' + esc(f.nome_mae) + '</p>';
    }

    if (f.filhos && f.filhos.length) {
      html += '<p class="dash-lista-grupo">Filhos:</p>';
      f.filhos.forEach(function (n) {
        if (n) html += '<p class="dash-lista-linha dash-lista-item-nome">- ' + esc(n) + '</p>';
      });
    }

    if (f.adultos && f.adultos.length) {
      html += '<p class="dash-lista-grupo">Adultos:</p>';
      f.adultos.forEach(function (n) {
        if (n) html += '<p class="dash-lista-linha dash-lista-item-nome">- ' + esc(n) + '</p>';
      });
    }
    html += '</div>';
    return html;
  }

  function montarAcessosFallback(familias) {
    var lista = [];
    (familias || []).forEach(function (f) {
      if (!f.ultimo_acesso_em) return;
      lista.push({
        data_hora: f.ultimo_acesso_em,
        celular_busca: chaveFamilia(f),
        celulares_familia: celularesDaFamilia(f).join(' | '),
        nome_familia: nomeFamilia(f)
      });
    });
    lista.sort(function (a, b) {
      return String(b.data_hora || '').localeCompare(String(a.data_hora || ''));
    });
    return lista;
  }

  function agregarMapaDeAcessos(lista) {
    var map = {};
    (lista || []).forEach(function (a) {
      var dia = diaBrasilia(a.data_hora);
      if (!dia) return;
      map[dia] = (map[dia] || 0) + 1;
    });
    return map;
  }

  function renderTabelasLogs() {
    var filtro = ((buscaLogsInput && buscaLogsInput.value) || '').trim().toLowerCase();
    var filtroDigitos = ArturApi.onlyDigits(filtro);
    var cadastros = (window.__familias || []).slice().sort(function (a, b) {
      return String(b.criado_em || '').localeCompare(String(a.criado_em || ''));
    });
    var acessos = (window.__acessosLista || []).slice();

    var cadFiltrados = cadastros.filter(function (f) {
      if (!filtro) return true;
      var blob = [
        formatarDataHora(f.criado_em),
        formatarDataHora(f.ultimo_acesso_em),
        exibirCelulares(f),
        nomeFamilia(f),
        (f.filhos || []).join(' '),
        f.status
      ].join(' ').toLowerCase();
      if (blob.indexOf(filtro) !== -1) return true;
      if (filtroDigitos && celularesDaFamilia(f).join(' ').indexOf(filtroDigitos) !== -1) return true;
      return false;
    });

    var aceFiltrados = acessos.filter(function (a) {
      if (!filtro) return true;
      var blob = [
        formatarDataHora(a.data_hora),
        a.celular_busca,
        a.celulares_familia,
        a.nome_familia
      ].join(' ').toLowerCase();
      if (blob.indexOf(filtro) !== -1) return true;
      if (filtroDigitos && String(a.celular_busca || '').indexOf(filtroDigitos) !== -1) return true;
      if (filtroDigitos && String(a.celulares_familia || '').replace(/\D/g, '').indexOf(filtroDigitos) !== -1) return true;
      return false;
    });

    if (buscaLogsResultado) {
      buscaLogsResultado.textContent = filtro
        ? (cadFiltrados.length + ' cadastro(s) · ' + aceFiltrados.length + ' acesso(s) filtrados.')
        : (cadastros.length + ' cadastro(s) · ' + acessos.length + ' acesso(s).');
    }

    if (tabelaCadastrosLogBody) {
      if (!cadFiltrados.length) {
        tabelaCadastrosLogBody.innerHTML = '<tr><td colspan="6">Nenhum cadastro.</td></tr>';
      } else {
        tabelaCadastrosLogBody.innerHTML = cadFiltrados.map(function (f) {
          return (
            '<tr>' +
              '<td>' + esc(formatarDataHora(f.criado_em)) + '</td>' +
              '<td>' + esc(exibirCelulares(f)) + '</td>' +
              '<td>' + esc(nomeFamilia(f)) + '</td>' +
              '<td>' + esc((f.adultos || []).concat(f.filhos || []).join(', ')) + '</td>' +
              '<td>' + esc(f.status || '') + '</td>' +
              '<td>' + esc(formatarDataHora(f.ultimo_acesso_em)) + '</td>' +
            '</tr>'
          );
        }).join('');
      }
    }

    if (tabelaAcessosLogBody) {
      if (!aceFiltrados.length) {
        tabelaAcessosLogBody.innerHTML =
          '<tr><td colspan="4">Nenhum acesso registrado ainda. Republiche o Apps Script (v8.1) e peça para alguém buscar o celular no convite.</td></tr>';
      } else {
        tabelaAcessosLogBody.innerHTML = aceFiltrados.map(function (a) {
          var cel = a.celular_busca ? ArturApi.formatPhone(a.celular_busca) : '—';
          var celsFam = String(a.celulares_familia || '')
            .split('|')
            .map(function (s) { return ArturApi.onlyDigits(s); })
            .filter(Boolean)
            .map(function (c) { return ehSemCelular(c) ? 'Sem celular' : ArturApi.formatPhone(c); })
            .join(' · ') || '—';
          return (
            '<tr>' +
              '<td>' + esc(formatarDataHora(a.data_hora)) + '</td>' +
              '<td>' + esc(cel) + '</td>' +
              '<td>' + esc(a.nome_familia || '—') + '</td>' +
              '<td>' + esc(celsFam) + '</td>' +
            '</tr>'
          );
        }).join('');
      }
    }
  }

  function pessoasDoTelefone(f) {
    var pessoas = [];
    if (f.nome_pai) {
      pessoas.push({
        papel: 'Pai',
        tipo: 'resp',
        nome: f.nome_pai,
        key: (f.celular || '') + '|pai|' + f.nome_pai
      });
    }
    if (f.nome_mae) {
      pessoas.push({
        papel: 'Mãe',
        tipo: 'resp',
        nome: f.nome_mae,
        key: (f.celular || '') + '|mae|' + f.nome_mae
      });
    }
    ((f.adultos || [])).forEach(function (adulto) {
      pessoas.push({
        papel: 'Adulto',
        tipo: 'adulto',
        nome: adulto,
        key: (f.celular || '') + '|adulto|' + adulto
      });
    });
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

  // Lista esperada p/ PDF: confirmado mostra só quem vai; pendente deixa pai/mãe claros (conta 1).
  function pessoasEsperadasPdf(f) {
    var cont = contarAdultosFamilia(f);
    var liberado = familiaAcompanhantesLiberados(f);
    var confirmada = familiaConfirmou(f);
    var pendente = !!(f && f.status !== 'confirmado' && f.status !== 'presente' && f.status !== 'nao_vai');
    var temPai = !!(f && String(f.nome_pai || '').trim());
    var temMae = !!(f && String(f.nome_mae || '').trim());
    var pessoas = [];

    if (confirmada) {
      if (temPai && temMae && !liberado) {
        pessoas.push({
          papel: '',
          tipo: 'resp-pendente',
          nome: 'Pai / mãe: escolher 1 na porta',
          detalhe: String(f.nome_pai).trim() + ' / ' + String(f.nome_mae).trim() + ' · conta 1 adulto',
          confirmado: true,
          ck: '[x]'
        });
      } else {
        if (temPai) {
          pessoas.push({
            papel: 'Pai',
            tipo: 'resp',
            nome: String(f.nome_pai).trim(),
            confirmado: true,
            ck: '[x]'
          });
        }
        if (temMae) {
          pessoas.push({
            papel: 'Mãe',
            tipo: 'resp',
            nome: String(f.nome_mae).trim(),
            confirmado: true,
            ck: '[x]'
          });
        }
      }
      (f.adultos || []).forEach(function (nome) {
        pessoas.push({
          papel: 'Adulto',
          tipo: 'adulto',
          nome: nome,
          confirmado: true,
          ck: '[x]'
        });
      });
    } else if (pendente) {
      if (temPai && temMae) {
        pessoas.push({
          papel: '',
          tipo: 'resp-pendente',
          nome: 'Pai / mãe ainda não confirmado',
          detalhe: String(f.nome_pai).trim() + ' / ' + String(f.nome_mae).trim() + ' · conta 1 adulto',
          confirmado: false,
          ck: '[ ]'
        });
      } else if (temPai) {
        pessoas.push({
          papel: 'Pai',
          tipo: 'resp',
          nome: String(f.nome_pai).trim(),
          detalhe: 'Ainda não confirmou · conta 1 adulto',
          confirmado: false,
          ck: '[ ]'
        });
      } else if (temMae) {
        pessoas.push({
          papel: 'Mãe',
          tipo: 'resp',
          nome: String(f.nome_mae).trim(),
          detalhe: 'Ainda não confirmou · conta 1 adulto',
          confirmado: false,
          ck: '[ ]'
        });
      }
      (f.adultos || []).forEach(function (nome) {
        pessoas.push({
          papel: 'Adulto',
          tipo: 'adulto',
          nome: nome + ' · pré-cadastro',
          confirmado: false,
          ck: '[ ]'
        });
      });
    } else {
      // nao_vai: mantém nomes para referência, sem tratar como esperado
      if (temPai) pessoas.push({ papel: 'Pai', tipo: 'resp', nome: String(f.nome_pai).trim(), ck: '[ ]', confirmado: false });
      if (temMae) pessoas.push({ papel: 'Mãe', tipo: 'resp', nome: String(f.nome_mae).trim(), ck: '[ ]', confirmado: false });
      (f.adultos || []).forEach(function (nome) {
        pessoas.push({ papel: 'Adulto', tipo: 'adulto', nome: nome, ck: '[ ]', confirmado: false });
      });
    }

    (f.filhos || []).forEach(function (nome) {
      pessoas.push({
        papel: '',
        tipo: 'crianca',
        nome: 'Pulante - Criança: ' + nome,
        confirmado: confirmada,
        ck: confirmada ? '[x]' : '[ ]'
      });
    });

    return {
      pessoas: pessoas,
      adultos: cont.adultos,
      criancas: (f.filhos || []).length,
      pessoasTotal: cont.adultos + (f.filhos || []).length,
      liberado: liberado,
      confirmada: confirmada,
      pendente: pendente
    };
  }

  function htmlLinhaPessoaPdf(p) {
    var classes = 'p-linha' +
      (p.tipo === 'crianca' ? ' kid' : '') +
      (p.tipo === 'resp-pendente' ? ' pend' : '') +
      (p.confirmado ? ' ok' : '');
    var titulo;
    if (p.tipo === 'crianca' || !p.papel) {
      titulo = '<span class="nm nm-full">' + esc(p.nome || '') + '</span>';
    } else {
      titulo =
        '<span class="papel">' + esc(p.papel) + ':</span> ' +
        '<span class="nm">' + esc(p.nome || '') + '</span>';
    }
    return (
      '<div class="' + classes + '">' +
        '<span class="ck">' + (p.ck || '[ ]') + '</span>' +
        '<div class="p-body">' +
          '<div class="p-topo">' + titulo + '</div>' +
          (p.detalhe ? ('<div class="det">' + esc(p.detalhe) + '</div>') : '') +
        '</div>' +
      '</div>'
    );
  }

  function htmlCoroaTotaisPdf(tot) {
    var c = contratoFesta();
    return (
      '<div class="coroa">' +
        '<div class="coroa-item"><span>Adultos</span><strong>' + tot.adultos + '</strong></div>' +
        '<div class="coroa-item"><span>Pulantes (clientes)</span><strong>' + tot.criancas + '</strong></div>' +
        '<div class="coroa-item"><span>Pessoas</span><strong>' + tot.pessoas + '</strong></div>' +
        '<div class="coroa-item"><span>Contrato</span><strong>' + c.pessoas + ' / ' + c.pulantes + '</strong>' +
          '<em>' + textoSaldoContrato(tot.pessoas, c.pessoas, 'pessoas') + ' · ' +
            textoSaldoContrato(tot.criancas, c.pulantes, 'pulantes') + '</em></div>' +
      '</div>'
    );
  }

  function cssCoroaPdf() {
    return (
      '.coroa{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 12px}' +
      '.coroa-item{flex:1;min-width:120px;border:2px solid #1f5c2e;background:#eef7ea;padding:8px 10px;border-radius:6px}' +
      '.coroa-item span{display:block;font-size:8.5pt;text-transform:uppercase;letter-spacing:.04em;color:#1f5c2e;font-weight:700}' +
      '.coroa-item strong{display:block;margin-top:2px;font-size:16pt;line-height:1.1}' +
      '.coroa-item em{display:block;margin-top:2px;font-style:normal;font-size:8.5pt;color:#444}' +
      '.p-linha{display:table;width:100%;table-layout:fixed;padding:5px 4px;border-bottom:1px dotted #d0d8cc;box-sizing:border-box}' +
      '.p-linha:last-child{border-bottom:0}' +
      '.p-linha .ck{display:table-cell;width:22px;vertical-align:top;font-size:13pt;line-height:1.2;color:#1f5c2e}' +
      '.p-linha .p-body{display:table-cell;vertical-align:top;padding-left:6px}' +
      '.p-linha .p-topo{display:block;line-height:1.25}' +
      '.p-linha.ok .ck{color:#0b6b2a}' +
      '.p-linha.pend{background:#fff8e1;border:1px solid #e0c36a;margin:3px 0;padding:6px 4px}' +
      '.p-linha .papel{display:inline;font-size:9pt;text-transform:none;letter-spacing:0;color:#555;font-weight:700;margin-right:4px}' +
      '.p-linha .nm{display:inline;font-size:11pt;font-weight:600;color:#111;word-wrap:break-word;overflow-wrap:anywhere}' +
      '.p-linha .nm-full{display:block;font-size:10.5pt;font-weight:700;color:#111;word-wrap:break-word;overflow-wrap:anywhere;line-height:1.3}' +
      '.p-linha.kid .nm-full{font-weight:600}' +
      '.p-linha .nm-full.linha-vazia{border-bottom:1px solid #bbb;min-height:14px}' +
      '.p-linha .det{display:block;margin-top:2px;font-size:8.5pt;color:#555;line-height:1.3;word-wrap:break-word}' +
      '.p-linha .p-body{overflow:visible;word-wrap:break-word}' +
      '.legenda-pdf{margin:8px 0 12px;padding:8px 10px;border:1px solid #c5d2c0;background:#f7faf6;font-size:9pt;color:#333;line-height:1.45}' +
      '.legenda-pdf strong{color:#1f5c2e}' +
      '.fam.pendente header,.porta-row.st-pre_cadastro{background:#fffaf0}'
    );
  }

  function htmlLegendaPdf() {
    return (
      '<div class="legenda-pdf">' +
        '<strong>Legenda</strong><br>' +
        '<strong>[x]</strong> = já confirmou no convite<br>' +
        '<strong>[ ]</strong> = ainda não confirmou (marcar na porta)<br>' +
        '<strong>Pend.</strong> = família ainda não confirmou presença<br>' +
        '<strong>OK</strong> = família confirmada<br>' +
        'Pai + mãe sem liberar: só <strong>1 responsável</strong> no total<br>' +
        'Pendente com pai e mãe: aparece <strong>"Pai / mãe ainda não confirmado (conta 1 adulto)"</strong><br>' +
        '<strong>Pulante - Criança</strong> = criança que pula (cliente do contrato)' +
      '</div>'
    );
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

  function familiaTemAlgumCheck(cel) {
    var f = familiaPorCelular(cel);
    if (f) return contarChecksFamilia(f) > 0;
    var dig = ArturApi.onlyDigits(cel);
    var checks = getChecksLocais();
    var prefix = dig + '|';
    return Object.keys(checks).some(function (k) {
      return k.indexOf(prefix) === 0 && checks[k];
    });
  }

  async function sincronizarStatusPeloCheck(cel, checkedAgora) {
    if (checkedAgora || familiaTemAlgumCheck(cel)) {
      var data = await ArturApi.marcarPresente(senha(), cel);
      return (data && data.msg) || 'Confirmado e marcado.';
    }
    var dataOff = await ArturApi.desmarcarPresente(senha(), cel);
    return (dataOff && dataOff.msg) || 'Check removido.';
  }

  async function onCheckPessoaChange(box, afterOk) {
    var cel = box.getAttribute('data-cel');
    var key = box.getAttribute('data-key');
    if (!cel || !key) return;

    setCheckLocal(key, box.checked);
    try {
      var msg = await sincronizarStatusPeloCheck(cel, box.checked);
      setStatus(msg, box.checked ? 'ok' : 'warn');
      await refresh(false);
      if (typeof afterOk === 'function') afterOk();
    } catch (err) {
      box.checked = !box.checked;
      setCheckLocal(key, box.checked);
      alert(err.message || 'Erro ao atualizar');
      setStatus(err.message || 'Erro', 'err');
    }
  }

  function bindChecksPresenca() {
    listaPresencaEl.querySelectorAll('.presenca-check').forEach(function (box) {
      box.addEventListener('change', function () {
        onCheckPessoaChange(box, function () {
          if (!secaoPresenca.classList.contains('hidden')) {
            renderPresenca(window.__familias || []);
          }
        });
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
      var esp = pessoasEsperadasPdf(f);
      var titulo = nomeFamilia(f) || ('Família ' + (i + 1));
      var statusTxt = familiaConfirmou(f)
        ? ('Confirmou · ' + esp.adultos + ' adulto' + (esp.adultos === 1 ? '' : 's') + ' · ' + esp.criancas + ' pulante' + (esp.criancas === 1 ? '' : 's'))
        : ('Ainda não confirmou · ' + esp.adultos + ' adulto' + (esp.adultos === 1 ? '' : 's') + ' · ' + esp.criancas + ' pulante' + (esp.criancas === 1 ? '' : 's'));

      return (
        '<article class="fam' + (esp.pendente ? ' pendente' : ' ok') + '">' +
          '<header>' +
            '<span class="num">' + (i + 1) + '</span>' +
            '<div class="tit">' +
              '<strong>' + esc(titulo) + '</strong>' +
              '<em>' + esc(statusTxt) + '</em>' +
            '</div>' +
          '</header>' +
          '<div class="pessoas">' +
            esp.pessoas.map(htmlLinhaPessoaPdf).join('') +
          '</div>' +
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
      htmlCoroaTotaisPdf(tot) +
      '<div class="resumo">' +
        '<div class="card"><strong>Famílias</strong><span>' + familias.length + '</span></div>' +
        htmlCardsContrato(tot) +
        '<div class="card"><strong>Confirmados</strong><span>' + tot.confTotal + ' pessoas (' + pct(tot.confTotal, tot.pessoas) + ')</span></div>' +
        '<div class="card card-warn"><strong>Ainda não confirmaram</strong><span>' + tot.naoConfTotal + ' pessoas · pai/mãe conta 1 até confirmar</span></div>' +
      '</div>' +
      htmlLegendaPdf() +
      '<div class="grade">' + blocos + '</div>';

    var cssExtra =
      cssCoroaPdf() +
      '.grade{display:grid;grid-template-columns:1fr 1fr;gap:10px}' +
      '.resumo .card-warn{background:#fff8e1;border-color:#e0c36a}' +
      '.fam{border:1.5px solid #2d4a2a;border-radius:6px;overflow:hidden;background:#fff;' +
        'page-break-inside:avoid;break-inside:avoid;-webkit-column-break-inside:avoid}' +
      '.fam.pendente{border-color:#c9a227}' +
      '.fam header{display:flex;gap:10px;align-items:center;background:#e8f2e4;border-bottom:1px solid #b7cbb0;padding:8px 10px}' +
      '.fam.pendente header{background:#fff3cd}' +
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
      filename: 'artur-7-anos-presenca_' + carimboArquivo() + '.pdf',
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
    var naoConfAdultos = 0;
    var naoConfCriancas = 0;
    var naoVaiAdultos = 0;
    var naoVaiCriancas = 0;
    var famPaiMae = 0;
    var naoContados = 0;
    var responsaveis = 0;
    var extras = 0;

    var famLiberadasPaiMae = 0;
    var famTravadasPaiMae = 0;

    (familias || []).forEach(function (f) {
      var cont = contarAdultosFamilia(f);
      var nA = cont.adultos;
      var nC = (f.filhos || []).length;
      var total = nA + nC;
      if (f.status === 'nao_vai') {
        naoVaiAdultos += nA;
        naoVaiCriancas += nC;
        return;
      }
      adultos += nA;
      criancas += nC;
      pessoas += total;
      responsaveis += cont.responsaveis;
      extras += cont.extras;
      if (cont.temPaiEMae) famPaiMae += 1;
      if (cont.liberadoPaiMae) famLiberadasPaiMae += 1;
      if (cont.temPaiEMae && !cont.liberadoPaiMae) famTravadasPaiMae += 1;
      naoContados += cont.naoContados;
      if (f.status === 'confirmado' || f.status === 'presente') {
        confAdultos += nA;
        confCriancas += nC;
      } else {
        naoConfAdultos += nA;
        naoConfCriancas += nC;
      }
    });

    return {
      pessoas: pessoas,
      adultos: adultos,
      criancas: criancas,
      responsaveis: responsaveis,
      extras: extras,
      famPaiMae: famPaiMae,
      famLiberadasPaiMae: famLiberadasPaiMae,
      famTravadasPaiMae: famTravadasPaiMae,
      naoContados: naoContados,
      confAdultos: confAdultos,
      confCriancas: confCriancas,
      confTotal: confAdultos + confCriancas,
      naoConfAdultos: naoConfAdultos,
      naoConfCriancas: naoConfCriancas,
      naoConfTotal: naoConfAdultos + naoConfCriancas,
      naoVaiAdultos: naoVaiAdultos,
      naoVaiCriancas: naoVaiCriancas,
      naoVaiTotal: naoVaiAdultos + naoVaiCriancas
    };
  }

  function pessoaCelulaHtml(f, nome, tipoKey, checks) {
    if (!nome) return '<td class="pessoa-vazia"></td>';
    var key = (f.celular || '') + '|' + tipoKey + '|' + nome;
    var marcado = !!checks[key];
    return (
      '<td class="pessoa-cell">' +
        '<label class="pessoa-check-linha">' +
          '<input type="checkbox" class="presenca-check tabela-check" data-key="' + esc(key) + '" data-cel="' + esc(chaveFamilia(f) || f.celular) + '"' + (marcado ? ' checked' : '') + ' />' +
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

  function carimboArquivo() {
    var agora = new Date();
    var partes = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(agora);
    var map = {};
    partes.forEach(function (p) {
      if (p.type !== 'literal') map[p.type] = p.value;
    });
    return map.day + '_' + map.month + '_' + map.hour + 'h_' + map.minute + 'min';
  }

  function alturaFolhaPx(orientation, larguraCss, margensMm) {
    var paginaMm = orientation === 'landscape' ? 210 : 297;
    var larguraMm = (orientation === 'landscape' ? 297 : 210) - margensMm[1] - margensMm[3];
    var alturaMm = paginaMm - margensMm[0] - margensMm[2];
    return alturaMm * larguraCss / larguraMm;
  }

  function manterRegistroNaMesmaFolha(el, orientation, larguraCss, margensMm) {
    var pageH = alturaFolhaPx(orientation, larguraCss, margensMm);
    var folga = 18;
    var guard = 0;

    while (guard < 500) {
      guard += 1;
      var rootTop = el.getBoundingClientRect().top;
      var rows = el.querySelectorAll('.porta-row, .fam');
      var moved = false;

      for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        var rect = row.getBoundingClientRect();
        var top = rect.top - rootTop;
        var h = rect.height;
        if (h <= 0 || h >= pageH - folga) continue;

        var posNaFolha = top - Math.floor(top / pageH) * pageH;
        if (posNaFolha + h > pageH - folga) {
          var spacer = document.createElement('div');
          spacer.className = 'pdf-page-spacer';
          spacer.setAttribute('aria-hidden', 'true');
          spacer.style.cssText =
            'display:block;width:100%;height:' + Math.ceil(pageH - posNaFolha) + 'px;' +
            'margin:0;padding:0;border:0;background:#fff;grid-column:1 / -1;';
          row.parentNode.insertBefore(spacer, row);
          moved = true;
          break;
        }
      }

      if (!moved) break;
    }
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
          var margensMm = [6, 10, 6, 6];
          var capturaW = Math.ceil(Math.max(el.scrollWidth, el.offsetWidth)) + 16;
          manterRegistroNaMesmaFolha(el, orientation, capturaW, margensMm);
          var capturaH = Math.ceil(el.scrollHeight) + 8;
          return html2pdfFn()
            .set({
              margin: margensMm,
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
              pagebreak: { mode: [] }
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
      box.addEventListener('change', function () {
        onCheckPessoaChange(box, function () {
          if (secaoTabela && !secaoTabela.classList.contains('hidden')) {
            renderTabelaDados(window.__familias || []);
          }
        });
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
      var c = contratoFesta();
      tabelaResumoEl.innerHTML =
        '<div class="box">' +
          '<strong>Contrato Jump</strong>' +
          'Pessoas: ' + tot.pessoas + ' / ' + c.pessoas +
            ' <span class="pct">(' + textoSaldoContrato(tot.pessoas, c.pessoas, 'pessoas') + ')</span><br>' +
          'Pulantes: ' + tot.criancas + ' / ' + c.pulantes +
            ' <span class="pct">(' + textoSaldoContrato(tot.criancas, c.pulantes, 'pulantes') + ')</span><br>' +
          '<span class="pct">Pulantes = crianças · Pessoas = adultos + crianças</span>' +
        '</div>' +
        '<div class="box">' +
          '<strong>Totais esperados</strong>' +
          'Pessoas: ' + tot.pessoas + '<br>' +
          'Adultos: ' + tot.adultos + ' <span class="pct">(' + pct(tot.adultos, tot.pessoas) + ')</span><br>' +
          'Pulantes/crianças: ' + tot.criancas + ' <span class="pct">(' + pct(tot.criancas, tot.pessoas) + ')</span>' +
          (tot.famLiberadasPaiMae
            ? ('<br><span class="pct">' + tot.famLiberadasPaiMae + ' família' + (tot.famLiberadasPaiMae === 1 ? '' : 's') + ' liberada' + (tot.famLiberadasPaiMae === 1 ? '' : 's') + ': pai e mãe no total</span>')
            : '') +
          (tot.naoContados
            ? ('<br><span class="pct">' + tot.naoContados + ' pai/mãe a mais no cadastro (fora do total)</span>')
            : '') +
        '</div>' +
        '<div class="box">' +
          '<strong>Confirmados</strong>' +
          'Pessoas: ' + tot.confTotal + ' <span class="pct">(' + pct(tot.confTotal, tot.pessoas) + ')</span><br>' +
          'Adultos: ' + tot.confAdultos + '<br>' +
          'Pulantes: ' + tot.confCriancas +
        '</div>' +
        '<div class="box">' +
          '<strong>Não confirmaram</strong>' +
          'Pessoas: ' + tot.naoConfTotal + ' <span class="pct">(' + pct(tot.naoConfTotal, tot.pessoas) + ')</span><br>' +
          'Adultos: ' + tot.naoConfAdultos + '<br>' +
          'Pulantes: ' + tot.naoConfCriancas +
        '</div>';
    }

    var headCols =
      '<tr>' +
        '<th class="num">#</th>' +
        '<th class="num">Qtd</th>' +
        '<th>Celular</th>' +
        '<th>☐ Pai</th>' +
        '<th>☐ Mãe</th>' +
        '<th>☐ Outros adultos</th>';
    for (var h = 1; h <= colsFilhos; h++) {
      headCols += '<th>☐ Filho ' + h + '</th>';
    }
    headCols += '<th>Status</th><th>Cadastro</th><th>Último acesso</th></tr>';
    tabelaHeadEl.innerHTML = headCols;

    if (!ordenadas.length) {
      tabelaBodyEl.innerHTML = '<tr><td colspan="' + (9 + colsFilhos) + '">Nenhum cadastro.</td></tr>';
    }

    var linhasHtml = ordenadas.map(function (f, i) {
      var nA = contarAdultosFamilia(f).adultos;
      var nC = (f.filhos || []).length;
      var qtd = nA + nC;
      var kids = f.filhos || [];
      var adultos = f.adultos || [];
      var cols = '';
      for (var k = 0; k < colsFilhos; k++) {
        cols += pessoaCelulaHtml(f, kids[k] || '', 'crianca', checks);
      }
      var adultosHtml = '';
      if (!adultos.length) {
        adultosHtml = '<td class="pessoa-vazia"></td>';
      } else {
        adultosHtml =
          '<td class="pessoa-cell">' +
          adultos.map(function (nome) {
            var key = (f.celular || '') + '|adulto|' + nome;
            var marcado = !!checks[key];
            return (
              '<label class="pessoa-check-linha">' +
                '<input type="checkbox" class="presenca-check tabela-check" data-key="' + esc(key) + '" data-cel="' + esc(chaveFamilia(f) || f.celular) + '"' + (marcado ? ' checked' : '') + ' />' +
                '<span>' + esc(nome) + '</span>' +
              '</label>'
            );
          }).join('') +
          '</td>';
      }
      return (
        '<tr class="' + esc(f.status) + '">' +
          '<td class="num">' + (i + 1) + '</td>' +
          '<td class="num">' + qtd + '</td>' +
          '<td>' + esc(exibirCelulares(f)) + '</td>' +
          pessoaCelulaHtml(f, f.nome_pai || '', 'pai', checks) +
          pessoaCelulaHtml(f, f.nome_mae || '', 'mae', checks) +
          adultosHtml +
          cols +
          '<td>' + esc(statusLabel(f.status)) + '</td>' +
          '<td>' + esc(formatarDataHora(f.criado_em)) + '</td>' +
          '<td>' + esc(formatarDataHora(f.ultimo_acesso_em)) + '</td>' +
        '</tr>'
      );
    }).join('');

    var inicioBranco = ordenadas.length + 1;
    for (var b = 0; b < 20; b++) {
      var colsVazias = '';
      for (var c = 0; c < colsFilhos + 3; c++) {
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
    var ordenadas = ordenarPorTelefone(window.__familias || []).filter(function (f) {
      return f.status !== 'nao_vai';
    });
    var tot = contagemTabela(ordenadas);
    var agora = new Date().toLocaleString('pt-BR');

    var body = ordenadas.map(function (f, i) {
      var esp = pessoasEsperadasPdf(f);
      var badge = familiaConfirmou(f)
        ? ('<strong>OK</strong><em>' + esp.adultos + ' ad.<br>' + esp.criancas + ' pul.</em>')
        : ('<strong>Pend.</strong><em>1 adulto</em>');

      return (
        '<div class="porta-row st-' + esc(f.status || '') + (esp.pendente ? ' pendente' : ' ok') + '">' +
          '<div class="c num">' + (i + 1) + '</div>' +
          '<div class="c qtd">' +
            '<b>' + esp.pessoasTotal + '</b>' +
            '<small>' + esp.adultos + ' adultos</small>' +
            '<small>' + esp.criancas + ' pulantes</small>' +
          '</div>' +
          '<div class="pessoas">' + esp.pessoas.map(htmlLinhaPessoaPdf).join('') + '</div>' +
          '<div class="col-status"><span class="pdf-badge">' + badge + '</span></div>' +
        '</div>'
      );
    }).join('');

    var inicioBranco = ordenadas.length + 1;
    for (var b = 0; b < 12; b++) {
      body +=
        '<div class="porta-row extra">' +
          '<div class="c num">' + (inicioBranco + b) + '</div>' +
          '<div class="c qtd"></div>' +
          '<div class="pessoas">' +
            '<div class="p-linha"><span class="ck">[ ]</span><div class="p-body"><div class="p-topo"><span class="nm nm-full linha-vazia">&nbsp;</span></div></div></div>' +
            '<div class="p-linha"><span class="ck">[ ]</span><div class="p-body"><div class="p-topo"><span class="nm nm-full linha-vazia">&nbsp;</span></div></div></div>' +
            '<div class="p-linha"><span class="ck">[ ]</span><div class="p-body"><div class="p-topo"><span class="nm nm-full linha-vazia">&nbsp;</span></div></div></div>' +
          '</div>' +
          '<div class="col-status"></div>' +
        '</div>';
    }

    var conteudo =
      '<header class="topo">' +
        '<p class="topo-marca">Jump Trampolim Park · Vitória-ES</p>' +
        '<h1>Artur · 7 anos — Lista da porta</h1>' +
        '<p class="sub">25/11/2026 · 17h45–21h30 · [x] confirmado · [ ] marcar na porta</p>' +
        '<p class="meta">Gerado em ' + agora + '</p>' +
      '</header>' +
      htmlCoroaTotaisPdf(tot) +
      '<div class="resumo">' +
        htmlCardsContrato(tot) +
        '<div class="card"><strong>Confirmados</strong><span>' + tot.confTotal + ' (' + pct(tot.confTotal, tot.pessoas) + ')</span></div>' +
        '<div class="card card-warn"><strong>Ainda não confirmaram</strong><span>' + tot.naoConfTotal + ' · pai/mãe = 1 adulto</span></div>' +
        '<div class="card"><strong>Famílias</strong><span>' + ordenadas.length + '</span></div>' +
      '</div>' +
      htmlLegendaPdf() +
      '<div class="porta-wrap">' +
        '<div class="porta-head">' +
          '<div class="c">#</div>' +
          '<div class="c">Qtd</div>' +
          '<div>Pessoas (esperado)</div>' +
          '<div class="col-status">Status</div>' +
        '</div>' +
        '<div class="porta-body">' + body + '</div>' +
      '</div>' +
      '<p class="legenda">Linhas em branco no final para chegadas sem cadastro.</p>';

    var cssExtra =
      cssCoroaPdf() +
      '.sheet{font-size:11pt;padding:12px 18px 20px 10px;box-sizing:border-box}' +
      '.topo h1{font-size:18pt}' +
      '.resumo .card-warn{background:#fff8e1;border-color:#e0c36a}' +
      '.porta-row.pendente{background:#fffaf0}' +
      '.porta-wrap{border:2px solid #2d4a2a;background:#fff;overflow:visible;box-sizing:border-box;margin:0}' +
      '.porta-head,.porta-row{display:grid;grid-template-columns:40px 70px minmax(0,1fr) 68px;align-items:stretch}' +
      '.porta-head{background:#1f5c2e;color:#fff;font-size:9.5pt;font-weight:700}' +
      '.porta-head > div{padding:8px 6px;border-right:1px solid #2d4a2a;border-bottom:1px solid #2d4a2a}' +
      '.porta-head > div:last-child{border-right:none;text-align:center;padding:8px 3px;font-size:8pt}' +
      '.porta-head .c{text-align:center}' +
      '.porta-row{page-break-inside:avoid;break-inside:avoid;-webkit-column-break-inside:avoid;border-bottom:1px solid #2d4a2a}' +
      '.porta-row:last-child{border-bottom:none}' +
      '.porta-row > div{padding:7px 6px;border-right:1px solid #2d4a2a;vertical-align:top;overflow:visible;min-width:0}' +
      '.porta-row > div:last-child{border-right:none}' +
      '.porta-row .c{text-align:center}' +
      '.porta-row .num{font-weight:700;background:#eef5eb;font-size:11pt}' +
      '.porta-row .qtd{font-weight:700;font-size:11pt;line-height:1.2}' +
      '.porta-row .qtd b{display:block;font-size:12pt}' +
      '.porta-row .qtd small{display:block;font-size:7.5pt;font-weight:600;color:#444;margin-top:2px;line-height:1.2;white-space:normal}' +
      '.porta-row .pessoas{width:auto;min-width:0;overflow:visible}' +
      '.porta-row .col-status{text-align:center;background:#fff !important;padding:6px 2px;overflow:visible}' +
      '.pdf-badge{display:block;padding:4px 2px;border-radius:6px;font-size:7.5pt;font-weight:700;background:#e8eee6;color:#234;line-height:1.15;white-space:normal;max-width:100%;box-sizing:border-box}' +
      '.pdf-badge strong{display:block;font-size:8pt}' +
      '.pdf-badge em{display:block;font-style:normal;font-size:7pt;font-weight:600;opacity:.95;margin-top:1px}' +
      '.porta-row.st-confirmado .pdf-badge,.porta-row.ok .pdf-badge{background:#d7f0d8;color:#145214}' +
      '.porta-row.st-presente .pdf-badge{background:#cfe8ff;color:#0b4a7a}' +
      '.porta-row.st-pre_cadastro .pdf-badge,.porta-row.pendente .pdf-badge{background:#fff3cd;color:#7a5b00}' +
      '.porta-row.st-nao_vai .pdf-badge{background:#f8d7da;color:#842029}' +
      '.porta-row:nth-child(even):not(.extra) .pessoas,.porta-row:nth-child(even):not(.extra) .qtd{background:#f7faf6}' +
      '.porta-row.extra > div{background:#fff}' +
      '.legenda{margin-top:12px;font-size:9pt;color:#555}';

    baixarPdf(conteudo, cssExtra, {
      filename: 'artur-7-anos-lista-porta_' + carimboArquivo() + '.pdf',
      orientation: 'portrait',
      btn: btnPdfTabela
    });
  }

  function celularesSelecionadosExcluir() {
    if (!listaEl) return [];
    return Array.prototype.map.call(listaEl.querySelectorAll('.excluir-check:checked'), function (box) {
      return box.getAttribute('data-cel');
    }).filter(Boolean);
  }

  function atualizarBarraExcluir() {
    var sels = celularesSelecionadosExcluir();
    var total = listaEl ? listaEl.querySelectorAll('.excluir-check').length : 0;
    if (btnExcluirSelecionados) {
      btnExcluirSelecionados.disabled = !sels.length || excluindo;
      btnExcluirSelecionados.textContent = sels.length
        ? ('Excluir selecionados (' + sels.length + ')')
        : 'Excluir selecionados';
    }
    if (checkTodosExcluir) {
      checkTodosExcluir.checked = total > 0 && sels.length === total;
      checkTodosExcluir.indeterminate = sels.length > 0 && sels.length < total;
    }
    if (listaEl) {
      listaEl.querySelectorAll('.phone-card').forEach(function (card) {
        var box = card.querySelector('.excluir-check');
        if (box && box.checked) card.classList.add('selecionado-excluir');
        else card.classList.remove('selecionado-excluir');
      });
    }
  }

  async function excluirFamiliasComProgresso(cels) {
    var lista = (cels || []).filter(Boolean);
    if (!lista.length || excluindo) return;

    var nomes = lista.map(function (cel) {
      var f = familiaPorCelular(cel);
      return (f ? nomeFamilia(f) : '') || exibirCelular(cel);
    });

    var msg =
      lista.length === 1
        ? ('Deseja realmente EXCLUIR este cadastro?\n\n' + nomes[0] + '\n\nEsta ação não pode ser desfeita.')
        : ('Deseja realmente EXCLUIR ' + lista.length + ' cadastros?\n\n' +
          nomes.slice(0, 8).join('\n') +
          (nomes.length > 8 ? '\n…' : '') +
          '\n\nEsta ação não pode ser desfeita.');

    var ok = await pedirConfirmacao(msg, {
      titulo: lista.length === 1 ? 'Excluir cadastro' : 'Excluir selecionados',
      textoSim: lista.length === 1 ? 'Sim, excluir' : 'Sim, excluir ' + lista.length,
      textoNao: 'Não, manter',
      classeSim: 'btn-danger'
    });
    if (!ok) {
      setStatus('Exclusão cancelada.', 'warn');
      return;
    }

    excluindo = true;
    atualizarBarraExcluir();
    abrirProgresso('Excluindo', lista.length === 1 ? 'Removendo o cadastro...' : 'Removendo 1 de ' + lista.length + '...');
    setProgressoVisual(5);

    var okCount = 0;
    var erros = [];
    try {
      for (var i = 0; i < lista.length; i++) {
        var cel = lista[i];
        var pct = Math.round(((i) / lista.length) * 90) + 5;
        setProgressoVisual(pct);
        if (modalProgressoMsg) {
          modalProgressoMsg.textContent =
            'Excluindo ' + (i + 1) + ' de ' + lista.length + '...';
        }
        try {
          await ArturApi.excluir(senha(), cel);
          okCount += 1;
        } catch (err) {
          erros.push((exibirCelular(cel) || cel) + ': ' + (err.message || 'erro'));
        }
      }
      setProgressoVisual(100);
      await fecharProgresso();
      await refresh(false);
      if (erros.length) {
        var texto =
          okCount + ' excluído(s). ' + erros.length + ' falha(s):\n' + erros.slice(0, 5).join('\n');
        setStatus(texto.replace(/\n/g, ' '), 'warn');
        await mostrarAviso(texto, 'Exclusão parcial');
      } else {
        setStatus(okCount === 1 ? 'Cadastro excluído.' : (okCount + ' cadastros excluídos.'), 'ok');
      }
    } catch (err) {
      await fecharProgresso();
      setStatus(err.message || 'Erro ao excluir', 'err');
      await mostrarAviso(err.message || 'Erro ao excluir', 'Erro');
    } finally {
      excluindo = false;
      atualizarBarraExcluir();
    }
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
      var blob = [f.nome_pai, f.nome_mae, f.nome_responsavel, (f.adultos || []).join(' '), (f.filhos || []).join(' '), f.status].join(' ').toLowerCase();
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
      atualizarBarraExcluir();
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
            '<label class="phone-card-select">' +
              '<input type="checkbox" class="excluir-check" data-cel="' + esc(celKey) + '" aria-label="Selecionar para excluir" />' +
              '<div class="phone-card-head">' +
                '<span class="badge ' + esc(f.status) + '">' + esc(statusLabel(f.status)) + '</span>' +
                htmlCelularesEmpilhados(f) +
              '</div>' +
            '</label>' +
          '</div>' +
          pessoas +
          '<p class="phone-meias">Meias: ' + esc(f.qtd_meias || (f.filhos || []).length || 0) + '</p>' +
          '<div class="phone-meta">' +
            '<span>Cadastro: <strong>' + esc(formatarDataHora(f.criado_em)) + '</strong></span>' +
            '<span>Último acesso: <strong>' + esc(formatarDataHora(f.ultimo_acesso_em)) + '</strong></span>' +
          '</div>' +
          '<div class="phone-actions">' +
            (function () {
              var waMsg = mensagemWhatsappConfirmacao(f, filtroWhatsappPorStatus(f));
              var wa = whatsappUrlLista(f, waMsg);
              return wa
                ? '<a class="btn btn-grass" href="' + esc(wa) + '" target="_blank" rel="noopener">WhatsApp</a>'
                : '';
            })() +
            (f.status !== 'confirmado' && f.status !== 'presente'
              ? '<button type="button" class="btn btn-grass" data-act="confirmar" data-cel="' + esc(celKey) + '">Confirmar</button>'
              : '') +
            (f.status !== 'nao_vai'
              ? '<button type="button" class="btn btn-wood" data-act="nao-vai" data-cel="' + esc(celKey) + '">Não vão</button>'
              : '') +
            '<button type="button" class="btn btn-wood" data-act="editar" data-cel="' + esc(celKey) + '">Editar</button>' +
            (f.liberar_acompanhantes
              ? '<button type="button" class="btn btn-grass" data-act="liberar-adultos" data-cel="' + esc(celKey) + '" data-on="0">Travar outro adulto</button>'
              : '<button type="button" class="btn btn-secondary" data-act="liberar-adultos" data-cel="' + esc(celKey) + '" data-on="1">Liberar outro adulto</button>') +
            '<button type="button" class="btn btn-danger" data-act="excluir" data-cel="' + esc(celKey) + '">Excluir</button>' +
          '</div>' +
        '</article>'
      );
    }).join('');

    listaEl.querySelectorAll('.excluir-check').forEach(function (box) {
      box.addEventListener('change', atualizarBarraExcluir);
    });
    atualizarBarraExcluir();

    listaEl.querySelectorAll('.lista-check').forEach(function (box) {
      box.addEventListener('change', function () {
        onCheckPessoaChange(box, function () {
          renderLista(window.__familias || []);
        });
      });
    });

    listaEl.querySelectorAll('button[data-act]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        var act = btn.getAttribute('data-act');
        var cel = btn.getAttribute('data-cel');
        var familia = familiaPorCelular(cel);

        try {
          if (act === 'confirmar') {
            await ArturApi.adminStatus(senha(), cel, 'confirmado');
            setStatus('Família confirmada (vão à festa).', 'ok');
            await refresh(false);
            return;
          }
          if (act === 'nao-vai') {
            var okNao = await pedirConfirmacao('Marcar esta família como NÃO VÃO?', {
              titulo: 'Não vão',
              textoSim: 'Sim, não vão',
              textoNao: 'Cancelar',
              classeSim: 'btn-danger'
            });
            if (!okNao) return;
            await ArturApi.adminStatus(senha(), cel, 'nao_vai');
            setStatus('Registrado que não vão.', 'warn');
            await refresh(false);
            return;
          }
          if (act === 'editar' && familia) {
            editandoCelularKey = chaveFamilia(familia) || null;
            var phones = celularesDaFamilia(familia).filter(function (c) { return !ehSemCelular(c); });
            celularInput.value = phones[0] ? ArturApi.formatPhone(phones[0]) : '';
            if (celular2Input) celular2Input.value = phones[1] ? ArturApi.formatPhone(phones[1]) : '';
            paiInput.value = familia.nome_pai || '';
            maeInput.value = familia.nome_mae || '';
            setFilhos(familia.filhos, getChecksLocais(), chaveFamilia(familia));
            setAdultos(familia.adultos, getChecksLocais(), chaveFamilia(familia));
            if (checkLiberarFamilia) checkLiberarFamilia.checked = !!familia.liberar_acompanhantes;
            syncChecksFormulario(familia);
            abrirCadastro();
            setStatus('Cadastro carregado. Use os checks para confirmar quem vai.', 'warn');
            return;
          }
          if (act === 'liberar-adultos') {
            var ligar = btn.getAttribute('data-on') === '1';
            await aplicarLiberarAcompanhantes(cel, ligar);
            return;
          }
          if (act === 'excluir') {
            await excluirFamiliasComProgresso([cel]);
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
    var mostrouProgresso = !!fromLogin;
    if (mostrouProgresso) {
      abrirProgresso('Entrando', 'Validando senha e carregando a lista...');
      if (btnEntrar) {
        btnEntrar.disabled = true;
        btnEntrar.textContent = 'Entrando...';
      }
    }
    try {
      var data = await ArturApi.listar(senha());
      window.__familias = ordenarPorTelefone(data.familias || []);
      window.__acessosLista = data.acessos || [];
      window.__acessosPorDia = data.acessos_por_dia || {};
      window.__cadastrosPorDia = data.cadastros_por_dia || {};
      window.__missaoResumo = data.missao_resumo || { acessos: 0, iniciou: 0, finalizou: 0, clicou_20: 0 };
      window.__missaoSessoes = data.missao_sessoes || [];
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
      // fallback acessos: lista vazia ou gráfico vazio → usa ultimo_acesso_em
      if (!window.__acessosLista.length) {
        window.__acessosLista = montarAcessosFallback(window.__familias);
      }
      if (!Object.keys(window.__acessosPorDia).length) {
        window.__acessosPorDia = agregarMapaDeAcessos(window.__acessosLista);
      }
      if (mostrouProgresso) {
        if (modalProgressoMsg) modalProgressoMsg.textContent = 'Montando dashboard e lista...';
        setProgressoVisual(92);
      }
      mostrarApp();
      window.__configConvite = data.config || window.__configConvite || {};
      if (checkLiberarGeral) {
        checkLiberarGeral.checked = !!(window.__configConvite.liberar_acompanhantes_geral);
      }
      renderLista(window.__familias);
      var apiVer = data.versao || '';
      window.__apiVersao = apiVer;
      if (apiVer && !/v8\.(9|10|11)|v8\.1[0-9]|missao-energetica|liberar-acompanhantes|filhos-opcional|check-confirma|celular-55/.test(apiVer)) {
        var avisoApi = 'API desatualizada (' + apiVer + '). Abra o site com Ctrl+F5 e republiche o Apps Script.';
        setStatus(avisoApi, 'err');
        if (fromLogin) setLoginStatus(avisoApi, 'err');
      } else {
        setStatus(
          (fromLogin ? 'Lista carregada.' : 'Lista atualizada.') + (apiVer ? ' API ' + apiVer : ''),
          'ok'
        );
        if (fromLogin) setLoginStatus('Entrada ok.', 'ok');
      }
      if (mostrouProgresso) await fecharProgresso();
      return true;
    } catch (err) {
      var erro = err.message || 'Erro ao listar';
      if (mostrouProgresso) await fecharProgresso();
      if (fromLogin) setLoginStatus(erro, 'err');
      else setStatus(erro, 'err');
      return false;
    } finally {
      if (mostrouProgresso && btnEntrar) {
        btnEntrar.disabled = false;
        btnEntrar.textContent = 'Entrar';
      }
    }
  }

  async function entrar() {
    setLoginStatus('Entrando...', '');
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
  if (addAdultBtn && adultsBox) {
    addAdultBtn.addEventListener('click', function () {
      adultsBox.appendChild(adultInput(''));
    });
  }

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

  if (checkLiberarGeral) {
    checkLiberarGeral.addEventListener('change', async function () {
      if (!logado) return;
      var ligar = !!checkLiberarGeral.checked;
      try {
        var data = await ArturApi.salvarConfig(senha(), { liberar_acompanhantes_geral: ligar });
        window.__configConvite = (data && data.config) || { liberar_acompanhantes_geral: ligar };
        atualizarDashboard(window.__familias || []);
        if (secaoTabela && !secaoTabela.classList.contains('hidden')) {
          renderTabelaDados(window.__familias || []);
        }
        setStatus(
          ligar
            ? 'Flag geral ligado: no convite todos podem incluir 1 outro adulto.'
            : 'Flag geral desligado: só famílias liberadas individualmente.',
          ligar ? 'ok' : 'warn'
        );
      } catch (err) {
        checkLiberarGeral.checked = !ligar;
        setStatus(err.message || 'Erro ao salvar configuração', 'err');
      }
    });
  }

  var btnCopiarStatusWa = document.getElementById('btn-copiar-status-wa');
  if (btnCopiarStatusWa) {
    btnCopiarStatusWa.addEventListener('click', function () {
      copiarStatusWhatsapp();
    });
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

  document.querySelectorAll('.dash-click[data-filtro]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      abrirListaDash(btn.getAttribute('data-filtro'));
    });
  });
  var modalDashLista = document.getElementById('modal-dash-lista');
  if (modalDashLista) {
    modalDashLista.querySelectorAll('[data-dash-fechar]').forEach(function (el) {
      el.addEventListener('click', fecharModalDashLista);
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var m = document.getElementById('modal-dash-lista');
    if (m && !m.classList.contains('hidden')) fecharModalDashLista();
  });

  if (checkTodosExcluir) {
    checkTodosExcluir.addEventListener('change', function () {
      if (!listaEl) return;
      var marcar = checkTodosExcluir.checked;
      listaEl.querySelectorAll('.excluir-check').forEach(function (box) {
        box.checked = marcar;
      });
      atualizarBarraExcluir();
    });
  }
  if (btnExcluirSelecionados) {
    btnExcluirSelecionados.addEventListener('click', function () {
      excluirFamiliasComProgresso(celularesSelecionadosExcluir());
    });
  }

  function agendarFiltroLogs() {
    clearTimeout(buscaLogsTimer);
    buscaLogsTimer = setTimeout(renderTabelasLogs, 80);
  }
  if (buscaLogsInput) {
    ['input', 'keyup', 'search', 'paste'].forEach(function (evName) {
      buscaLogsInput.addEventListener(evName, agendarFiltroLogs);
    });
  }

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
  setAdultos(['']);

  var btnScrollTop = document.getElementById('btn-scroll-top');
  var btnScrollBottom = document.getElementById('btn-scroll-bottom');
  if (btnScrollTop) {
    btnScrollTop.addEventListener('click', function () {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
  }
  if (btnScrollBottom) {
    btnScrollBottom.addEventListener('click', function () {
      var y = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight
      );
      window.scrollTo(0, y);
      document.documentElement.scrollTop = y;
      document.body.scrollTop = y;
    });
  }
})();
