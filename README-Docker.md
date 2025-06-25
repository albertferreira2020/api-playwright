# 🐳 Deployment com Docker e Portainer

Este guia explica como fazer o deploy do Playwright Scraper Server usando Docker e Portainer.

## 📋 Pré-requisitos

- Docker instalado no servidor
- Portainer instalado e configurado
- Acesso ao Portainer via interface web

## 🚀 Deploy no Portainer

### Método 1: Upload de Arquivos (Recomendado)

1. **Preparar os arquivos**:
   - Compacte todos os arquivos do projeto em um ZIP
   - Inclua: `Dockerfile`, `docker-compose.yml`, `package.json`, código fonte

2. **No Portainer**:
   - Acesse **Stacks** → **Add Stack**
   - Nome: `playwright-scraper`
   - Método: **Upload**
   - Faça upload do arquivo `docker-compose.yml`

3. **Configurar variáveis de ambiente** (opcional):
   ```yaml
   PORT=3000
   NODE_ENV=production
   ```

4. **Deploy**:
   - Clique em **Deploy the stack**
   - Aguarde o build e inicialização (pode levar alguns minutos)

### Método 2: Repository Git

1. **No Portainer**:
   - Acesse **Stacks** → **Add Stack**
   - Nome: `playwright-scraper`
   - Método: **Repository**
   - URL do repositório Git
   - Compose path: `docker-compose.yml`

2. **Deploy**:
   - Clique em **Deploy the stack**

## 🔧 Configuração do Stack

### Portas Expostas
- **3000**: API do Playwright Scraper

### Volumes Criados
- **screenshots**: Para armazenar capturas de tela
- **logs**: Para armazenar logs da aplicação

### Recursos Alocados
- **Memória**: 2GB (limite), 512MB (reservado)
- **CPU**: 1.0 (limite), 0.5 (reservado)
- **Shared Memory**: 2GB (necessário para Chromium)

## 📡 Testando a Aplicação

### Health Check
```bash
curl http://SEU_SERVIDOR:3000/health
```

### Exemplo de Requisição
```bash
curl -X POST http://SEU_SERVIDOR:3000/executar \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "actions": [
      {
        "type": "screenshot",
        "path": "example.png"
      }
    ]
  }'
```

## 🔍 Monitoramento

### Logs do Container
No Portainer:
1. Acesse **Containers**
2. Clique no container `playwright-scraper-server`
3. Vá para a aba **Logs**

### Métricas de Performance
- CPU e Memória podem ser monitorados na interface do Portainer
- Health check automático a cada 30 segundos

## 🛠️ Troubleshooting

### Container não inicia
- Verifique se as portas estão disponíveis
- Confirme se o Docker tem recursos suficientes
- Veja os logs para erros específicos

### Erro de memória compartilhada
- Certifique-se que `shm_size: 2gb` está configurado
- O Chromium precisa de memória compartilhada suficiente

### Problemas de permissão
- O container roda com usuário não-root para segurança
- Se necessário, ajuste permissões dos volumes

## 🔄 Atualizações

### Para atualizar o serviço:
1. No Portainer, acesse o Stack
2. Clique em **Editor**
3. Faça as alterações necessárias
4. Clique em **Update the stack**

### Para rebuild completo:
1. Pare o stack
2. Remova o stack
3. Reimplante com os novos arquivos

## 📊 Configurações Avançadas

### Proxy Reverso (Nginx/Traefik)
```yaml
# Adicionar ao docker-compose.yml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.scraper.rule=Host(\`scraper.seudominio.com\`)"
  - "traefik.http.services.scraper.loadbalancer.server.port=3000"
```

### Backup de Dados
```bash
# Backup dos volumes
docker run --rm -v playwright-scraper_screenshots:/data -v $(pwd):/backup alpine tar czf /backup/screenshots.tar.gz -C /data .
```

## 🔐 Segurança

- Container roda sem privilégios elevados
- Apenas capacidades necessárias são mantidas
- Portas internas não expostas desnecessariamente
- Use HTTPS em produção com proxy reverso

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs do container
2. Confirme configurações de rede
3. Teste conectividade entre containers
4. Verifique recursos disponíveis no servidor
