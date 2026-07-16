import app from './app.js'

const isProd = process.env.NODE_ENV === 'production'
const PORT = Number(process.env.PORT) || (isProd ? 8080 : 3001)

app.listen(PORT, () => {
  console.log(`Pipocas Carolina (${isProd ? 'produção' : 'dev'}) em http://localhost:${PORT}`)
})
