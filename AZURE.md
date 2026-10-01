# Executando o Anato360 na Azure

O caminho mais direto para a arquitetura atual e usar uma VM Linux na Azure e
executar nela o mesmo `compose.yaml` usado localmente. O Compose inicia a
interface e os servicos separados para banco, API e processamento assíncrono:

- `frontend`: React/Nginx;
- `api`: Django/Gunicorn;
- `db`: MySQL 8.4;
- `redis` e `worker`: fila e processamento em segundo plano;
- `image-processor`: classificacao anatômica, OCR e tratamento das imagens;
- `ollama`: servidor dos modelos de IA;
- `ollama-models`: baixa `nomic-embed-text` e `llama3.1` no primeiro deploy.

Essa opcao tambem preserva o MySQL, os uploads e os modelos nos volumes Docker.
Ela e adequada para demonstracao, homologacao e uma primeira publicacao. Para
alta disponibilidade, consulte [Evolucao para producao](#evolucao-para-producao).

## 1. Pre-requisitos

- uma assinatura da Azure;
- [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli) instalada,
  ou o [Azure Cloud Shell](https://shell.azure.com/);
- a branch que contem `Dockerfile` e `compose.yaml` publicada no GitHub;
- uma chave SSH. O comando abaixo cria uma se ainda nao existir.

O exemplo usa uma `Standard_D4s_v5`, com 4 vCPUs e 16 GiB de RAM. E um ponto de
partida para executar o modelo `llama3.1` em CPU, mas a geracao pode ser lenta.
Confirme disponibilidade e custo para sua regiao antes de criar a VM.

## 2. Criar a VM

Execute os comandos abaixo no PowerShell local. O sufixo aleatorio torna o nome
DNS unico na regiao.

```powershell
az login

$ResourceGroup = "rg-anato360"
$Location = "brazilsouth"
$VmName = "vm-anato360"
$AdminUser = "azureuser"
$DnsLabel = "anato360-$(Get-Random -Minimum 100000 -Maximum 999999)"

az group create `
  --name $ResourceGroup `
  --location $Location

az vm create `
  --resource-group $ResourceGroup `
  --name $VmName `
  --location $Location `
  --image Ubuntu2204 `
  --size Standard_D4s_v5 `
  --admin-username $AdminUser `
  --generate-ssh-keys `
  --public-ip-sku Standard `
  --public-ip-address-dns-name $DnsLabel `
  --os-disk-size-gb 128 `
  --storage-sku Premium_LRS

az vm open-port `
  --resource-group $ResourceGroup `
  --name $VmName `
  --port 80 `
  --priority 1001

$PublicIp = az vm show `
  --show-details `
  --resource-group $ResourceGroup `
  --name $VmName `
  --query publicIps `
  --output tsv

$Fqdn = az vm show `
  --show-details `
  --resource-group $ResourceGroup `
  --name $VmName `
  --query fqdns `
  --output tsv

Write-Host "IP: $PublicIp"
Write-Host "Endereco: http://$Fqdn"
ssh "$AdminUser@$PublicIp"
```

O `az vm create` ja cria a regra de SSH. Em um ambiente real, limite a origem da
porta 22 ao IP da equipe no Network Security Group (NSG).

Se `Standard_D4s_v5` nao estiver disponivel ou sua assinatura nao tiver quota,
liste os tamanhos da regiao e escolha uma VM com pelo menos 16 GiB de RAM:

```powershell
az vm list-sizes --location $Location --output table
```

## 3. Instalar Docker na VM

Depois de entrar por SSH, execute os comandos seguintes dentro da VM (Bash).
Eles usam o repositorio oficial do Docker para Ubuntu.

```bash
sudo apt update
sudo apt install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

sudo tee /etc/apt/sources.list.d/docker.sources >/dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker "$USER"
exit
```

Entre novamente para que a permissao do grupo `docker` seja aplicada:

```powershell
ssh "$AdminUser@$PublicIp"
```

Confirme a instalacao:

```bash
docker --version
docker compose version
```

## 4. Baixar e configurar o projeto

Dentro da VM, clone a branch que possui a automacao Docker. Neste repositorio,
ela esta atualmente em `feat/docker_automation`. Depois do merge, troque esse
nome por `main`.

```bash
git clone --branch feat/docker_automation --single-branch \
  https://github.com/ODiogorocha/PSII-Anato360.git anato360
cd anato360
cp .env.azure.example .env
nano .env
```

No `.env`, substitua os valores entre `<...>`. Use o FQDN mostrado na etapa 2
em `DJANGO_ALLOWED_HOSTS`. Gere a chave secreta com:

```bash
openssl rand -hex 32
```

O arquivo final deve ficar semelhante a:

```dotenv
APP_PORT=80
DJANGO_SECRET_KEY=cole-a-chave-gerada-aqui
DJANGO_ALLOWED_HOSTS=anato360-123456.brazilsouth.cloudapp.azure.com
DJANGO_DEBUG=false
MYSQL_DATABASE=anato360
MYSQL_USER=anato360
MYSQL_PASSWORD=gere-uma-senha-forte
MYSQL_ROOT_PASSWORD=gere-outra-senha-forte
DJANGO_SUPERUSER_USERNAME=admin
DJANGO_SUPERUSER_EMAIL=admin@anato360.local
DJANGO_SUPERUSER_PASSWORD=gere-uma-senha-forte-para-o-admin
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
OLLAMA_LLM_MODEL=llama3.1
```

Nao envie o arquivo `.env` ao Git. Ele ja esta coberto pelo `.gitignore`.

## 5. Subir os containers

```bash
docker compose up --build -d
docker compose ps
docker compose logs -f frontend api worker image-processor db ollama ollama-models
```

No primeiro deploy, `ollama-models` baixa os dois modelos e pode levar varios
minutos. Ao terminar com codigo `0`, esse container fica como `Exited (0)`; isso
e esperado. Use `Ctrl+C` para sair dos logs sem parar os containers.

Teste de dentro da VM:

```bash
curl --fail --head http://localhost/
```

Depois, abra no navegador o endereco exibido na etapa 2:

```text
http://<seu-fqdn>.brazilsouth.cloudapp.azure.com
```

Esse acesso HTTP serve apenas para conferir a VM. Antes de permitir cadastros ou
senhas reais, aponte um domínio seu para a VM e coloque um proxy TLS com
certificado válido na frente do Compose. Configure `DJANGO_ALLOWED_HOSTS` com o
domínio sem protocolo e `CSRF_TRUSTED_ORIGINS` com `https://seu-dominio`; depois
ative `SECURE_SSL_REDIRECT`, `SESSION_COOKIE_SECURE` e `CSRF_COOKIE_SECURE` no
`.env`. O proxy deve encaminhar `X-Forwarded-Proto: https`. A porta da API já
fica restrita a `127.0.0.1` no host.

## 6. Acessar o administrador do Django

O administrador configurado no `.env` e criado automaticamente na primeira
inicializacao. A senha atual nao e substituida em reinicializacoes.

O painel ficara em `http://<seu-fqdn>/admin/`.

## Atualizar uma nova versao

Se a instalacao ativa ainda usa o Compose antigo (`app` com SQLite), exporte os
dados antes de atualizar: esta versao usa MySQL. Execute os passos a seguir no
mesmo diretÃ³rio e com o mesmo nome de projeto Compose da instalaÃ§Ã£o ativa, para
reutilizar o volume `media-data`.

```bash
mkdir -p ~/anato360-backup
chmod 700 ~/anato360-backup
docker compose exec -T app python manage.py dumpdata \
  --natural-foreign --natural-primary \
  --exclude=contenttypes --exclude=auth.permission --exclude=sessions \
  --indent 2 > ~/anato360-backup/dados.json
chmod 600 ~/anato360-backup/dados.json
docker compose stop app
docker compose cp app:/app/data/db.sqlite3 ~/anato360-backup/db.sqlite3
docker compose down
```

Depois atualize o cÃ³digo e acrescente ao `.env` valores fortes para
`MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD` e
`DJANGO_SUPERUSER_PASSWORD`. Garanta que `DJANGO_SECRET_KEY` exista e mantenha a
chave atual se ela jÃ¡ estiver configurada. Inicie apenas o banco e espere
`docker compose ps db` mostrar `healthy`:

```bash
git pull --ff-only origin feat/docker_automation
docker compose up -d db
docker compose ps db
```

Com o banco saudÃ¡vel, crie o schema e carregue o fixture uma Ãºnica vez. Esses
comandos chamam Django diretamente para nÃ£o criar o administrador inicial antes
de importar as contas antigas:

```bash
docker compose run --build --rm --no-deps --entrypoint python api manage.py migrate --noinput
docker compose run --build --rm --no-deps \
  -v "$HOME/anato360-backup/dados.json:/tmp/dados.json:ro" \
  --entrypoint python api manage.py loaddata /tmp/dados.json
docker compose up --build -d
docker compose ps
```

NÃ£o remova os volumes. O fixture restaura usuÃ¡rios e registros; os arquivos
continuam no volume `media-data`. Se `loaddata` falhar, pare antes de liberar a
versÃ£o nova aos usuÃ¡rios e mantenha os dois backups.

Para uma instalaÃ§Ã£o que jÃ¡ estÃ¡ usando esta versÃ£o do Compose, atualize com:

```bash
cd ~/anato360
git pull --ff-only
docker compose up --build -d
docker compose ps
```

As migracoes sao aplicadas automaticamente pelo `docker/entrypoint.sh`. Nao use
`docker compose down -v`, pois `-v` remove os volumes com banco, uploads e
modelos.

## Operacao e custos

Ver logs e uso de recursos:

```bash
docker compose logs -f api worker image-processor ollama
docker stats
docker system df
```

Parar e desalocar a VM quando ela nao estiver sendo usada interrompe a cobranca
de computacao, mas discos e outros recursos associados ainda podem ser cobrados:

```powershell
az vm deallocate --resource-group $ResourceGroup --name $VmName
az vm start --resource-group $ResourceGroup --name $VmName
```

Excluir o grupo de recursos apaga a VM e seus dados. So execute quando tiver
certeza de que nao precisa mais deles:

```powershell
az group delete --name $ResourceGroup
```

## Evolucao para producao

Para uso real, configure primeiro HTTPS com domínio e certificado válido; o
Compose disponibiliza as opções Django para redirecionamento HTTPS e cookies
seguros, mas não emite o certificado. Para uma operação com dados importantes,
considere também:

1. configure Azure Backup ou snapshots para o disco da VM;
2. migre o MySQL local para Azure Database for MySQL;
3. migre uploads para Azure Blob Storage;
4. guarde segredos no Azure Key Vault;
5. para respostas mais rapidas do Ollama, use uma VM da familia N com GPU,
   instale o driver NVIDIA e o NVIDIA Container Toolkit e conceda a GPU ao
   containers `ollama` e `image-processor` (o processador tambem exige CUDA e
   dependencias compatíveis com a GPU).

Uma VM como `Standard_NC4as_T4_v3` oferece uma NVIDIA T4 de 16 GB, mas a
disponibilidade, a quota e o preco dependem da regiao e da assinatura. Apenas
trocar o tamanho da VM nao basta: o runtime NVIDIA e a permissao de GPU no
Compose tambem sao necessarios.

## Referencias oficiais

- [Criar uma VM Linux com Azure CLI](https://learn.microsoft.com/azure/virtual-machines/linux/quick-create-cli)
- [Comandos de gerenciamento de VMs](https://learn.microsoft.com/azure/virtual-machines/linux/cli-manage)
- [Instalar Docker Engine no Ubuntu](https://docs.docker.com/engine/install/ubuntu/)
- [VMs Azure NCasT4_v3](https://learn.microsoft.com/azure/virtual-machines/sizes/gpu-accelerated/ncast4v3-series)
- [Extensao de driver NVIDIA para VMs Linux](https://learn.microsoft.com/azure/virtual-machines/extensions/hpccompute-gpu-linux)
