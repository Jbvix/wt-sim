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

## 6. Autenticação Orgânica do Ponto Pivot Hidrodinâmico 📍
> **Objetivo:** Recriar a barreira física que favorece reboques pela popa (navio girando facilmente via torque da popa vs rigidez na proa).

**`[TAG: PNX-PIVOT-POINT]`**
*   **Problema Histórico:** Empurrar a popa ou empurrar a proa providenciava as exatas mesmas matrizes matemáticas, invalidando a percepção real de práticos marítimos.
*   **Ação:** Descentralizada a massa de atrito da água (`hwFz_local`), aplicando este embate não no centro nulo, mas através de um multiplicador/alavanca de `+60m` avante do eixo. Agora o bico do navio esmaga a água no mar em deslocamentos transversos, rodando rapidamente para manobras de *Push/Pull* pela popa e freando violentamente arrastos de proa.
*   **Ficheiros Intervencionados:**
    *   `src/js/physics/tugKinetics.js` (Na malha de Resistência Hidrodinâmica `shipTorque`)

---

## 7. Otimização de Layout para Dispositivos Móveis (UI/UX) 📱
> **Objetivo:** Maximizar a área de visualização 3D e agrupar controles para uso ergonômico em tablets e celulares.

**`[TAG: UI-MOBILE-OPTIMIZATION]`**
*   **Problema Histórico:** Telas poluídas por ferramentas de desenvolvedor (Física e Calibração); Painéis fixos consumindo espaço central e lateral; Identificação textual de rebocadores com excesso de informação visual; Painel do guincho prejudicava o alcance dos joysticks no rodapé.
*   **Ação:**
    1. Painéis Dev ocultados integralmente.
    2. Botão de seleção de "Rebocador Ativo" integrado hierarquicamente ao Painel do Guincho.
    3. Modelagem unificada de *Drag & Drop* (`makeDraggable`) tornando painéis (Mar, Comando e Guincho) arrastáveis.
    4. Adicionado gatilho de *Collapse* (Minimizar) no Guincho (`btn-toggle-winch`), recolhendo a interface até sobrar apenas a informação vital do rebocador ativo.
    5. Padronização náutica da seleção: Alterado de "[ POPA ] - VERMELHO" para leitura técnica limpa "REBOCADOR POPA".
*   **Ficheiros Intervencionados:**
    *   `index.html` (Hierarquia DOM, Drag Handles, CSS inline Absoluto)
    *   `src/js/main.js` (Injeção PointerEvents customizada `makeDraggable`)
    *   `src/js/ui/winchPanel.js` (Listeners do Collapse Winch Content)
    *   `src/js/fleet/fleetManager.js` (Text replacement)

---

## 8. Persistência de Controle dos Rebocadores (Memória de Thrust) 💾
> **Objetivo:** Manter as configurações de manobra (potência e ângulo) ao alternar entre os rebocadores durante a operação portuária.

**`[TAG: TUG-CONTROL-PERSISTENCE]`**
*   **Problema Histórico:** O painel de controle resetava a potência e o ângulo do propulsor azimutal sempre que o usuário trocava o controle da proa para a popa, quebrando a precisão.
*   **Ação:** Implementação de cache de estados na UI para cada rebocador individualmente, restaurando perfeitamente a barra de tração e o dial de rotação anterior ao alternar o foco.
*   **Ficheiros Intervencionados:**
    *   `src/components/WinchPanel.jsx`

---

## 9. Expansão Gráfica do Terminal Portuário 🏗️
> **Objetivo:** Aumentar a fidelidade visual e a imersão do cenário (pier) de forma otimizada (draw calls) para o Three.js.

**`[TAG: PORT-GRAPHICS-EXPANSION]`**
*   **Problema Histórico:** O cais era obsoleto, muito recuado e vazio, perdendo a escala visual massiva de uma operação de contêineres reais.
*   **Ação:** Extensão do volume físico principal do pier e adição de dezenas de instâncias coloridas simulando a armazenagem empilhada em pátio. Criação de um armazém de apoio visual compondo o diorama 3D sem prejudicar FPS.
*   **Ficheiros Intervencionados:**
    *   `src/js/graphics/models.js`

---

## 10. Modernização da Interface para React + TailwindCSS ⚛️
> **Objetivo:** Migrar o velho maquinário HTML estático / Vanilla JS para Componentes reativos, limpos e responsivos.

**`[TAG: REACT-UI-MIGRATION]`**
*   **Problema Histórico:** Eventos "spaghetti" interligados entre HTML bruto e Vanilla JS complicava expansão, os painéis fixos obstruíam muito a câmera no mobile.
*   **Ação:** Desenvolvimento total do Frontend Modular React com TailwindCSS; `TopBar` condensando navio e telemetria (Vento, Velocidade), eliminando poluição visual, e `WinchPanel` abraçando Dial/Slider atualizado na extremidade inferior da tela, garantindo o visual *Wow-factor* do cenário em toda proporção do viewport.
*   **Ficheiros Intervencionados:**
    *   `src/components/TopBar.jsx`
    *   `src/components/WinchPanel.jsx`
    *   `src/js/main.js`

---

**Gerado Automaticamente em:** Abril de 2026.
*Consulte o diário e commits anexados para visualização pontual dos trechos.*
