# Documento de Rastreabilidade & Validação de Física (WT-SIM)

Este documento registra por etapas consolidadas todas as *TAGs de rastreabilidade* implementadas na Física e Navegação do simulador. Todas essas chaves estão atualmente marcadas nos comentáros do código fonte da aplicação para facilitar buscas, depurações e manutenção (utilize um `Ctrl` + `Shift` + `F` no seu editor pesquisando as chaves `[TAG:` listadas abaixo).

---

## 1. Mapeamento Direcional Físico 🔄
> **Objetivo:** Igualar a Rotação matemática (Radianos Físicos 2D) com os Vectores de Euler da engine 3D.

**`[TAG: PIVOT-VISUAL-SYNC]`**
*   **Problema Histórico:** O The "Efeito Sabonete Invertido" nos Reboques e falha visual no Ponto Pivot. A física aplicava as rotações empurrando a popa de forma coesa, mas a engine 3D as desenhava ao contrário. 
*   **Ação:** Inversão algébrica dos atributos de rotação visual para obedecerem à conversão negativa (`-heading`). 
*   **Ficheiros Intervencionados:**
    *   `src/js/physics/tugKinetics.js` (Nas funções de translação de Rebocadores e do Navio Mercante)
    *   `src/js/main.js` (Na inicialização do cais `setupDockedScenario`)
    *   `src/js/fleet/tugData.js` (No Spawn cardinal `heading: -Math.PI / 2` inicial da frota)

---

## 2. Inserção Escalar - Estabilizador Hidrodinâmico Frontal 🦈
> **Objetivo:** Suprimir o deslize lateral perpétuo do casco e criar Atrito Direcional ao arrasto.

**`[TAG: ASD-SKEG-PHYSICS]`**
*   **Problema Histórico:** *"O rebocador não se mantendo na rota"*. Falta de estabilidade direcional instintiva ao rodar / transladar com rebocadores manobráveis tipo ASD.
*   **Ação:** Criação de um pino vetorial colateral de resistência (Skeg - Quilha/Barbatana) posicionado a `12` metros à avante do eixo centroidal da embarcação. Ele drena instantaneamente deslizamentos laterais paralelos da proa (`sway` e `yaw`), freando como trilhos.
*   **Ficheiros Intervencionados:**
    *   `src/js/physics/tugKinetics.js` (Na malha de integração `vLocalZ` do rebocador)
    *   `src/js/state/globals.js` (Na injeção da variável paramétrica HUD `tugSkegReact`)
    *   `index.html` e `main.js` (No Slider da DevTools)

---

## 3. Identidade de Controle de Azimutais (Convenção V/Fluxo) 🎯
> **Objetivo:** Convencionar as respostas Visuais da UI ao olhar marítimo instruído.

**`[TAG: ASD-JET-VISUAL]`**
*   **Problema Histórico:** Definição imprecisa quanto ao sinal de resposta dos propulsores Schottel e a identificação correta pelas setas.
*   **Ação:** Definição da Identidade Visual: Seta 3D ilustra a direção que o fluxo de água está tomando ("A Seta é o Jato"). Foi re-assinalado os co-senos visuais das setas para o formato geométrico negativo puro em relação ao ponto de manobrabilidade Thrust.
*   **Ficheiros Intervencionados:**
    *   `src/js/physics/tugKinetics.js` (Matrizes trigonométricas da instância `ArrowHelper`)

---

## 4. O Amortecimento Esmagador em Curva Cega (Inércia Mercante) ⚓
> **Objetivo:** Subjulgar a translação infinita limitando as inércias colossais por fricção lateral de casco expandido (225m).

**`[TAG: PNX-ANGULAR-DRAG]`**
*   **Problema Histórico:** Navio continuava a rodar freneticamente após o finalização da operação ou interrupção elástica, sem o esgotamento natural que uma massa de milhares de Toneladas deveria ter na água parada.
*   **Ação:** Elevação maciça aos parâmetros *Quadratics e Lineares de Drag Hídrico* com base empírica e modelamento inercial `(T = [K * d * L^4] * ω²)`. O arrasto providenciou a frenagem real-time de massas monumentais como de 275 Milhões Kg.m².
*   **Ficheiros Intervencionados:**
    *   `src/js/physics/tugKinetics.js` (Constantes `angularDrag` ativas na variável `shipTorque`)

---

## 5. Acoplamento Motor Múltiplo Ativo (Física de Push ao Casco) 💥
> **Objetivo:** Validação mecânica entre as Defensas do Rebocador operando fisicamente a Popa/Lateral e o deslocamento de Força bruta no Navio.

**`[TAG: TUG-PUSH-HULL]`**
*   **Problema Histórico:** O código de colisões interagia como 'paredes invisíveis', onde apenas o rebocador recuava elasticamente, sem que transferisse tonelagens de momento motor passivo pro gigante (Impossibilitava push dockings).
*   **Ação:** Inserção do modelo de Força de Penalty Progressiva. O tempo (`dt`) foi reencaminhado às colisões. A fricção lateral maciça entre cascos projeta Força/Empuxo (Fender Muzzle Stiffness) impelindo dinamicamente o centro do Panamax e o guiando à marra contra os blocos fluídos.
*   **Ficheiros Intervencionados:**
    *   `src/js/physics/collision.js` (Bloco de repulsão local SAT `AABB vs Circle`)
    *   `src/js/physics/tugKinetics.js` (Repasse nativo local da sub-rotina)

---

**Gerado Automaticamente em:** Março de 2026.
*Consulte o diário e commits anexados para visualização pontual dos trechos.*
