# Treinos

App Android de uso pessoal (APK, sem Play Store) para saber **quando e o que treinar na semana**: meta semanal flexível com Pilates fixo aos sábados, fichas sugeridas e personalizadas, biblioteca de exercícios com foto opcional, peso/altura com IMC e lembretes no dia do treino.

Tudo fica no celular: sem servidor, sem conta, sem nuvem. Desinstalar o app apaga os dados.

## Stack

| Camada | Ferramenta |
|---|---|
| Interface | Vite + React (só celular) |
| Empacotamento | Capacitor 8 (pasta `android/`) |
| Dados | SQLite no celular (`@capacitor-community/sqlite`) |
| Imagens | `@capacitor/camera` + `@capacitor/filesystem` (reduzidas para 800 px, pasta interna do app) |
| Lembretes | `@capacitor/local-notifications` |
| Build | GitHub Actions gera o APK a cada push |

## Fases do plano

- [x] **1. Base** — Vite + React + Capacitor, workflow do APK, banco com as 9 tabelas criado na primeira abertura
- [x] **2. Exercícios e fichas** — 45 exercícios padrão, cadastro com foto, fichas do zero
- [x] **3. Sugestões** — modelos por nível e dias, "Usar sugestão", "Restaurar sugestão original" e fila de treinos
- [x] **4. Minha semana** — agenda dos 7 dias, Pilates fixo, botão "Feito" e progresso da meta
- [x] **5. Corpo e lembretes** — peso, altura, IMC e gráfico; lembretes do treino, da meta (quinta) e do peso; configurações

## Onde está cada coisa

- `src/db/schema.js` — tabelas (para mudar o banco: suba `SCHEMA_VERSION` e adicione um passo em `migrate`)
- `src/db/seed.js` — exercícios padrão e treinos sugeridos
- `src/db/repo.js` — todas as leituras e escritas, montagem da semana e fila
- `src/lib/planner.js` — regras puras (dias de academia, fila, sugestão, IMC), com testes em `tests/`
- `src/lib/lembretes.js` — notificações locais (canceladas e reagendadas a cada mudança)
- `src/screens/` — uma tela por arquivo

## Rodar no computador

```bash
npm install
npm run dev     # abre no navegador (usa sql.js no lugar do SQLite do celular)
npm test        # regras da semana, fila e IMC
```

Para gerar o APK localmente (precisa do Android SDK): `npm run build && npx cap sync android && cd android && ./gradlew assembleRelease`.

## Como o APK é gerado

A cada push, `.github/workflows/build.yml` roda os testes, gera a interface, sincroniza com o Android e compila. Na `main`, o APK é publicado como **Release** (`treinos-N.apk`).

### Secrets necessários (uma vez só)

Em *Settings → Secrets and variables → Actions → New repository secret*:

| Nome | Valor |
|---|---|
| `KEYSTORE_BASE64` | o arquivo `.jks` em base64 (pode ser o mesmo do Foco) |
| `KEYSTORE_PASSWORD` | senha do keystore |
| `KEY_ALIAS` | alias da chave |
| `KEY_PASSWORD` | senha da chave |

Sem esses Secrets o build ainda funciona, mas assina com uma chave de debug que muda a cada run, e o Android não deixa atualizar por cima (seria preciso desinstalar e perder os dados). **Nunca coloque o `.jks` no repositório.**

## Cuidados no Android

- No Android 13+, o app pede permissão de notificação na primeira abertura.
- Xiaomi e Samsung podem fechar apps em segundo plano: se os lembretes não chegarem, tire o app da otimização de bateria.
