# WT-SIM: Manual de Operação do Piloto

Bem-vindo ao **WT-SIM**, o simulador de rebocadores ASD (Azimuth Stern Drive) operando em ambiente portuário dinâmico. Este manual serve como guia de voo para todos os Oficiais de Náutica e estudantes que desejem treinar forças de arrasto acústico, reboque de escolta e dinâmica avançada de amarrações tracionadoras.

---

## 1. Interface Gráfica e Controle da Câmara

O simulador arranca exibindo uma perspetiva superior da manobra. Toda a interface funciona por sobreposição (HUD) e possui janelas de controle dedicadas.
- **Rotação de Câmara:** Clique com o lado esquerdo do rato e arraste (ou "Drag" no ecrã touch) para visualizar o navio desde qualquer ângulo 3D.
- **Zoom In / Out:** Use a roda do rato, os gestos de "Pinch" no telemóvel, ou os botões de **Lupa (+ e -)** posicionados no ecrã.
- **Painel Ambiente:** Menu retrátil à esquerda (`[ Atmosfera & Mar ]`) onde define livremente variáveis de tempo e clima: Intensidade de Corrente e do Vento, Nevoeiro, e Direções incidentes.

---

## 2. Controle dos Rebocadores (Dual ASD HMI)

A pilotagem principal foca-se nos **Dials e Sliders Diagonais**, concebidos como réplicas das consolas físicas industriais de thrusters gémeos (Twin Azipods).

### 2.1 Telegrafo e Direção
No canto inferior esquerdo tens a estação de controle correspondente à unidade marítima atualmente selecionada.
- **Roda do Azimute (Dial Circular Azul):** Ao clicares e arrastares nestes discos, indicas para onde o propulsor direciona o seu caudal de água. Relembra que isto atua como vetor de tração na popa do rebocador. Duplo-clique aqui reseta automaticamente para 0%.
- **Alavanca de RPM (Slider Horizontal):** Comanda a carga em RPM do motor (0 a 100%). Atua na Força efetiva enviada ao disco azimutal, sentindo-se imediata aceleração no ecrã e rotações do HUD associado ("BB" Bombordo, "BE" Estibordo).
- **HUD Superior das Máquinas:** Indicador digital que atesta o real RPM e Graus (ex: `BB | 100% | 045º`).

### 2.2 Twin Mode e Seleção de Frota
- **Botão (Twin Mode):** Quando bloqueado em *Turquesa*, o comando dado a um motor replique exatamente no propulsor oposto. Desliga para aplicar alavancas diferenciais (Exibição mista: um para vante, outro a dar arre).
- **Botão Rebocador Ativo (Popa Vermelho / Proa Verde):** Permite, através de 1 clique, comutar integralmente o teu foco de comando de rádio. Quando saltas de rebocador, todas as alavancas sincronizam as potências retidas na respetiva unidade. 

---

## 3. Dinâmica de Cabos e Guinchos (HMPE)

Os ASDs ligam-se ao navio gigante (Panamax) via cabos elásticos HMPE avançados (cálculos Euclidiano-Mola), geridos individualmente pela Interface Negra Central `[ GUINCHO / LEME ]`.

### Operação de Travagem 
- **Verde Sólido (Freio: Travado):** O guincho está imobilizado mecanicamente sob o limite de tensão estática. O cabo vai apenas contrair-se mediante esticamento do mar.
- **Cinzento (Freio: Solto):** Rápida descompressão do cabo, estende o cabo mediante o afastamento até repousar na água (sem tensão).

### Tensão Ativa e Operação (Heave/Pay)
Na HUD superior direita encontrarás permanentemente referências a **Tensão (t)** e **Comprimento (m)** do cabo rebocador selecionado. 
- **Arriar (Pay):** Alivia a amarração e a força da Mola, aumentando o fio libertado ativamente.
- **Caçar (Heave):** Liga o motor hidráulico do tambor a puxar o cabo violentamente encurtando "Length". 
- **O Limite Amarelo/Vermelho:** Tensões > 45 Toneladas mudam as letras para a área Crítica. Demasiado reboque face a vento cruzado e o teu Navio pode causar colapso estrutural por rebentamento do cabo!

---

## 4. O Navio Panamax (Amarração Cais)

A imensa inércia em jogo recai no enorme Mercante que podes governar de forma suplementar (Painel Navio Mercante):
- **Telégrafo Leme / Motor:** O Navio contém Máquina a Vante (`Ahead`) e Arre (`Astern`). O leme pode guinar 35 graus BE/BB, efetivo apenas se existir fluxo sobre a pá (Engine ligado ou Current).

### A Inovação Dinâmica - Reposicionamento de Cabos (Hands-On)
Inicia automaticamente o cenário atracado em molhe fixo na esquadra perfeita por 4 cabos estabilizadores em X (2 Lançantes `Spring lines` e 2 Espringues). **A Operação Dinâmica:**
1. **Largar Cabo do Navio:** Clica fisicamente sobre um dos 4 Pinos (Cabeços Amarelos) situados no varandim Bombordo do Panamax. Irá avisá-lo `<LANÇANTE PROA> SELECIONADO!`.
2. **Re-ancorar no Cais:** Identifica algum pino preto no betão longo ao qual desejes amarrar o barco. Clica nele! Irá prender um cabo colorido instantaneamente que suportará a força.
3. **Largada para o Mar:** Se clicares apenas na superfície líquida (Azul Oceano), a espia vai "tombar ao mar" recolhendo definitivamente até a voltares a prender ao cais no navio.

---

## 5. Como o Meio Ambiente o Afeta

Não substime as configurações Metereológicas aplicadas no Slider Atmosférico.
- O **Vento Quadrático:** Utiliza densidade de Ar autêntica e reage ferozmente a ventos com rajadas. $60 Kn$ no costado é capaz de quebrar Amarrações que tu configures subdimensionadas.
- A **Corrente Oceânica:** Age contra a massa em deriva por força hidrodinâmica. Se o Navio estiver preso por 1 Lançante apenas à vante e a Corrente incidir nas costelas, o navio entrará inteiramente em Rotação tipo Compasso face ao ponto fixo e colidirá em arrasto letal! Use o "ASD Tug" pressionando as partes certas em RPM elevadas para conter essas manobras em mau tempo.
