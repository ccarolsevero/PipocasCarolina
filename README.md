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
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`

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
   - `SUPABASE_URL` (a integração também pode fornecer `NEXT_PUBLIC_SUPABASE_URL`)
   - `SUPABASE_SECRET_KEY`
4. Clique em **Deploy**
5. Acesse `https://seu-dominio.vercel.app/#admin`

### Banco Supabase

O Supabase armazena clientes, produtos, estoque, pedidos, movimentações e despesas.

```bash
npm run db:schema
npm run db:seed
```

O schema fica em `supabase/schema.sql`. A chave secreta do Supabase deve existir somente no backend e nas variáveis protegidas da Vercel.
