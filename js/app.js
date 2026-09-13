(function () {
  var ev = (window.ARTUR_CONFIG && window.ARTUR_CONFIG.evento) || {};
  var form = document.getElementById('form-rsvp');
  var celularInput = document.getElementById('celular');
  var paiInput = document.getElementById('nome-pai');
  var maeInput = document.getElementById('nome-mae');
  var responsavelInput = document.getElementById('nome-responsavel');
  var wrapUnico = document.getElementById('wrap-responsavel-unico');
  var wrapPais = document.getElementById('wrap-pais');
  var kidsBox = document.getElementById('kids');
  var addKidBtn = document.getElementById('add-kid');
  var btnBuscar = document.getElementById('btn-buscar');
  var btnConfirmar = document.getElementById('btn-confirmar');
  var btnNaoVai = document.getElementById('btn-nao-vai');
  var blocoFamilia = document.getElementById('bloco-familia');
  var badgeCadastro = document.getElementById('badge-cadastro');
  var statusEl = document.getElementById('status');
  var meiasEl = document.getElementById('meias-count');
  var familiaAtual = null;
  var debounceTimer = null;
  var buscando = false;
  var salvandoRsvp = false;
  var modalProgresso = document.getElementById('modal-progresso');
  var modalProgressoMsg = document.getElementById('modal-progresso-msg');
  var modalProgressoTitulo = document.getElementById('modal-progresso-titulo');
  var modalProgressoFill = document.getElementById('modal-progresso-fill');
  var modalProgressoPct = document.getElementById('modal-progresso-pct');
  var progressoTimer = null;
  var modalConfirm = document.getElementById('modal-confirm');
  var modalConfirmBox = modalConfirm ? modalConfirm.querySelector('.modal-confirm-box') : null;
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
    if (modalConfirmBox) modalConfirmBox.classList.remove('modal-danger');
    var resolve = modalConfirmResolver;
    modalConfirmResolver = null;
    if (resolve) resolve(!!resultado);
  }

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
      modalConfirmSim.className = 'btn ' + (opts.classeSim || 'btn-grass');
      if (modalConfirmBox) {
        if (opts.perigo) modalConfirmBox.classList.add('modal-danger');
        else modalConfirmBox.classList.remove('modal-danger');
      }
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

  function setProgressoVisual(pct) {
    var p = Math.max(0, Math.min(100, Math.round(pct)));
    if (modalProgressoFill) modalProgressoFill.style.width = p + '%';
    if (modalProgressoPct) modalProgressoPct.textContent = p + '%';
  }

  function abrirProgresso(titulo, mensagem) {
    if (!modalProgresso) return;
    if (modalProgressoTitulo) modalProgressoTitulo.textContent = titulo || 'Aguarde';
    if (modalProgressoMsg) modalProgressoMsg.textContent = mensagem || 'Carregando...';
    setProgressoVisual(8);
    modalProgresso.classList.remove('hidden');
    clearInterval(progressoTimer);
    var atual = 8;
    progressoTimer = setInterval(function () {
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
      }, 250);
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

  function setStatus(msg, type) {
    statusEl.textContent = msg || '';
    statusEl.className = 'status' + (type ? ' ' + type : '');
  }

  function copiarTexto(texto, botao, labelOk) {
    return (async function () {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(texto);
        } else {
          var ta = document.createElement('textarea');
          ta.value = texto;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          ta.remove();
        }
        var prev = botao.textContent;
        botao.textContent = labelOk || 'Copiado!';
        setTimeout(function () { botao.textContent = prev; }, 1500);
      } catch (err) {
        botao.textContent = 'Erro';
        setTimeout(function () { botao.textContent = 'Copiar'; }, 1500);
      }
    })();
  }

  function fillEvent() {
    var enderecoCompleto = (ev.endereco || '') + (ev.cep ? ' - ' + ev.cep : '');
    var map = {
      'ev-data': ev.data,
      'ev-hora': ev.horario,
      'ev-local': ev.local,
      'ev-endereco': enderecoCompleto
    };
    Object.keys(map).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.textContent = map[id] || '—';
    });
    var maps = document.getElementById('btn-maps');
    if (maps && ev.mapsUrl) maps.href = ev.mapsUrl;

    var copyBtn = document.getElementById('btn-copy-address');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        var texto = enderecoCompleto || document.getElementById('ev-endereco').textContent;
        copiarTexto(texto, copyBtn, 'Copiado!');
      });
    }

    var termoCfg = (window.ARTUR_CONFIG && window.ARTUR_CONFIG.termo) || {};
    var termoUrl = termoCfg.url || '';
    var termoLink = document.getElementById('termo-link');
    var btnAbrirTermo = document.getElementById('btn-abrir-termo');
    var btnCopyTermo = document.getElementById('btn-copy-termo');
    var btnRsvpTermo = document.getElementById('btn-rsvp-termo');

    if (termoUrl) {
      if (termoLink) {
        termoLink.href = termoUrl;
        termoLink.textContent = termoUrl;
      }
      if (btnAbrirTermo) btnAbrirTermo.href = termoUrl;
      if (btnRsvpTermo) btnRsvpTermo.href = termoUrl;
      if (btnCopyTermo) {
        btnCopyTermo.addEventListener('click', function () {
          copiarTexto(termoUrl, btnCopyTermo, 'Link copiado!');
        });
      }
    } else if (btnRsvpTermo) {
      btnRsvpTermo.classList.add('hidden');
    }
  }

  function kidInput(value) {
    var row = document.createElement('div');
    row.className = 'kid-row';
    row.innerHTML =
      '<input type="text" class="kid-name" placeholder="Nome do(a) filho(a)" maxlength="60" />' +
      '<button type="button" class="btn btn-danger remove-kid" aria-label="Remover">X</button>';
    var input = row.querySelector('input');
    input.value = value || '';
    row.querySelector('.remove-kid').addEventListener('click', function () {
      row.remove();
      if (!kidsBox.querySelector('.kid-row')) {
        kidsBox.appendChild(kidInput(''));
      }
      updateMeias();
    });
    input.addEventListener('input', updateMeias);
    input.addEventListener('keydown', async function (e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (!input.value.trim()) {
        await mostrarAviso('Digite o nome do filho(a) antes.', 'Atenção');
        setStatus('Digite o nome do filho(a) antes.', 'warn');
        return;
      }
      var salvarAgora = await pedirConfirmacao('Deseja confirmar/salvar este cadastro agora?', {
        titulo: 'Salvar cadastro',
        textoSim: 'Sim, confirmar',
        textoNao: 'Ainda não',
        classeSim: 'btn-grass'
      });
      if (salvarAgora) {
        form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true }));
        return;
      }
      setStatus('Para incluir mais um filho, clique em “+ Incluir filho(a)”.', 'warn');
    });
    return row;
  }

  function getFilhos() {
    return Array.prototype.map.call(kidsBox.querySelectorAll('.kid-name'), function (el) {
      return el.value.trim();
    }).filter(Boolean);
  }

  function setFilhos(list) {
    kidsBox.innerHTML = '';
    (list && list.length ? list : ['']).forEach(function (nome) {
      kidsBox.appendChild(kidInput(nome));
    });
    updateMeias();
  }

  function updateMeias() {
    meiasEl.textContent = String(getFilhos().length);
  }

  var btnVoltarRsvp = document.getElementById('btn-voltar-rsvp');
  var secaoConfirmar = document.getElementById('confirmar');
  var painelRsvp = document.getElementById('painel-rsvp');
  var rsvpTermo = document.getElementById('rsvp-termo');

  function entrarModoRsvp() {
    document.body.classList.add('modo-rsvp');
    if (btnVoltarRsvp) btnVoltarRsvp.classList.remove('hidden');
    if (secaoConfirmar) {
      secaoConfirmar.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function mostrarLookup() {
    if (painelRsvp) painelRsvp.classList.remove('rsvp-dados-abertos');
    if (rsvpTermo) rsvpTermo.classList.add('hidden');
  }

  function ocultarLookup() {
    if (painelRsvp) painelRsvp.classList.add('rsvp-dados-abertos');
    if (rsvpTermo) rsvpTermo.classList.remove('hidden');
  }

  function sairModoRsvp() {
    document.body.classList.remove('modo-rsvp');
    if (btnVoltarRsvp) btnVoltarRsvp.classList.add('hidden');
    blocoFamilia.classList.add('hidden');
    mostrarLookup();
    familiaAtual = null;
    setStatus('', '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function atualizarBotoesRsvp(f, encontrado) {
    if (!btnConfirmar || !btnNaoVai) return;

    btnConfirmar.classList.remove('btn-pulse', 'btn-pressed', 'btn-pressed-ok', 'btn-pressed-no');
    btnNaoVai.classList.remove('btn-pulse', 'btn-pressed', 'btn-pressed-ok', 'btn-pressed-no');
    btnConfirmar.removeAttribute('aria-pressed');
    btnNaoVai.removeAttribute('aria-pressed');

    var st = encontrado && f ? (f.status || 'pre_cadastro') : '';

    if (st === 'confirmado' || st === 'presente') {
      btnConfirmar.classList.add('btn-pressed', 'btn-pressed-ok');
      btnConfirmar.setAttribute('aria-pressed', 'true');
      btnNaoVai.setAttribute('aria-pressed', 'false');
      return;
    }

    if (st === 'nao_vai') {
      btnNaoVai.classList.add('btn-pressed', 'btn-pressed-no');
      btnNaoVai.setAttribute('aria-pressed', 'true');
      btnConfirmar.setAttribute('aria-pressed', 'false');
      return;
    }

    // Novo cadastro ou ainda não confirmado: pisca o Confirmar presença
    btnConfirmar.classList.add('btn-pulse');
    btnConfirmar.setAttribute('aria-pressed', 'false');
    btnNaoVai.setAttribute('aria-pressed', 'false');
  }

  function montarBadgeStatus(f, encontrado) {
    // Badge visual removido da tela: o estado fica nos botões + status
    if (badgeCadastro) {
      badgeCadastro.classList.add('hidden');
      badgeCadastro.innerHTML = '';
    }
    atualizarBotoesRsvp(encontrado ? f : null, !!encontrado);
  }

  function modoFormulario(encontrado) {
    if (encontrado) {
      if (wrapUnico) wrapUnico.classList.add('hidden');
      if (wrapPais) wrapPais.classList.remove('hidden');
    } else {
      if (wrapUnico) wrapUnico.classList.remove('hidden');
      if (wrapPais) wrapPais.classList.add('hidden');
    }
  }

  function familiaTemCelular(f, celular) {
    if (!f || !celular) return false;
    var lista = f.celulares || [];
    if (lista.length) return lista.indexOf(celular) >= 0;
    return String(f.celular || '') === celular;
  }

  function abrirFormulario(f, encontrado) {
    familiaAtual = f || null;
    blocoFamilia.classList.remove('hidden');
    ocultarLookup();
    entrarModoRsvp();
    modoFormulario(!!encontrado);

    if (encontrado && f) {
      if (paiInput) paiInput.value = f.nome_pai || '';
      if (maeInput) maeInput.value = f.nome_mae || '';
      if (responsavelInput) responsavelInput.value = '';
      setFilhos(f.filhos || []);
    } else {
      if (paiInput) paiInput.value = '';
      if (maeInput) maeInput.value = '';
      if (responsavelInput) responsavelInput.value = '';
      setFilhos(['']);
    }
    montarBadgeStatus(f, encontrado);
  }

  async function buscarPorTelefone() {
    if (buscando) return;
    if (!ArturApi.ready()) {
      setStatus('API ainda não configurada.', 'warn');
      return;
    }

    var celular = ArturApi.onlyDigits(celularInput.value);
    if (celular.length < 10) {
      await mostrarAviso('Digite o celular completo com DDD.', 'Atenção');
      setStatus('Digite o celular completo com DDD.', 'warn');
      blocoFamilia.classList.add('hidden');
      return;
    }

    buscando = true;
    if (btnBuscar) {
      btnBuscar.disabled = true;
      btnBuscar.textContent = 'Buscando...';
    }
    setStatus('Buscando cadastro...', '');
    abrirProgresso('Buscando', 'Procurando o cadastro deste celular...');
    try {
      var data = await ArturApi.buscar('', celular);
      var results = data.resultados || [];
      var exact = results.find(function (r) { return familiaTemCelular(r, celular); });

      await fecharProgresso();

      if (exact) {
        abrirFormulario(exact, true);
        setStatus('Família carregada. Confirme, ajuste ou informe que não vai.', 'ok');
      } else {
        abrirFormulario(null, false);
        setStatus('Novo telefone: cadastre 1 responsável e os filhos, depois confirme.', 'warn');
      }
    } catch (err) {
      await fecharProgresso();
      setStatus(err.message || 'Erro ao buscar', 'err');
    } finally {
      buscando = false;
      if (btnBuscar) {
        btnBuscar.disabled = false;
        btnBuscar.textContent = 'Buscar';
      }
    }
  }

  function payloadBase() {
    var encontrado = !!(familiaAtual && familiaTemCelular(familiaAtual, ArturApi.onlyDigits(celularInput.value)));
    var payload = {
      celular: ArturApi.onlyDigits(celularInput.value),
      filhos: getFilhos(),
      origem: 'convidado'
    };

    if (encontrado) {
      payload.nome_pai = paiInput ? paiInput.value.trim() : '';
      payload.nome_mae = maeInput ? maeInput.value.trim() : '';
    } else {
      var resp = responsavelInput ? responsavelInput.value.trim() : '';
      payload.nome_responsavel = resp;
      payload.nome_pai = resp;
      payload.nome_mae = '';
    }
    return payload;
  }

  async function validarConfirmacao(payload, recusar) {
    if (payload.celular.length < 10) {
      await mostrarAviso('Celular incompleto. Digite com DDD.', 'Atenção');
      setStatus('Celular incompleto.', 'err');
      return false;
    }
    var temNome = !!(payload.nome_pai || payload.nome_mae || payload.nome_responsavel);
    if (!temNome) {
      await mostrarAviso('Informe o nome do responsável.', 'Atenção');
      setStatus('Informe o responsável.', 'err');
      return false;
    }
    if (!recusar && !payload.filhos.length) {
      await mostrarAviso('Inclua ao menos um filho(a), ou toque em “Não vou poder ir”.', 'Atenção');
      setStatus('Inclua ao menos um filho(a), ou toque em “Não vou poder ir”.', 'err');
      return false;
    }
    return true;
  }

  celularInput.addEventListener('focus', function () {
    entrarModoRsvp();
  });

  celularInput.addEventListener('input', function () {
    celularInput.value = ArturApi.formatPhone(celularInput.value);
    clearTimeout(debounceTimer);
    var digitos = ArturApi.onlyDigits(celularInput.value);
    if (digitos.length > 0) entrarModoRsvp();
    if (digitos.length >= 10) {
      debounceTimer = setTimeout(buscarPorTelefone, 400);
    } else {
      blocoFamilia.classList.add('hidden');
      mostrarLookup();
    }
  });

  celularInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      buscarPorTelefone();
    }
  });

  btnBuscar.addEventListener('click', function () {
    entrarModoRsvp();
    buscarPorTelefone();
  });

  if (btnVoltarRsvp) {
    btnVoltarRsvp.addEventListener('click', sairModoRsvp);
  }

  var btnIrConfirmar = document.getElementById('btn-ir-confirmar');
  if (btnIrConfirmar) {
    btnIrConfirmar.addEventListener('click', function (e) {
      e.preventDefault();
      entrarModoRsvp();
      if (celularInput) {
        setTimeout(function () { celularInput.focus(); }, 50);
      }
    });
  }

  addKidBtn.addEventListener('click', function () {
    kidsBox.appendChild(kidInput(''));
    updateMeias();
  });

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (salvandoRsvp) return;
    if (!ArturApi.ready()) {
      await mostrarAviso('Configure a API antes de confirmar.', 'Erro');
      setStatus('Configure a API antes de confirmar.', 'err');
      return;
    }

    var payload = payloadBase();
    if (!(await validarConfirmacao(payload, false))) return;

    var ok = await pedirConfirmacao('Confirmar a presença desta família na festa?', {
      titulo: 'Confirmar presença',
      textoSim: 'Sim, confirmar',
      textoNao: 'Cancelar',
      classeSim: 'btn-grass'
    });
    if (!ok) return;

    salvandoRsvp = true;
    setStatus('Salvando confirmação...', '');
    abrirProgresso('Salvando', 'Registrando a confirmação...');
    try {
      var data = await ArturApi.salvar(payload);
      await fecharProgresso();
      familiaAtual = data.familia || familiaAtual;
      var msg =
        (data.msg || 'Confirmado!') +
        '\n\nMeias: ' + (data.familia && data.familia.qtd_meias != null ? data.familia.qtd_meias : payload.filhos.length) + '.';
      setStatus(msg.replace(/\n\n/g, ' '), 'ok');
      if (data.familia) abrirFormulario(data.familia, true);
      await mostrarAviso(msg, 'Presença confirmada');
    } catch (err) {
      await fecharProgresso();
      var erro = err.message || 'Erro ao salvar';
      setStatus(erro, 'err');
      await mostrarAviso(erro, 'Erro');
    } finally {
      salvandoRsvp = false;
    }
  });

  btnNaoVai.addEventListener('click', async function () {
    if (salvandoRsvp) return;
    if (!ArturApi.ready()) {
      await mostrarAviso('Configure a API antes.', 'Erro');
      setStatus('Configure a API antes.', 'err');
      return;
    }

    var payload = payloadBase();
    if (!(await validarConfirmacao(payload, true))) return;

    var ok = await pedirConfirmacao('Confirmar que não poderão ir à festa?', {
      titulo: 'Não vou poder ir',
      textoSim: 'Sim, registrar',
      textoNao: 'Cancelar',
      classeSim: 'btn-danger',
      perigo: true
    });
    if (!ok) return;

    salvandoRsvp = true;
    setStatus('Registrando recusa...', '');
    abrirProgresso('Salvando', 'Registrando que não vão...');
    try {
      var data = await ArturApi.recusar(payload);
      await fecharProgresso();
      var msg = data.msg || 'Registrado: não vão.';
      setStatus(msg, 'warn');
      if (data.familia) abrirFormulario(data.familia, true);
      await mostrarAviso(msg, 'Registrado');
    } catch (err) {
      await fecharProgresso();
      var erro = err.message || 'Erro ao salvar';
      setStatus(erro, 'err');
      await mostrarAviso(erro, 'Erro');
    } finally {
      salvandoRsvp = false;
    }
  });

  fillEvent();

  if (!ArturApi.ready()) {
    setStatus('Modo visual ativo. Configure o Google Sheets para gravar.', 'warn');
  }
})();
