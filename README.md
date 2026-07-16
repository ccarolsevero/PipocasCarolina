# Pipocas Carolina

Site da marca com vitrine, cardápio, carrinho, cadastro de clientes e pedidos online.

## Desenvolvimento local

```bash
npm install
npm run dev
```

- Site: http://localhost:5173  
- API: http://localhost:3001  

## Produção local

```bash
npm run build
npm start
```

## Deploy na Vercel

1. Acesse [vercel.com/new](https://vercel.com/new)
2. Importe o repositório `ccarolsevero/PipocasCarolina`
3. Clique em **Deploy**

### Persistência de clientes e pedidos (recomendado)

No painel da Vercel, adicione o storage **Upstash Redis**:

1. Project → **Storage** → **Create** → **Upstash Redis**
2. Conecte ao projeto (as variáveis `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` são criadas automaticamente)
3. Faça um novo deploy

Sem o Redis, o site sobe normalmente, mas os dados podem não persistir entre requisições na Vercel.
