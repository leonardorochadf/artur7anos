# Convite Artur 7 anos (mobile + Google Sheets)

Página 100% mobile para compartilhar o convite do Artur, com:

- tema visual Minecraft + arte do convite Jump
- cadastro responsável + filhos (1 pai → 1 ou mais irmãos)
- pré-cadastro pela organização
- autocomplete por celular/nome
- confirmação de presença
- chave única: **número de celular**
- contagem de **meias antiderrapantes** (= quantidade de filhos)

Custo: **R$ 0** (Google Sheets + Apps Script + hospedagem estática gratuita).

## Arquitetura (barata e simples)

```
WhatsApp / link
      ↓
index.html (convidado)  ──fetch──►  Google Apps Script (API)
admin.html (você)       ──fetch──►           ↓
                                      Google Sheets
```

Não precisa de banco pago, Firebase, Vercel pago etc. A planilha é o banco.

### Colunas da aba `Familias`

| celular | nome_responsavel | filhos | status | origem | qtd_meias | presente_em | criado_em | atualizado_em | observacao |
|---------|------------------|--------|--------|--------|-----------|-------------|-----------|---------------|------------|

Status possíveis:

- `pre_cadastro` — você cadastrou antes
- `confirmado` — a pessoa confirmou no link
- `presente` — chegou no dia (você marca no admin)

Filhos ficam em uma célula, separados por ` | ` (ex.: `Lucas | Sofia`).

## Passo a passo (15–20 min)

### 1) Criar a planilha

1. Abra [Google Sheets](https://sheets.google.com) e crie uma planilha vazia.
2. Copie o **ID** da URL:
   `https://docs.google.com/spreadsheets/d/ESTE_ID_AQUI/edit`

### 2) Criar a API (Apps Script)

1. Na planilha: **Extensões → Apps Script**
2. Apague o código padrão e cole o conteúdo de `apps-script/Code.gs`
3. No editor, rode a função `configurarPropriedades` **depois** de editar nela:
   - `SHEET_ID`: o ID da planilha
   - `ADMIN_SENHA`: senha do painel (ex.: `19122019@`)
4. Ou defina em **Projeto → Configurações → Propriedades do script** as chaves `SHEET_ID` e `ADMIN_SENHA`
5. **Implantar → Nova implantação**
   - Tipo: **App da Web**
   - Executar como: **Eu**
   - Quem tem acesso: **Qualquer pessoa**
6. Autorize a conta Google e copie a URL `.../exec`

### 3) Ligar a página na API

Edite `config.js` e cole a URL:

```js
apiUrl: 'https://script.google.com/macros/s/XXXX/exec'
```

### 4) Publicar a página (grátis)

Opções boas:

1. **Netlify Drop** (mais fácil): arraste a pasta do projeto em [https://app.netlify.com/drop](https://app.netlify.com/drop)
2. **GitHub Pages**: suba o repositório e ative Pages na branch
3. **Cloudflare Pages** / **Firebase Hosting free**

Arquivos necessários no ar:

- `index.html`
- `admin.html`
- `config.js`
- `styles.css`
- `JUMP.jpeg`
- `js/api.js`
- `js/app.js`
- `js/admin.js`

### 5) Testar

1. Abra `admin.html` → digite a senha → faça um pré-cadastro
2. Abra `index.html` → digite o mesmo celular ou nome → deve sugerir a família
3. Confirme presença
4. No admin, clique **Presente** no dia da festa

## Fluxo recomendado de uso

1. **Antes**: você pré-cadastra quem provavelmente vai (admin)
2. **Compartilha** o link do `index.html` no WhatsApp
3. **Convidado** digita celular/nome → completa filhos se precisar → confirma
4. **No Jump**: abre o admin no celular, busca pelo nome/celular e marca **Presente**
5. Use a coluna `qtd_meias` / total do painel para saber quantas meias levar/preparar

## CORS / Apps Script

O frontend envia POST como `text/plain` de propósito (evita preflight chato com Apps Script).  
Se mudar a implantação, use a URL **nova** da versão ativa.

## Segurança (nível festa, não banco)

- A senha admin é simples (Script Properties). Não compartilhe `admin.html` + senha.
- Qualquer um com o link do convite pode confirmar presença (esperado).
- A chave é o celular: se alguém errar o número, cria outro cadastro — no admin você corrige/exclui.

## Personalização rápida

- Textos/data/local: `config.js`
- Visual: `styles.css`
- Arte do convite: `JUMP.jpeg`

## Estrutura

```
aniversarioArtur7Anos/
  index.html          ← convite + RSVP (mobile)
  admin.html          ← pré-cadastro e presença
  config.js
  styles.css
  JUMP.jpeg
  js/
    api.js
    app.js
    admin.js
  apps-script/
    Code.gs           ← colar no Google Apps Script
  README.md
```
