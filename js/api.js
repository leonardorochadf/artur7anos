(function (global) {
  function apiUrl() {
    var cfg = global.ARTUR_CONFIG || {};
    return String(cfg.apiUrl || '').trim();
  }

  function ready() {
    var url = apiUrl();
    return url && url.indexOf('http') === 0 && url.indexOf('COLE_AQUI') === -1;
  }

  async function request(method, params, body) {
    if (!ready()) {
      throw new Error('Configure a URL do Apps Script em config.js');
    }

    var url = apiUrl();
    var opts = { method: method, redirect: 'follow' };

    if (method === 'GET') {
      var qs = new URLSearchParams(params || {}).toString();
      url += (url.indexOf('?') >= 0 ? '&' : '?') + qs;
    } else {
      opts.headers = { 'Content-Type': 'text/plain;charset=utf-8' };
      opts.body = JSON.stringify(body || {});
    }

    var res = await fetch(url, opts);
    var data = await res.json();
    if (!data || data.ok === false) {
      throw new Error((data && data.erro) || 'Falha na API');
    }
    return data;
  }

  function onlyDigits(v) {
    return String(v || '').replace(/\D/g, '');
  }

  /**
   * Aceita colagem/autocomplete tipo "+55 11 95382-2691"
   * e devolve DDD+número BR (ex.: 11953822691).
   */
  function normalizarCelular(v) {
    var d = onlyDigits(v);
    if (!d) return '';

    // IDs internos do admin (sem telefone real)
    if (/^990\d{8}$/.test(d) || /^000\d{8}$/.test(d)) return d;

    // Código do país Brasil: +55 / 55
    if ((d.length === 12 || d.length === 13) && d.indexOf('55') === 0) {
      d = d.slice(2);
    } else if (d.length > 11 && d.indexOf('55') === 0) {
      d = d.slice(2);
    }

    // 0 + DDD (ex.: 011953822691)
    if (d.length >= 11 && d.charAt(0) === '0') {
      d = d.slice(1);
    }

    if (d.length > 11) d = d.slice(-11);
    return d.slice(0, 11);
  }

  function formatPhone(v) {
    var d = normalizarCelular(v);
    if (d.length <= 2) return d;
    if (d.length <= 6) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
    if (d.length <= 10) {
      return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
    }
    return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
  }

  global.ArturApi = {
    ready: ready,
    onlyDigits: onlyDigits,
    normalizarCelular: normalizarCelular,
    formatPhone: formatPhone,
    buscar: function (q, celular) {
      return request('GET', { action: 'buscar', q: q || '', celular: celular || '' });
    },
    salvar: function (payload) {
      return request('POST', null, Object.assign({ action: 'salvar' }, payload));
    },
    recusar: function (payload) {
      return request('POST', null, Object.assign({ action: 'recusar', status: 'nao_vai' }, payload));
    },
    preCadastro: function (payload) {
      return request('POST', null, Object.assign({ action: 'pre_cadastro' }, payload));
    },
    listar: function (senha) {
      return request('POST', null, { action: 'listar', senha: senha });
    },
    marcarPresente: function (senha, celular) {
      return request('POST', null, { action: 'marcar_presente', senha: senha, celular: celular });
    },
    desmarcarPresente: function (senha, celular) {
      return request('POST', null, { action: 'desmarcar_presente', senha: senha, celular: celular });
    },
    adminStatus: function (senha, celular, status) {
      return request('POST', null, { action: 'admin_status', senha: senha, celular: celular, status: status });
    },
    excluir: function (senha, celular) {
      return request('POST', null, { action: 'excluir', senha: senha, celular: celular });
    },
    missaoEvento: function (sessionId, evento) {
      if (!ready()) return Promise.resolve({ ok: false });
      var url = apiUrl();
      var payload = {
        action: 'missao_evento',
        session_id: sessionId,
        evento: evento
      };
      try {
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
          keepalive: true,
          redirect: 'follow'
        }).catch(function () {});
        return Promise.resolve({ ok: true });
      } catch (e) {
        return request('POST', null, payload).catch(function () {
          return { ok: false };
        });
      }
    }
  };
})(window);
