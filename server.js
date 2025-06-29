const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

// Tipos MIME para diferentes extensões de arquivo
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.tsx': 'text/javascript',
  '.ts': 'text/javascript',
};

// Criar servidor HTTP
const server = http.createServer((req, res) => {
  console.log(`Requisição: ${req.url}`);

  // Normalize o caminho da URL para evitar problemas de segurança
  let filePath = '.' + req.url;
  if (filePath === './') {
    filePath = './index.html';
  }

  // Obtenha a extensão do arquivo
  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  // Leia o arquivo
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        // Arquivo não encontrado
        console.log(`Arquivo não encontrado: ${filePath}`);
        
        // Tente servir index.html para rotas inexistentes
        fs.readFile('./index.html', (err, content) => {
          if (err) {
            res.writeHead(404);
            res.end('Arquivo não encontrado');
            return;
          }
          
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(content, 'utf-8');
        });
      } else {
        // Outro erro de servidor
        res.writeHead(500);
        res.end(`Erro do servidor: ${error.code}`);
      }
    } else {
      // Sucesso - arquivo encontrado
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

// Iniciar servidor
server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  console.log(`Para parar o servidor, pressione Ctrl+C`);
});
