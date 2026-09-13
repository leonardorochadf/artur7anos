(function () {
  var ev = (window.ARTUR_CONFIG && window.ARTUR_CONFIG.evento) || {};
  var form = document.getElementById('form-rsvp');
  var celularInput = document.getElementById('celular');
  var paiInput = document.getElementById('nome-pai');
  var maeInput = document.getElementById('nome-mae');
  var responsavelInput = document.getElementById('nome-responsavel');
  var wrapUnico = document.getElementById('wrap-responsavel-unico');
  var wrapPais = document.getElementById('wrap-pais');
  var rowPai = document.getElementById('row-pai');
  var rowMae = document.getElementById('row-mae');
  var btnRemoverPai = document.getElementById('btn-remover-pai');
  var btnRemoverMae = document.getElementById('btn-remover-mae');
  var btnAddPai = document.getElementById('btn-add-pai');
  var btnAddMae = document.getElementById('btn-add-mae');
  var wrapFilhos = document.getElementById('wrap-filhos');
  var wrapAdultos = document.getElementById('wrap-adultos');
  var wrapMeias = document.getElementById('wrap-meias');
  var kidsBox = document.getElementById('kids');
  var addKidBtn = document.getElementById('add-kid');
  var adultsBox = document.getElementById('adults');
  var addAdultBtn = document.getElementById('add-adult');
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

  var toastTimer = null;
  function mostrarToastTemporario(mensagem, duracaoMs) {
    var toast = document.getElementById('toast-temporario');
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.textContent = mensagem || '';
    toast.classList.remove('hidden', 'toast-out');
    toast.classList.add('toast-in');
    toast.setAttribute('aria-hidden', 'false');
    toastTimer = setTimeout(function () {
      toast.classList.remove('toast-in');
      toast.classList.add('toast-out');
      toastTimer = setTimeout(function () {
        toast.classList.add('hidden');
        toast.classList.remove('toast-out');
        toast.setAttribute('aria-hidden', 'true');
      }, 280);
    }, typeof duracaoMs === 'number' ? duracaoMs : 2800);
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
      updateMeias();
      atualizarVisibilidadeListas();
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

  function adultInput(value) {
    var row = document.createElement('div');
    row.className = 'kid-row';
    row.innerHTML =
      '<input type="text" class="adult-name" placeholder="Nome do adulto" maxlength="60" />' +
      '<button type="button" class="btn btn-danger remove-adult" aria-label="Remover">X</button>';
    var input = row.querySelector('input');
    input.value = value || '';
    row.querySelector('.remove-adult').addEventListener('click', function () {
      row.remove();
      atualizarVisibilidadeListas();
    });
    return row;
  }

  function getAdultos() {
    if (!adultsBox) return [];
    return Array.prototype.map.call(adultsBox.querySelectorAll('.adult-name'), function (el) {
      return el.value.trim();
    }).filter(Boolean);
  }

  function normalizarListaNomes(lista) {
    if (!lista) return [];
    if (typeof lista === 'string') {
      return lista.split('|').map(function (s) { return s.trim(); }).filter(Boolean);
    }
    if (!Array.isArray(lista)) return [];
    var out = [];
    lista.forEach(function (item) {
      String(item || '').split('|').forEach(function (s) {
        s = s.trim();
        if (s) out.push(s);
      });
    });
    return out;
  }

  function atualizarVisibilidadeListas() {
    var linhasFilhos = kidsBox ? kidsBox.querySelectorAll('.kid-row').length : 0;
    var linhasAdultos = adultsBox ? adultsBox.querySelectorAll('.kid-row').length : 0;
    var qtdFilhos = getFilhos().length;
    var temFilhos = linhasFilhos > 0;
    var temAdultos = linhasAdultos > 0;

    if (wrapFilhos) wrapFilhos.classList.toggle('hidden', !temFilhos);
    if (wrapAdultos) wrapAdultos.classList.toggle('hidden', !temAdultos);
    if (wrapMeias) wrapMeias.classList.toggle('hidden', qtdFilhos === 0);

    // Sempre pode incluir filho (novo cadastro ou família sem filhos ainda)
    if (addKidBtn) addKidBtn.classList.remove('hidden');
  }

  function setAdultos(list) {
    if (!adultsBox) return;
    adultsBox.innerHTML = '';
    var nomes = normalizarListaNomes(list);
    nomes.forEach(function (nome) {
      adultsBox.appendChild(adultInput(nome));
    });
    atualizarVisibilidadeListas();
  }

  function getFilhos() {
    if (!kidsBox) return [];
    return Array.prototype.map.call(kidsBox.querySelectorAll('.kid-name'), function (el) {
      return el.value.trim();
    }).filter(Boolean);
  }

  function setFilhos(list) {
    if (!kidsBox) return;
    kidsBox.innerHTML = '';
    var nomes = normalizarListaNomes(list);
    nomes.forEach(function (nome) {
      kidsBox.appendChild(kidInput(nome));
    });
    updateMeias();
    atualizarVisibilidadeListas();
  }

  function updateMeias() {
    if (meiasEl) meiasEl.textContent = String(getFilhos().length);
    if (wrapMeias) wrapMeias.classList.toggle('hidden', getFilhos().length === 0);
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

    // Primeiro cadastro: só "Confirmar presença" (sem "Não vou poder ir")
    if (!encontrado) {
      btnNaoVai.classList.add('hidden');
      btnConfirmar.classList.add('btn-pulse');
      btnConfirmar.setAttribute('aria-pressed', 'false');
      return;
    }

    btnNaoVai.classList.remove('hidden');
    var st = f ? (f.status || 'pre_cadastro') : '';

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

    // Já cadastrado, ainda não confirmado: pisca o Confirmar presença
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

  function paiVisivel() {
    return !!(rowPai && !rowPai.classList.contains('hidden'));
  }

  function maeVisivel() {
    return !!(rowMae && !rowMae.classList.contains('hidden'));
  }

  function atualizarBotoesResponsaveis() {
    var nPai = paiVisivel() ? 1 : 0;
    var nMae = maeVisivel() ? 1 : 0;
    var total = nPai + nMae;

    if (btnRemoverPai) {
      btnRemoverPai.disabled = !paiVisivel() || total <= 1;
      btnRemoverPai.title = total <= 1
        ? 'É preciso manter ao menos 1 responsável'
        : 'Remover pai';
    }
    if (btnRemoverMae) {
      btnRemoverMae.disabled = !maeVisivel() || total <= 1;
      btnRemoverMae.title = total <= 1
        ? 'É preciso manter ao menos 1 responsável'
        : 'Remover mãe';
    }
    if (btnAddPai) btnAddPai.classList.toggle('hidden', paiVisivel());
    if (btnAddMae) btnAddMae.classList.toggle('hidden', maeVisivel());
  }

  function configurarResponsaveis(pai, mae) {
    var nomePai = String(pai || '').trim();
    var nomeMae = String(mae || '').trim();

    if (paiInput) paiInput.value = nomePai;
    if (maeInput) maeInput.value = nomeMae;

    if (rowPai) {
      // Se só tem mãe, esconde pai; se tem os dois ou só pai (ou nenhum), mostra pai para editar
      if (!nomePai && nomeMae) rowPai.classList.add('hidden');
      else rowPai.classList.remove('hidden');
    }
    if (rowMae) {
      if (!nomeMae && nomePai) rowMae.classList.add('hidden');
      else rowMae.classList.remove('hidden');
    }

    // Sem nenhum nome ainda: mostra os dois campos
    if (!nomePai && !nomeMae) {
      if (rowPai) rowPai.classList.remove('hidden');
      if (rowMae) rowMae.classList.remove('hidden');
    }

    atualizarBotoesResponsaveis();
  }

  async function removerResponsavel(tipo) {
    var outroVisivel = tipo === 'pai' ? maeVisivel() : paiVisivel();
    if (!outroVisivel) {
      await mostrarAviso('É preciso manter ao menos 1 responsável (pai ou mãe).', 'Atenção');
      return;
    }

    var nome = tipo === 'pai'
      ? (paiInput ? paiInput.value.trim() : '')
      : (maeInput ? maeInput.value.trim() : '');
    var rotulo = tipo === 'pai' ? 'pai' : 'mãe';
    var msg = nome
      ? ('Remover ' + rotulo + ' "' + nome + '" deste cadastro?')
      : ('Remover o campo de ' + rotulo + '?');

    var ok = await pedirConfirmacao(msg, {
      titulo: 'Remover ' + rotulo,
      textoSim: 'Sim, remover',
      textoNao: 'Cancelar',
      classeSim: 'btn-danger',
      perigo: true
    });
    if (!ok) return;

    if (tipo === 'pai') {
      if (paiInput) paiInput.value = '';
      if (rowPai) rowPai.classList.add('hidden');
    } else {
      if (maeInput) maeInput.value = '';
      if (rowMae) rowMae.classList.add('hidden');
    }
    atualizarBotoesResponsaveis();
    setStatus('Responsável removido. Confirme a presença para salvar.', 'warn');
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
      if (responsavelInput) responsavelInput.value = '';
      configurarResponsaveis(f.nome_pai || '', f.nome_mae || '');
      setFilhos(f.filhos || []);
      setAdultos(f.adultos || []);
      if (blocoFamilia && blocoFamilia.scrollIntoView) {
        setTimeout(function () {
          blocoFamilia.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
      }
    } else {
      if (responsavelInput) responsavelInput.value = '';
      configurarResponsaveis('', '');
      setFilhos([]);
      setAdultos([]);
    }
    montarBadgeStatus(f, encontrado);
  }

  async function buscarPorTelefone(opts) {
    opts = opts || {};
    if (buscando) return;
    if (!ArturApi.ready()) {
      setStatus('API ainda não configurada.', 'warn');
      return;
    }

    aplicarCelularDigitado(celularInput.value);
    var celular = ArturApi.normalizarCelular(celularInput.value);
    if (celular.length < 10) {
      if (!opts.silencioso) {
        await mostrarAviso('Digite o celular completo com DDD.', 'Atenção');
        setStatus('Digite o celular completo com DDD.', 'warn');
      }
      blocoFamilia.classList.add('hidden');
      return;
    }

    buscando = true;
    if (btnBuscar) {
      btnBuscar.disabled = true;
      btnBuscar.textContent = 'Buscando...';
    }
    setStatus('Buscando cadastro de ' + ArturApi.formatPhone(celular) + '...', '');
    abrirProgresso('Buscando', 'Procurando o cadastro de ' + ArturApi.formatPhone(celular) + '...');
    try {
      var data = await ArturApi.buscar('', celular);
      var results = data.resultados || [];
      var exact = results.find(function (r) { return familiaTemCelular(r, celular); });
      // Busca por celular: se a API trouxe resultado, usa o primeiro
      if (!exact && celular && results.length === 1) exact = results[0];

      await fecharProgresso();

      if (exact) {
        abrirFormulario(exact, true);
        var nomes = [];
        if (exact.nome_pai) nomes.push(exact.nome_pai);
        if (exact.nome_mae) nomes.push(exact.nome_mae);
        var filhos = normalizarListaNomes(exact.filhos);
        var adultos = normalizarListaNomes(exact.adultos);
        var resumo = (nomes.length ? nomes.join(' / ') : 'Família') +
          (filhos.length ? ' · Filhos: ' + filhos.join(', ') : '') +
          (adultos.length ? ' · Adultos: ' + adultos.join(', ') : '');
        setStatus('Cadastro encontrado: ' + resumo, 'ok');
      } else {
        abrirFormulario(null, false);
        setStatus('Novo telefone: preencha o cadastro e confirme a presença.', 'warn');
        mostrarToastTemporario('Número novo! Faça o seu cadastro.', 3000);
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

  function aplicarCelularDigitado(raw) {
    var normalizado = ArturApi.normalizarCelular(raw);
    celularInput.value = ArturApi.formatPhone(normalizado);
    return normalizado;
  }

  function agendarBuscaPorCelular(delayMs) {
    clearTimeout(debounceTimer);
    var digitos = ArturApi.normalizarCelular(celularInput.value);
    if (digitos.length > 0) entrarModoRsvp();
    if (digitos.length >= 10) {
      debounceTimer = setTimeout(function () {
        buscarPorTelefone({ silencioso: true });
      }, typeof delayMs === 'number' ? delayMs : 350);
    } else {
      blocoFamilia.classList.add('hidden');
      mostrarLookup();
    }
  }

  function payloadBase() {
    var cel = ArturApi.normalizarCelular(celularInput.value);
    var encontrado = !!(familiaAtual && familiaTemCelular(familiaAtual, cel));
    var payload = {
      celular: cel,
      filhos: getFilhos(),
      adultos: encontrado ? getAdultos() : [],
      origem: 'convidado'
    };

    if (encontrado) {
      payload.nome_pai = (paiVisivel() && paiInput) ? paiInput.value.trim() : '';
      payload.nome_mae = (maeVisivel() && maeInput) ? maeInput.value.trim() : '';
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
      await mostrarAviso('Digite o celular completo com DDD.', 'Atenção');
      setStatus('Celular incompleto.', 'err');
      return false;
    }
    var temNome = !!(payload.nome_pai || payload.nome_mae || payload.nome_responsavel);
    if (!temNome) {
      await mostrarAviso('É preciso manter ao menos 1 responsável (pai ou mãe).', 'Atenção');
      setStatus('Informe ao menos 1 responsável.', 'err');
      return false;
    }
    return true;
  }

  celularInput.addEventListener('focus', function () {
    entrarModoRsvp();
  });

  celularInput.addEventListener('input', function () {
    aplicarCelularDigitado(celularInput.value);
    agendarBuscaPorCelular(350);
  });

  // Autocomplete / sugestão do teclado (ex.: +55 11 95382-2691)
  celularInput.addEventListener('change', function () {
    aplicarCelularDigitado(celularInput.value);
    agendarBuscaPorCelular(120);
  });

  celularInput.addEventListener('paste', function (e) {
    e.preventDefault();
    var texto = '';
    try {
      texto = (e.clipboardData || window.clipboardData).getData('text') || '';
    } catch (err) {
      texto = '';
    }
    aplicarCelularDigitado(texto || celularInput.value);
    agendarBuscaPorCelular(80);
  });

  celularInput.addEventListener('blur', function () {
    aplicarCelularDigitado(celularInput.value);
    var digitos = ArturApi.normalizarCelular(celularInput.value);
    if (digitos.length >= 10 && !familiaAtual) {
      agendarBuscaPorCelular(50);
    }
  });

  celularInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(debounceTimer);
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
    if (!kidsBox) return;
    kidsBox.appendChild(kidInput(''));
    updateMeias();
    atualizarVisibilidadeListas();
  });

  if (btnRemoverPai) {
    btnRemoverPai.addEventListener('click', function () { removerResponsavel('pai'); });
  }
  if (btnRemoverMae) {
    btnRemoverMae.addEventListener('click', function () { removerResponsavel('mae'); });
  }
  if (btnAddPai) {
    btnAddPai.addEventListener('click', function () {
      if (rowPai) rowPai.classList.remove('hidden');
      if (paiInput) {
        paiInput.value = '';
        paiInput.focus();
      }
      atualizarBotoesResponsaveis();
    });
  }
  if (btnAddMae) {
    btnAddMae.addEventListener('click', function () {
      if (rowMae) rowMae.classList.remove('hidden');
      if (maeInput) {
        maeInput.value = '';
        maeInput.focus();
      }
      atualizarBotoesResponsaveis();
    });
  }

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
