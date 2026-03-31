# WT-SIM Modelagem Acoplada: Rebocador, Cabo e Navio 

A presente documentação descreve as bases matemáticas e cinemáticas fundamentais utilizadas pelo motor do simulador WT-SIM para replicar as manobras de reboque portuário (SD, ASD, Tractors) com cabos de alto desempenho (HMPE ou Dyneema).
Esta documentação integra conceitos apresentados nos estudos hidrodinâmicos (*Maneuvering Instructions* e *Tug interaction papers* presentes na biblioteca).

---

## 1. O Princípio Dinâmico Acoplado (Trilateral)
No mundo real, quando um rebocador interage por cabo com um porta-contentores (Panamax), as leis de inércia não atuam de forma isolada. Há um sistema acoplado trilateral:
**Motor Propulsor (Força Ativa) $\rightleftarrows$ Corda Sintética (Mola de Transferência) $\rightleftarrows$ Casco do Navio (Carga Inercial + Drag Viscoso).**

Se a força contínua do rebocador for superior ao limite de rotura da mola, a mola parte (snap-back). Se a inércia do navio for assombrosa, o rebocador será "puxado" para trás e ficará refém das águas, sofrendo o temido efeito de "Girder" ou capotamento (Girting).

---

## 2. A Física da Corda (O Modelo Mola-Amortecedor Viscoso)

Para evitar que o cabo no simulador seja um "fio invisível" perfeitamente e instantaneamente rígido (o que faria o simulador explodir em *overflow* com a Lei de Inércia devido a saltos matemáticos), aplicamos o **Modelo Visco-elástico de Hooke**:

$$T_{cabo} = \max\Big(0, \ \ k \cdot (D - L_0) + B \cdot v_{stretch}\Big)$$

Onde:
*   $\mathbf{T_{cabo}}$: Tensão momentânea em Toneladas-Força (TF). Zero se os cascos estiverem demasiado perto. Limitado a um teto superior de rutura (ex: $200T_{\text{max}}$).
*   **$D$**: Distância Euclideana 2D absoluta entre o `Winch` (Guincho no Rebocador) e o `Bollard` (Cabeço no Navio).
*   **$L_0$**: Comprimento intrínseco solto. Regido pelo Guincho do Rebocador com comandos de *Colher (Heave)* e *Pagar (Pay)*.
*   **$k$**: A Constante Elástica (Stiffness) do material em $t/m$. Um cabo de aço ou HMPE é extremamente rígido ($k \ge 500$), ao passo que cabos de Nylon requerem uma curva elástica alongada ($k \approx 50$).
*   **$B$**: Coeficiente de Amortecimento (`damping`). Previne que a tração funcione como um ioiô que catapultaria os dois navios perpetuamente. A energia dispersa-se na forma de calor na estrutura da corda.
*   **$v_{stretch}$**: Velocidade escalar relativa entre a ponta A e B (a que velocidade as âncoras se afastam ou aproximam na direção longitudinal $D$).

---

## 3. Vetorização das Forças no Rebocador

### Matriz de Conversão Referencial
Um propulsor Azimutal (Z-Drive ou Schottel) gera uma força puramente empírica ditada pelo ângulo da base (`angle` = Eixo X local ou frente da ponte). No nosso simulador:
* $F_{x\text{ (local)}}$: Força na Proa/Popa
* $F_{z\text{ (local)}}$: Força na lateral de Bombordo/Boreste

Como o Rebocador encontra-se inclinado no Mundo (Heading/Guiinada $H$), convertemos a intenção local dos motores num vetor puramente Global ou Oceânico através duma Matriz de Rotação Trigonométrica:

$$ F_{X\text{(Global)}} = F_{x\text{(Local)}}\cos(H) - F_{z\text{(Local)}}\sin(H) $$
$$ F_{Z\text{(Global)}} = F_{x\text{(Local)}}\sin(H) + F_{z\text{(Local)}}\cos(H) $$

### O Fator Decisivo: Bollard Pull Estrito
Na versão alfa, as grandezas de Thrust e Força de Mola falhavam numa proporção catastrófica de 1:300 ($60,000T$ thrust para molas de $200T$). Historicamente, um rebocador ASD padrão entrega $\sim 80T_{\text{Bollard Pull}}$. Ao alinhar estritamente os Propulsores para gerarem um teto combinado de $\approx 160$ Toneladas Reais, garantimos que **um Cabo HMPE não rompe perpetuamente, mas pelo contrário, trava o rebocador esticando-se de forma retilínea e letal** em perfeito estílo estocástico.

A Força global sobre a massa ($400T$) do rebocador é por isso regida por:
$$ F_{Tug\_Total} = F_{\text{Motor}} - T_{cabo} \cdot \vec{\text{Diretriz}}$$
> *(3ª Lei de Newton: a tensão puxa o rebocador violentamente para o rasto do Navio Mãe).*

---

## 4. Cinemática do Gigante: O Momento e o Braço de Alavanca

Um Porta-Contentores de $225m$ com $\textbf{65.000 Toneladas}$ possui uma inércia polar abismal face ao seu centro de flutuação vertical ($Y$). Calcular fisicamente uma "guinada" implica aplicar a Força do Cabo $F$ na extremidade a uma distância considerável do centro geométrico. Chamamos a essa distância de $R_x$ (Raio longitudinal) e $R_z$ (Raio transversal).

**O Torque Polar do Rebocador 2D:**
$$ \tau_{\text{Navio}} = R_x \cdot F^{\text{Cabo}}_z - R_z \cdot F^{\text{Cabo}}_x $$

### O Teste Físico Primário
1. Se atar o rebocador no **Lançante da Popa** ($R_x = -110m$), e puxar a Popa a direito para Estibordo ($F_z = \mathbf{positiva}$).
2. $\tau = (-110) \cdot (+ T) - (0) \cdot (0) = \mathbf{-110 \, T_{\text{Torque}}}$ (Torque global Negativo).
3. Através da Mão Direita sobre Y (+ Cima), o Torque negativo força a **rotação Horário (Clockwise)** na bússola estática.
4. **Física Implacável:** Com uma rotação no sentido horário, a zona de Popa desloca-se a BE, forçando mecanicamente que a PROA do bloco esmague-se rumo a BB (Direção do Cais).

### Drag Hidrodinâmico Orgânico 
Inércia perpétua sem Drag no oceano é impossível, transformando o "porto" numa pista de Gelo. A velocidade linear (Surge) perde em média 1% a cada segundo, permitindo navegação solta. Contudo, o esmagamento Transversal (Sway) de um casco de parede Panamax perde 5% por 1s (`swayDrag: 0.95`). Logo o Navio só "derrapa na horizontal" se a Força continua a ser incutida. O Torque perde apenas 2% (`angularDrag: 0.98`), honrando a tradição de que um navio rotativamente demore largos minutos a acalmar sem Kick à Rê contrário.
