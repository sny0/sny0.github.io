const sendOrder = ['A0', 'B0', 'A1', 'B1'];

export function snapshot(lost, step) {
  const arrivalSteps = sendOrder.map((chunk, index) => (
    chunk === lost ? sendOrder.length + 1 : index + 1
  ));
  const arrived = sendOrder.filter((_, index) => arrivalSteps[index] <= step);

  const firstGap = sendOrder.findIndex(chunk => !arrived.includes(chunk));
  const tcp = firstGap === -1 ? sendOrder.slice() : sendOrder.slice(0, firstGap);

  const quic = sendOrder.filter((chunk, index) => {
    const streamPrefix = sendOrder.slice(0, index + 1)
      .filter(previous => previous[0] === chunk[0]);
    return streamPrefix.every(previous => arrived.includes(previous));
  });

  return { arrived, tcp, quic, end: Math.max(...arrivalSteps) };
}

function describeArrival(chunk, index, state, lost, step) {
  if (state.arrived.includes(chunk)) {
    return chunk === lost ? ['arrived', '欠けていたデータが到着'] : ['arrived', '到着済み'];
  }
  if (chunk === lost && step >= index + 1) return ['missing', '欠落'];
  return ['pending', '到着前'];
}

function describeDelivery(chunk, delivered, arrival) {
  if (delivered.includes(chunk)) return ['delivered', '配送済み'];
  if (arrival[0] === 'arrived') return ['waiting', '到着済み・待機'];
  return arrival;
}

function updateLane(lane, descriptions) {
  const items = descriptions.map(([status, label], index) => {
    const item = document.createElement('li');
    const name = document.createElement('strong');
    const detail = document.createElement('span');
    item.dataset.state = status;
    name.textContent = sendOrder[index];
    detail.textContent = label;
    item.append(name, detail);
    return item;
  });
  lane.replaceChildren(...items);
}

function initialize() {
  const lostInput = document.querySelector('#lost');
  const advance = document.querySelector('#advance');
  const finish = document.querySelector('#finish');
  const reset = document.querySelector('#reset');
  const position = document.querySelector('#position');
  const summary = document.querySelector('#summary');
  const arrivals = document.querySelector('#arrivals');
  const tcp = document.querySelector('#tcp');
  const quic = document.querySelector('#quic');
  let step = sendOrder.length;

  function render() {
    const lost = lostInput.value;
    const state = snapshot(lost, step);
    const arrivalDescriptions = sendOrder.map((chunk, index) => (
      describeArrival(chunk, index, state, lost, step)
    ));
    updateLane(arrivals, arrivalDescriptions);
    updateLane(tcp, sendOrder.map((chunk, index) => describeDelivery(chunk, state.tcp, arrivalDescriptions[index])));
    updateLane(quic, sendOrder.map((chunk, index) => describeDelivery(chunk, state.quic, arrivalDescriptions[index])));

    const event = step === 0 ? '到着前' : step > sendOrder.length
      ? `${lost} のデータが別の送信で到着`
      : `${sendOrder[step - 1]} ${sendOrder[step - 1] === lost ? 'を運ぶパケットが欠落' : 'が到着'}`;
    position.textContent = `${step} / ${state.end} 段目 · ${event}`;
    const format = chunks => chunks.length ? chunks.join('、') : 'なし';
    summary.textContent = `配送済みのデータ。TCPは ${format(state.tcp)}。QUICは ${format(state.quic)}。`;
  }

  lostInput.addEventListener('change', () => {
    step = Math.min(step, snapshot(lostInput.value, step).end);
    render();
  });
  advance.addEventListener('click', () => {
    step = Math.min(step + 1, snapshot(lostInput.value, step).end);
    render();
  });
  finish.addEventListener('click', () => {
    step = snapshot(lostInput.value, step).end;
    render();
  });
  reset.addEventListener('click', () => {
    step = 0;
    render();
  });
  render();
}

if (typeof document !== 'undefined') initialize();
