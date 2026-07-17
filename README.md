# Pipocas Carolina

Site da marca com vitrine, cardápio, carrinho, cadastro de clientes, pedidos online e painel administrativo.

## Desenvolvimento local

```bash
npm install
cp .env.example .env
npm run dev
```

- Site: http://localhost:5173  
- API: http://localhost:3001  
- Admin: http://localhost:5173/#admin  

Para o painel funcionar localmente, defina no `.env` (ou no ambiente do terminal):

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`

Exemplo rápido:

```bash
export ADMIN_EMAIL=admin@exemplo.com
export ADMIN_PASSWORD=senha-forte
export ADMIN_SESSION_SECRET=segredo-longo-aleatorio
npm run dev
```

## Produção local

```bash
npm run build
npm start
```

## Deploy na Vercel

1. Acesse [vercel.com/new](https://vercel.com/new)
2. Importe o repositório `ccarolsevero/PipocasCarolina`
3. Em **Settings → Environment Variables**, adicione:
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
   - `ADMIN_SESSION_SECRET`
4. Clique em **Deploy**
5. Acesse `https://seu-dominio.vercel.app/#admin`

### Persistência de clientes e pedidos (recomendado)

No painel da Vercel, adicione o storage **Upstash Redis**:

1. Project → **Storage** → **Create** → **Upstash Redis**
2. Conecte ao projeto (as variáveis `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` são criadas automaticamente)
3. Faça um novo deploy

Sem o Redis, o site sobe normalmente, mas os dados podem não persistir entre requisições na Vercel.
