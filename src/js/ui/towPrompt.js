export function getTowTargetKey(tugId) {
  return tugId === 'stern' ? 'popa' : 'proa';
}

export function getTowBollardPrompt(tugId) {
  return tugId === 'stern'
    ? 'Selecione o cabeço de popa do navio.'
    : 'Selecione o cabeço de proa do navio.';
}

export function isTowBollardForTug(userData, tugId) {
  return userData.type === 'bollard'
    && userData.isDynamic === true
    && userData.towTarget === getTowTargetKey(tugId);
}
